# Laporan Audit Sistem ERP Sekar Maju Sejahtera

Tanggal: 2026-09-21 · Branch: `staging` · Frontend v3.0.x

Audit menyeluruh sebelum pelatihan dan trial: tampilan (UI/UX), logika frontend, koneksi frontend ke backend,
DevOps, dan pengujian (QA). Tujuannya aplikasi bersih untuk produksi: tema seragam, tanpa teks penjelasan, dan
setiap perubahan data benar-benar sampai ke database server.

## Ringkasan

| Bidang | Status |
|---|---|
| DevOps | Workflow deploy yang rusak diperbaiki. Deploy staging dan produksi kembali valid |
| Koneksi FE → BE | Semua perubahan dari layar dikirim ke server lewat antrean. Data "sample" yang dulu hanya tersimpan di peramban sudah dihapus. FE tidak lagi mengirim data karangan |
| Logika | 11 bug diperbaiki, antara lain selisih jumlah bayar Kasir dan Laporan Pembelian serta hitungan ganda Top 5 Harga Beli |
| UI/UX | Teks penjelasan dibuang dari seluruh menu. Judul, warna, tombol, dan pesan diseragamkan |
| QA | Pemeriksaan tipe bersih, 211 tes lulus (1 todo), build produksi sukses. Alur CRUD diuji di peramban |
| Masih terbuka | 9 endpoint atau aturan backend dan 2 keputusan pemilik (bagian 7) |

Repositori backend (Laravel) tidak ada di mesin audit, jadi sisi backend diaudit lewat kontrak API yang dipanggil
frontend. Apa saja yang harus disediakan backend tercantum di bagian 7 dan `DOKUMENTASI_DATABASE.md` bagian 5.3.

---

## 1. DevOps

| Temuan | Dampak | Perbaikan |
|---|---|---|
| `.github/workflows/deploy.yml` ter-commit dengan penanda konflik merge (`<<<<<<< Updated upstream`, commit `ab4535b`) | YAML tidak valid, sehingga **deploy staging dan produksi tidak berjalan** | Workflow disusun ulang: job staging (branch `staging`) dan produksi (branch `main`), masing-masing `npm ci` → `npm test` → `npm run build` → kirim `dist` → reload Nginx. YAML divalidasi |
| Build mengisi `VITE_API_URL`, variabel yang tidak pernah dibaca aplikasi (yang dibaca `VITE_API_BASE_URL`) | Menyesatkan: tampak seperti alamat API bisa diatur dari secret | Dihapus. Aplikasi memakai `{origin}/api/v1`. Cara mengatur alamat API lain didokumentasikan di README |
| Skrip VPS masih menjalankan `pkill vite/tsc` dan `git pull` padahal build sudah di GitHub Actions | Langkah tanpa guna di server | Dihapus. VPS hanya mengekstrak `dist` (`set -e`), berkas lama dibiarkan agar tab versi lama tetap berjalan |
| `ci.yml` juga berjalan pada push ke `staging` | Tes dan build dijalankan dua kali per push staging | `ci.yml` mengecualikan `main` dan `staging` (sudah diperiksa `deploy.yml`) |

## 2. Koneksi frontend ke backend

| Temuan | Dampak | Perbaikan |
|---|---|---|
| Daftar "pengiriman sample per bal" (`sampleList`) hanya tersimpan di peramban dan tidak pernah terisi dari alur mana pun | Kartu "Approval Rate Lab QC", tab Pengiriman Sample, dan ekspor QC selalu 0 atau berisi data basi yang tidak ada di server | Daftar, handler, modal, dan kunci penyimpanannya dihapus. Angka sample diturunkan dari batch sample di server (`barisSampleDariBatch`, hanya batch final) |
| Kupon tanpa bal dikirim dengan **bal karangan** (`no_bal "1"`, grade `A`, Rp 100.000/kg) | Data palsu bisa masuk database | Dikirim `items: []` apa adanya. Backend sebaiknya menolak dengan 422 |
| Pemetaan jawaban server memakai angka cadangan manual (7.000/3.000/75.000/10.000), `subtotal_bersih` bisa negatif, serta nama cadangan `'Petani'`, `'Staff Gudang'`, `'Staff Lab'` | Angka tidak mengikuti tarif satu sumber dan nama karangan bisa muncul di dokumen | Memakai konstanta `config/aturanTimbang.ts`. Angka 0 dari server tetap 0, jumlah bayar tidak pernah negatif, nama kosong tetap kosong |
| Status Draft batch sample dipaksa dikirim sebagai `sample` | Draft tidak pernah tersimpan di server dan komputer lain melihatnya sebagai final | Draft dikirim apa adanya. Bila server menolak, FE mengulang sekali sebagai `sample` lalu memakai `sample` berikutnya. Begitu backend menerima `draft`, statusnya langsung tersimpan tanpa perubahan FE (3 tes baru) |
| FE masih memanggil `GET /dashboard/stats` hanya untuk kartu debug, dan menyimpan jalur `PUT /transaksi/{id}/koreksi` yang sudah tak dipakai | Permintaan dan kode yang tidak perlu | Keduanya dilepas dari FE (rute backend boleh tetap ada) |
| Beberapa komponen membaca ulang `localStorage` (dekompresi LZ) setiap render bila daftar kosong | Beban tak perlu dan dua sumber data | Komponen memakai data dari App saja |

Pembuktian di peramban: mengubah harga jual HJ-30 langsung memperbarui layar, mengirim `POST /api/v1/master/harga-jual`,
dan karena backend lokal mati, perubahan masuk antrean dengan lencana "1 simpanan belum sampai ke server" di Header.
Perubahan tidak ada yang hilang tanpa tanda.

## 3. Logika aplikasi

| No | Temuan | Perbaikan |
|---|---|---|
| 1 | **Jumlah bayar berbeda antar menu.** Pada data uji, Kasir menampilkan Kredit Rp 738.525.000, sedangkan Laporan Pembelian Rp 737.090.000 (selisih Rp 1.435.000). Laporan mengurangkan potongan bal yang belum ditimbang sampai minus, sedangkan Kasir tidak | Satu rumus `hitungJumlahBayarBal`: bal belum ditimbang = 0, tidak pernah negatif. Kini kedua layar cocok (diverifikasi di peramban) |
| 2 | Top 5 Harga Beli di Dashboard menghitung tiap kupon dua kali (harga rata-rata kupon ditambah tiap bal) | Dihitung per bal; kupon lama tanpa rincian bal dihitung sekali. Satuannya menjadi "Bal" |
| 3 | Dashboard menampilkan kartu debug pengembang ke pengguna ("harus ≈ kartu Total Pembelian", "selisih modal FE x%") | Dihapus |
| 4 | Kotak "Ingat Sesi di Komputer Ini" di Login tidak berfungsi sama sekali, dan ada jeda buatan 200 ms | Kotak dan jeda dihapus |
| 5 | Keluar otomatis 30 menit tidak menghitung gulir di area menu (event `scroll` tidak menggelembung) | Aktivitas dipantau pada fase capture, termasuk `wheel` |
| 6 | Toast kegagalan tampil dengan centang hijau, dan timer toast lama bisa menutup toast baru | Ikon kuning untuk pemberitahuan dan kegagalan, timer direset tiap toast |
| 7 | Tombol "Muat Ulang" di Manajemen Pengguna ternyata hanya mengosongkan filter (sama dengan Reset Filter) | Dihapus |
| 8 | Catatan batch sample terisi otomatis kalimat karangan ("evaluasi organoleptik dan uji kadar air") yang ikut ke dokumen | Kosong secara bawaan |
| 9 | Modal hapus kupon menampilkan status "CASH" untuk kupon tanpa status bayar (seharusnya kredit) | Memakai `labelStatusBayar` |
| 10 | Laporan Pengiriman menampilkan sample berstatus Nego sebagai "Dalam Pengujian" | Status Disetujui, Nego, Ditolak, dan Menunggu ditampilkan apa adanya |
| 11 | Matriks Wewenang tidak memuat Laporan Bal, Master Harga Jual, dan Status & Detail Batch. Tautan "Buka Master Harga Beli" di grafik justru membuka Laporan Harga | Daftar modul disamakan dengan menu, label tautan diperbaiki |

Kode mati yang dibuang: `MODULES_CONFIG` di Sidebar (Sidebar ditulis ulang berbasis data, dari 633 baris menjadi sekitar 200),
`SampleStatusUpdateModal`, `resetAllERPData`, `ErpApiService.koreksiTransaksi` dan `getDashboardStats`, handler sample
lama di App, properti tak terpakai di Home, Header, Laporan Harga, dan Pengiriman, serta efek pemuatan ganda saat
App pertama dibuka.

## 4. UI/UX

- **Teks penjelasan dihapus di seluruh menu**: subjudul banner, lencana "Proses 1/2/3", kotak "Aturan/Catatan/Info",
  teks kecil di bawah kolom isian, petunjuk "Silakan/Klik tombol…" pada tabel kosong, keterangan "ditampilkan dalam
  1 halaman", kolom "Keterangan & Cakupan Fungsi" di Home, serta teks promosi dan catatan keamanan di Login. Label,
  data, pesan galat singkat, dan konfirmasi tindakan yang tak bisa dibatalkan tetap ada. Pemindaian otomatis di
  peramban atas 17 menu tidak lagi menemukan kalimat penjelasan.
- **Judul sama dengan nama menu** di Header, banner halaman, Home, dan Matriks Wewenang (sebelumnya satu menu bisa
  punya tiga nama, mis. "Data Pembelian Barang (Kasir & Cetak Nota)" / "Kasir & Pencairan Nota" / "Kasir").
- **Warna diseragamkan**: 135 kelas biru, ungu, indigo, sky, dan rose diganti ke palet netral dan merah. Kolom tabel
  laporan tidak lagi berlatar hijau, biru, atau merah. Grafik tidak lagi berwarna pelangi: batang abu-abu dengan
  batang terbesar merah. Tombol tahap Surat Jalan (dulu kuning, hijau, dan biru) kini satu gaya. Status memakai satu
  aturan: hijau selesai/lunas, kuning menunggu/kredit, merah ditolak. Badge "Belum Lunas" di Laporan Bal diubah ke
  kuning mengikuti Kasir. Kartu merah berteks kuning di Detail Batch dan tombol abu gelap `#545b62` dihapus.
- **Kasir**: baris KPI yang mengulang kartu status (Total Transaksi, Kas Keluar, Hutang) dihapus.
  "Show/entries" diganti "Tampil/per hal." seperti tabel lain.
- **Pesan validasi**: emoji dan huruf kapital semua ("⚠️ PERINGATAN PENGIRIMAN GANDA", "Sesuai SOP…") diganti kalimat
  singkat.
- Aturan tampilan dicatat di README bagian "Standar tampilan" agar pengembangan berikutnya tetap seragam.

## 5. QA

| Pemeriksaan | Hasil |
|---|---|
| `npm run lint` (tsc strict) | Bersih |
| `npm test` | 29 berkas, 211 lulus, 1 todo (sebelumnya 205). Tes baru: baris sample dari batch, jumlah bayar per bal, fallback status Draft (3). Dua selector tes disesuaikan dengan placeholder baru |
| `npm run build` | Sukses |
| Peramban (data uji 10 petani, 22 kupon, 785 bal) | 17 menu terbuka tanpa galat. Angka Kasir dan Laporan Pembelian cocok. Uji CRUD harga jual: layar berubah, permintaan ke server terkirim, dan antrean tampil di Header saat server mati |
| Panduan UAT | `PANDUAN_PENGUJIAN_MANUAL.md` ditulis ulang mengikuti menu dan tombol saat ini, lengkap dengan endpoint dan cara membuktikan data tersimpan di server |

## 6. Dokumentasi yang diperbarui

`README.md` (arsitektur sinkron, aturan bisnis, tabel tara sesuai kode, deploy staging/produksi, struktur, standar
tampilan), `DOKUMENTASI_DATABASE.md` (kontrak API, rumus jumlah bayar, status Draft, payload kupon, peta kode),
`RENCANA_PERBAIKAN_ALUR_FE_BE.md` (fase F), `PANDUAN_PENGUJIAN_MANUAL.md` (UAT baru), dan dokumen ini.

## 7. Masih terbuka

### Dibutuhkan dari backend (tanpa ini FE tetap aman: perubahan menunggu di antrean dan terlihat di Header)

| No | Kebutuhan | Menu terdampak |
|---|---|---|
| 1 | `DELETE /transaksi/{id}?alasan=` (tolak 409 bila ada bal di Surat Jalan) | Kasir: hapus kupon |
| 2 | `DELETE /sample-batch/{id}` dan terima status `draft` di `POST/PUT /sample-batch` | Status & Detail Batch, Pengiriman Sample |
| 3 | `PUT /pengiriman/{id}`, `PUT /pengiriman/{id}/status`, `DELETE /pengiriman/{id}` | Pengiriman Reguler dan Status Pengiriman |
| 4 | `PUT /petani/{id}/ganti-id` (cascade ke kupon dan bal) | Master Petani: ganti ID kartu |
| 5 | `PUT /sample-batch/{id}` menyamakan isi batch dengan `items[]` | Edit batch sample |
| 6 | Bal dibuat saat sortir (status `proses_sortir`), bukan saat dibayar; `ganti_tikar` bal yang belum ditimbang disimpan lewat `sortir-items` | Sortir, Timbangan, Pengiriman Sample |
| 7 | `auth:sanctum` dan pemeriksaan peran di rute mutasi | Keamanan (RBAC saat ini hanya di klien) |
| 8 | API jejak audit (`POST/GET /audit-log`) | Audit trail masih per peramban |
| 9 | `lokasi_simpan` tidak wajib (FE masih mengirim `Blok A` demi kompatibilitas) | Sortir, Timbangan |

### Keputusan pemilik

1. Tara bal TS/T tepat 60,0 kg: kode memberi 5 kg, HF memberi 6 kg (`it.todo` di `potonganTara.test.ts`).
2. Identitas tampilan aplikasi (login, menu, header) masih "PT. Sekar Maju Sejahtera", sedangkan dokumen cetak memakai "S.A Group".

### Tidak dapat diverifikasi dari sini

Kode backend dan database produksi, secret GitHub (`STAGING_*`, `VPS_*`) dan konfigurasi Nginx di VPS, cetak pada printer
fisik, serta pemindai barcode dan timbangan fisik. Semua ini masuk skenario UAT di `PANDUAN_PENGUJIAN_MANUAL.md`.

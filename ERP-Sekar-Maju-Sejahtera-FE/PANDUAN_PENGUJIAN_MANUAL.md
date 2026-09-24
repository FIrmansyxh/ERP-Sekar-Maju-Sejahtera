# Panduan Pengujian Manual (UAT)

Diperbarui: 2026-09-21 · Frontend v3.0.x · Dipakai untuk trial dan pelatihan sebelum serah terima.

Tujuan dokumen ini: membuktikan setiap menu berfungsi penuh **dan** setiap perubahan benar-benar tersimpan di
database server, bukan hanya di layar atau peramban. Skenario disusun mengikuti alur kerja gudang: master data,
pembelian (Sortir, Timbangan, Kasir), pengiriman, laporan, lalu pengguna.

---

## 1. Persiapan

| Kebutuhan | Keterangan |
|---|---|
| Alamat | Alamat **staging** untuk trial (data boleh dikotori), alamat **produksi** hanya untuk pemakaian nyata |
| Peramban | Chrome atau Edge terbaru, **bukan** jendela penyamaran |
| Akun | Satu akun per peran yang diuji (Super Admin, Admin Sortir, Admin Timbang, Admin Kasir, Admin Pengiriman, Kepala Gudang) |
| Dua komputer | Diperlukan untuk skenario "terlihat di komputer lain" (bagian 4) |
| Perangkat | Pemindai barcode dan timbangan bila tersedia |

### Cara membuktikan data tersimpan di server

Setiap skenario diakhiri tiga pemeriksaan yang sama. Anggap gagal bila salah satunya tidak terpenuhi.

1. **Header bersih.** Tidak ada lencana kuning/merah ("N simpanan belum sampai ke server", "Server tidak terhubung",
   "Sesi login habis") di kanan atas setelah beberapa detik, dan tidak ada pesan "... tidak tersimpan" / "... dibatalkan"
   di pojok kanan bawah.
2. **Tahan muat ulang.** Tekan F5, lalu buka menu yang sama: data tetap seperti yang baru disimpan.
3. **Terlihat di komputer lain** (untuk skenario yang ditandai ⧉): di komputer kedua yang sudah login, data yang sama
   tampil dalam beberapa detik TANPA muat ulang atau login ulang.

Untuk pemeriksaan teknis, buka DevTools (F12) → tab Network dan cari permintaan ke `/api/v1/...` dengan status
`200`/`201`. Endpoint per skenario tercantum di kolom "Endpoint".

### Arti lencana di Header

| Lencana | Arti | Tindakan |
|---|---|---|
| Tidak ada | Semua perubahan sudah di server | - |
| Abu-abu "Menyimpan ke server (N)" | Sedang dikirim | Tunggu beberapa detik |
| Kuning "N simpanan belum sampai ke server" + tombol Kirim ulang | Simpanan kupon tertahan karena jaringan/server, dicoba ulang otomatis | Jangan tutup halaman; periksa koneksi |
| Kuning "Server tidak terhubung (data terakhir HH:MM:SS)" | Layar sedang tidak mengikuti server; data komputer lain belum terlihat | Periksa koneksi; hilang sendiri saat tersambung |
| Merah "Sesi login habis" | Token tidak berlaku (akun dinonaktifkan, login cadangan tanpa server, dsb.) | Login ulang; simpanan kupon yang tertunda terkirim otomatis |
| Pesan pojok kanan bawah "... tidak tersimpan: <alasan>" / "... dibatalkan: <alasan>" | Server menolak perubahan; data di semua komputer tetap seperti semula | Baca alasannya, perbaiki isian, ulangi |

---

## 2. Skenario per menu

Kolom "Hasil yang diharapkan" selalu ditambah tiga pemeriksaan di bagian 1.

### 2.1 Login dan hak akses

| No | Langkah | Hasil yang diharapkan | Endpoint |
|---|---|---|---|
| L1 | Login dengan username dan sandi benar | Masuk ke Home, nama dan peran tampil di Header | `POST /auth/login` |
| L2 | Login dengan sandi salah | Ditolak dengan pesan galat, tidak masuk | `POST /auth/login` (4xx) |
| L3 | Login dengan akun nonaktif | Ditolak | `POST /auth/login` (4xx) |
| L4 | Login sebagai Admin Timbang, coba buka menu lain dari Home | Hanya menu Timbangan yang tersedia | - |
| L5 | Diamkan 30 menit tanpa aktivitas | Keluar otomatis, kembali ke layar login | - |

### 2.2 Master Petani ⧉

| No | Langkah | Hasil yang diharapkan | Endpoint |
|---|---|---|---|
| P1 | Tambah Petani Baru: isi nama (HP dan alamat boleh kosong), Simpan | Petani muncul di urutan teratas dengan ID dari server | `POST /petani` |
| P2 | Edit petani P1: ubah No. HP, Simpan | No. HP berubah | `PUT /petani/{id}` |
| P3 | Nonaktifkan petani P1 dengan alasan | Status Nonaktif; petani tidak muncul di pilihan Sortir | `PUT /petani/{id}` |
| P4 | Aktifkan kembali | Status Aktif; muncul lagi di Sortir | `PUT /petani/{id}` |
| P5 | Import / Export → Import Data: tempel 3 nama (satu per baris), Impor | 3 petani tersimpan berurutan (baris pertama ID terkecil) | `POST /petani` ×3 |
| P6 | Import / Export → Unduh Excel | Berkas .xlsx terunduh berisi seluruh petani | - |
| P7 | Cetak kartu petani | Pratinjau kartu depan/belakang tampil dan bisa dicetak | - |
| P8 | Ganti ID kartu | ID berubah di daftar dan kupon terkait | `PUT /petani/{id}/ganti-id` **(menunggu backend)** |

### 2.3 Master Harga Beli dan Harga Jual ⧉

| No | Langkah | Hasil yang diharapkan | Endpoint |
|---|---|---|---|
| H1 | Harga Beli → Tambah Master: kode `99`, harga `99000`, tanggal berlaku | Baris baru tampil | `POST /master/harga-beli` |
| H2 | Edit harga kode `99` menjadi `98000` | Harga berubah, tidak ada baris ganda | `POST /master/harga-beli` (upsert) |
| H3 | Nonaktifkan kode `99` | Status Nonaktif; kode tidak bisa dipilih di Sortir | `POST /master/harga-beli` |
| H4 | Ulangi H1–H3 di Harga Jual (kode `HJ-99`) | Sama; kode nonaktif tidak muncul di pilihan harga jual Sample/DO | `POST /master/harga-jual` |

### 2.4 Pembelian: Sortir → Timbangan → Kasir ⧉

| No | Langkah | Hasil yang diharapkan | Endpoint |
|---|---|---|---|
| S1 | Sortir: isi No. Kupon, pilih petani, scan/ketik No Bal, pilih mutu, Tambah Bal (3 bal) | Kupon terbuka, 3 bal tampil di Daftar Bal | `POST /transaksi/sortir`, lalu `PUT /transaksi/{id}/sortir-items` |
| S2 | Tambah 1 bal lagi, lalu ubah grade satu bal | Daftar bal 4, grade berubah | `PUT /transaksi/{id}/sortir-items` |
| S3 | Pakai No. Kupon yang sudah ada | Ditandai Duplikat, tombol "Pakai Nomor Berikutnya" tersedia | - |
| S4 | Selesai Sortir | Kupon hilang dari "Kupon Sortir Belum Selesai" | `PUT /transaksi/{id}/sortir-items` |
| T1 | Timbangan: scan No Bal kupon S1, ketik bruto, Enter | Tara dan netto terisi otomatis, bal terkunci, kursor kembali ke kolom No Bal | `PUT /transaksi/{id}/timbang` |
| T2 | Centang "Ada Ganti Tikar?" pada bal yang belum ditimbang, lalu timbang | Potongan tikar Rp 75.000 tercatat pada bal | `PUT /transaksi/{id}/timbang` |
| T3 | Buka Kunci bal yang sudah ditimbang, timbang ulang | Berat baru tersimpan | `PUT /transaksi/{id}/timbang` |
| T4 | Bal bertanda SB dengan bruto > 50 kg | Tombol simpan terkunci "Bobot Melebihi Toleransi" | - |
| K1 | Kasir: kupon dengan bal belum ditimbang, klik Bayar | Ditolak; ditawarkan membuka kupon di Timbangan | - |
| K2 | Setelah semua bal ditimbang, Bayar: ketik ulang jumlah bayar persis, centang tiket timbang | Kupon Lunas, masuk kartu "Lunas" | `PUT /transaksi/{id}/bayar` |
| K3 | Bandingkan total Lunas dan Belum Lunas di Kasir dengan Laporan Pembelian (filter sama) | Angkanya sama persis | - |
| K4 | Kupon belum lunas → ikon Edit | Kupon terbuka di Sortir (Mode Edit Kupon); bisa tambah/ubah/hapus bal | `PUT /transaksi/{id}/sortir-items` |
| K5 | Kupon lunas → coba Edit / buka di Sortir atau Timbangan | Terkunci, hanya bisa dilihat | - |
| K6 | Hapus kupon belum lunas dengan alasan | Kupon dan balnya hilang dari semua menu | `DELETE /transaksi/{id}` **(menunggu backend)** |
| K7 | Cetak nota kupon lunas, unduh PDF | Nota per lembar, tidak ada baris terpotong | - |

### 2.5 Pengiriman Sample dan Status & Detail Batch ⧉

| No | Langkah | Hasil yang diharapkan | Endpoint |
|---|---|---|---|
| B1 | Pengiriman Sample: isi No. Surat Pengiriman Sample, tujuan, scan 3 bal, Simpan sebagai Draft | Batch berstatus DRAFT di Status & Detail Batch | `POST /sample-batch` (`status: "draft"`) |
| B2 | Buka komputer kedua | Batch tampil sebagai Draft bila backend sudah menerima status `draft`; bila belum, tampil sebagai final (lihat Laporan Audit) | `GET /sample-batch` |
| B3 | Edit batch B1: tambah 1 bal, ubah harga jual 1 bal, Simpan & Finalkan | Batch final berisi 4 bal dengan harga baru | `PUT /sample-batch/{id}` |
| B4 | Nomor surat sample kembar | Ditolak dengan saran nomor berikutnya | - |
| B5 | Detail batch → isi hasil sortir pembeli (ACC/Nego/Tolak) → Simpan Hasil Sortir Buyer | Jumlah ACC/Nego/Ditolak dan nilai deal berubah | `PUT /sample-batch/{id}` |
| B6 | Cetak surat pengiriman sample | Surat tampil dengan kode harga, bukan nilai rupiah | - |
| B7 | Hapus batch yang belum punya Surat Jalan | Batch hilang, bal tetap di stok gudang | `DELETE /sample-batch/{id}` **(menunggu backend; sementara `PUT status=dibatalkan`)** |
| B8 | Dashboard: kartu "Sample Disetujui" dan Laporan Pengiriman tab Pengiriman Sample | Angka sesuai hasil B5 | - |

### 2.6 Pengiriman Reguler (DO) dan Status Pengiriman ⧉

| No | Langkah | Hasil yang diharapkan | Endpoint |
|---|---|---|---|
| D1 | Sumber Bal: Stok Gudang. Isi No. Surat Jalan, tujuan, sopir, nopol; scan 3 bal; pilih harga jual; Terbitkan Surat Jalan | Surat Jalan tampil di Status & Detail Batch (Akan Dikirim); bal berstatus Dikirim | `POST /pengiriman` |
| D2 | Bal tanpa harga jual | Penerbitan ditolak, bal tanpa harga disebut | - |
| D3 | Atur Netto: tambah baris potongan, periksa Netto Jual dan Total Nilai | Netto jual = bruto timbang ulang − potongan | - |
| D4 | Dari Batch Sample: pilih batch final, centang semua bal, terbitkan | Bal batch tertandai sudah DO | `POST /pengiriman`, `PUT /sample-batch/{id}` |
| D5 | Edit Surat Jalan yang belum Selesai: keluarkan 1 bal, simpan | Bal yang dikeluarkan kembali ke gudang | `PUT /pengiriman/{id}` **(menunggu backend)** |
| D6 | Status: Berangkat → Tiba → Selesai (konfirmasi) | Status berubah; setelah Selesai, nilai masuk Dashboard dan tidak bisa diubah/dibatalkan | `PUT /pengiriman/{id}/status` **(menunggu backend)** |
| D7 | Batalkan Surat Jalan yang belum Selesai | Surat Jalan hilang, bal kembali ke gudang | `DELETE /pengiriman/{id}` **(menunggu backend)** |

### 2.7 Laporan dan Dashboard

| No | Langkah | Hasil yang diharapkan |
|---|---|---|
| R1 | Buka tiap laporan | Data dimuat ulang dari server saat menu dibuka (tombol Muat Ulang Data di Dashboard) |
| R2 | Terapkan filter tanggal/petani, lalu Unduh Excel | Isi Excel sama dengan tabel di layar |
| R3 | Laporan Bal, Harga, Petani: nilai dan aset | Hanya kupon lunas yang dihitung; kredit ditampilkan terpisah |
| R4 | Laporan Pembelian: rekap ganti tikar dan jasa | Jumlah bal ganti tikar dan potongan sama dengan data Timbangan |
| R5 | Dashboard: Total Penjualan | Hanya Surat Jalan berstatus Selesai |

### 2.8 Manajemen Pengguna ⧉

| No | Langkah | Hasil yang diharapkan | Endpoint |
|---|---|---|---|
| U1 | Tambah Pengguna: username, sandi, role | Akun baru bisa login | `POST /users` |
| U2 | Edit role pengguna U1 | Menu yang tampil berubah setelah login ulang | `PUT /users/{id}` |
| U3 | Nonaktifkan U1 | U1 tidak bisa login | `PUT /users/{id}/status` |
| U4 | Reset sandi U1 (server menyala) | Sandi baru berlaku | `PUT /users/{id}/reset-password` |
| U5 | Reset sandi saat server mati | Ditolak; sandi tidak berubah di mana pun | - |
| U6 | Matriks Wewenang | Daftar menu sama dengan menu samping | - |

---

## 3. Skenario gangguan jaringan

| No | Langkah | Hasil yang diharapkan |
|---|---|---|
| G1 | Matikan jaringan komputer, timbang 2 bal | Layar tetap bekerja; Header kuning "2 simpanan belum sampai ke server" |
| G2 | Coba tutup tab | Peramban memperingatkan ada simpanan tertunda |
| G3 | Nyalakan jaringan | Lencana hilang sendiri dalam ≤ 1 menit (atau klik Kirim ulang); data ada di server |
| G4 | Matikan jaringan, edit harga jual | Muncul pesan "tidak tersimpan: server tidak dapat dihubungi"; form tetap terbuka; harga di layar TIDAK berubah. Nyalakan jaringan, simpan lagi: berhasil |
| G5 | Matikan jaringan beberapa detik | Header kuning "Server tidak terhubung"; hilang sendiri setelah jaringan kembali |

## 4. Skenario dua komputer (⧉)

Gunakan dua komputer (atau dua peramban berbeda) dengan akun berbeda. Semua perubahan harus terlihat di komputer lain
dalam ±3 detik tanpa muat ulang, dan tetap sama setelah F5.

| No | Langkah | Hasil yang diharapkan |
|---|---|---|
| D1 | A menambah bal di Sortir; B membuka Timbangan | Bal muncul di B |
| D2 | A menambah bal lain, B menimbang bal pertama pada saat yang hampir bersamaan | Keduanya tersimpan; tidak ada yang hilang atau kembali ke nilai lama |
| D3 | A menghapus bal / kupon; B yang masih membuka kupon itu menimbang bal tersebut | B mendapat pesan "sudah dihapus"; bal/kupon TIDAK muncul lagi di A, B, maupun setelah F5 |
| D4 | B mencentang ganti tikar; A menimbang bal lain di kupon yang sama | Centang GT tetap di kedua komputer |
| D5 | A mengedit / menonaktifkan petani, B membuka Master Petani atau Sortir | Perubahan terlihat di B; petani nonaktif hilang dari pilihan Sortir B |
| D6 | A mengubah master harga beli/jual | Harga baru terlihat di B tanpa buka menu ulang |
| D7 | A menerbitkan Surat Jalan dari batch sample; B membuka Status & Detail Batch | Surat Jalan tampil; bal di batch bertanda sudah DO. A membatalkan: di B Surat Jalan hilang dan tanda DO dicabut |
| D8 | A menghapus batch; B (masih membuka batch itu) menyimpan perubahan batch | B mendapat pesan batch sudah dihapus; batch tidak muncul lagi |
| D9 | Buka laporan yang sama di A dan B setelah langkah di atas | Angka laporan sama persis di A dan B |

Uji otomatis setara (menjalankan kode aplikasi di dua proses terpisah terhadap backend staging/uji):
`E2E_PASS_A=... E2E_PASS_B=... npx vite-node scripts/uji-dua-perangkat/jalankan.ts`.

## 5. Daftar periksa sebelum serah terima

- [ ] Semua skenario bagian 2 tanpa tanda "(menunggu backend)" lulus di staging.
- [ ] Backend sudah menjalankan `php artisan erp:perbarui-skema` (lihat `DOKUMENTASI_DATABASE.md` 5.5).
- [ ] Skenario dua komputer (bagian 4) lulus, atau uji otomatis dua perangkat lulus di staging.
- [ ] Skenario gangguan jaringan (bagian 3) lulus.
- [ ] Sandi awal Super Admin sudah diganti.
- [ ] Backup PostgreSQL terjadwal dan pernah diuji pulih.
- [ ] `npm test` dan build di GitHub Actions hijau pada commit yang dirilis.

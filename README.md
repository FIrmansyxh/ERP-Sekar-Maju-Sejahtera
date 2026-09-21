# ERP PT. Sekar Maju Sejahtera

Sistem Enterprise Resource Planning untuk operasional gudang tembakau PT. Sekar Maju Sejahtera,
Pamekasan, Madura. Aplikasi menangani rantai proses lengkap mulai dari pendaftaran petani,
sortir mutu, penimbangan bal, pembayaran kasir, pengelolaan stok gudang, sampai pengiriman
barang dan sample ke pabrik rekanan.

| | |
|---|---|
| Versi | 3.0.0 |
| Jenis aplikasi | Single Page Application (frontend) yang terhubung ke REST API backend |
| Teknologi | React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4 |
| Backend | Laravel dengan basis data PostgreSQL, repositori terpisah |
| Penyimpanan di peramban | Cache `localStorage` terkompresi LZ-String untuk mode offline |
| Identitas pada dokumen | S.A Group, Jl. Raya Blumbungan, Dusun Kendal, Desa Trasak, Kec. Larangan, Kab. Pamekasan |
| Bahasa antarmuka | Indonesia |

---

## Daftar isi

1. [Ringkasan arsitektur](#ringkasan-arsitektur)
2. [Modul aplikasi](#modul-aplikasi)
3. [Peran pengguna dan hak akses](#peran-pengguna-dan-hak-akses)
4. [Aturan bisnis utama](#aturan-bisnis-utama)
5. [Menjalankan di komputer lokal](#menjalankan-di-komputer-lokal)
6. [Deployment produksi](#deployment-produksi)
7. [Penggunaan perdana](#penggunaan-perdana)
8. [Pencadangan dan pemulihan data](#pencadangan-dan-pemulihan-data)
9. [Struktur proyek](#struktur-proyek)
10. [Catatan keamanan](#catatan-keamanan)
11. [Standar tampilan](#standar-tampilan)
12. [Dokumen terkait](#dokumen-terkait)

---

## Ringkasan arsitektur

Repositori ini berisi frontend. Data utama disimpan di backend Laravel + PostgreSQL dan diakses
melalui REST API. Aplikasi memakai pola **API dulu, cache lokal sebagai cadangan**.

- Saat login dan saat memuat data, aplikasi memeriksa `GET {API}/health`.
- **Server tersedia:** data diambil dari API, lalu disalin ke `localStorage` sebagai cache.
- **Server tidak tersedia:** aplikasi berjalan dari cache `localStorage` dan login memakai
  akun yang tersimpan di peramban tersebut.

Alamat API ditentukan otomatis.

| Aplikasi dibuka dari | Alamat API |
|---|---|
| `localhost` atau `127.0.0.1` | `http://localhost:8000/api/v1` |
| Domain `*.vercel.app` | Tanpa API, aplikasi berjalan penuh dari data peramban |
| Domain lain (VPS produksi) | `{origin}/api/v1` |

Variabel lingkungan `VITE_API_BASE_URL` saat build mengesampingkan tabel di atas.

Konsekuensi penting:

- **Alamat Vercel hanya untuk demo.** Tanpa `VITE_API_BASE_URL`, akun, petani, dan transaksi
  yang dibuat di alamat Vercel hanya tersimpan di peramban tempat data itu dibuat dan tidak
  terlihat di komputer lain.
- **Operasi harian memakai alamat VPS** agar semua komputer berbagi data yang sama.
- **Setiap perubahan dikirim ke server lewat antrean.** Kupon memakai `antrianSinkron`, perubahan lain
  (petani, harga, pengguna, status bal, batch sample, Surat Jalan, penghapusan) memakai `antrianMutasi`.
  Layar langsung berubah, lalu perubahan dikirim, dicoba ulang sampai berhasil, dan jawaban server
  dicocokkan. Selama ada yang belum sampai, Header menampilkan lencana "N simpanan belum sampai ke server".
- **Yang masih bergantung pada backend.** Beberapa endpoint belum tersedia di backend (hapus kupon, hapus
  batch sample, edit/hapus/status Surat Jalan, ganti ID kartu petani, status Draft batch). Perubahan itu
  tetap tersimpan di antrean dan terlihat di Header sampai endpoint-nya ada. Jejak audit masih per
  peramban. Daftar lengkap ada di `DOKUMENTASI_DATABASE.md` bagian 5.3.

## Modul aplikasi

### Pembelian dan operasional harian

| Modul | Fungsi |
|---|---|
| Sortir | Input nomor kupon, pemilihan petani, penetapan grade dan nomor bal |
| Timbangan | Input berat bruto, perhitungan tara otomatis, dan penetapan berat netto |
| Kasir | Rekap pembelian per kupon, pembayaran, detail transaksi, koreksi data timbang, dan cetak nota |

### Master data

| Modul | Fungsi |
|---|---|
| Master Petani | Registrasi petani (nomor HP dan alamat opsional), kartu petani, status keaktifan, impor daftar nama dari file CSV/TXT, dan ekspor Excel |
| Master Harga Beli | Kode grade dan harga beli per kilogram beserta tanggal berlaku |
| Master Harga Jual | Kode dan harga jual per kilogram ke pabrik beserta tanggal berlaku |

### Pengiriman

| Modul | Fungsi |
|---|---|
| Pengiriman Sample | Pengiriman contoh bal ke pabrik dengan No. Surat Pengiriman Sample manual, lalu pencatatan hasil uji |
| Status & Detail Batch | Evaluasi sortir pembeli per bal sample (ACC, nego, tolak) dan harga deal |
| Pengiriman Reguler (DO) | Penyusunan muatan per nomor bal, No. Surat Jalan manual, harga jual, dan cetak surat jalan |

### Laporan dan administrasi

| Modul | Fungsi |
|---|---|
| Dashboard Analytic | Ringkasan pembelian, penjualan, laba, valuasi stok, tren, sample disetujui, dan unduhan Excel |
| Laporan Bal, Laporan Harga | Detail bal (termasuk rekap per kode bal) dan analisis per kode harga beli/jual |
| Laporan Pembelian, Petani, Pengiriman | Rekapitulasi dengan filter, ringkasan, dan unduhan Excel |
| Manajemen Pengguna | Pembuatan akun, penetapan peran, reset kata sandi, dan jejak audit |

## Peran pengguna dan hak akses

Kontrol akses berbasis peran diterapkan pada setiap modul. Pengguna yang membuka modul di luar
wewenangnya dikembalikan ke beranda disertai pemberitahuan, termasuk ketika modul terakhir
tersimpan dari sesi sebelumnya. Definisi lengkap ada di `src/utils/rbac.ts`.

| Peran | Modul yang dapat dibuka |
|---|---|
| Super Admin | Seluruh modul, termasuk Manajemen Pengguna dan jejak audit |
| Admin Sortir | Sortir, Master Petani, Master Harga Beli, Master Harga Jual, dashboard, dan seluruh laporan |
| Admin Timbang | Timbangan |
| Admin Kasir | Sortir, Timbangan, Kasir, dashboard, dan seluruh laporan |
| Admin Pengiriman | Pengiriman Sample, Status & Detail Batch, Pengiriman Reguler, Master Harga Jual, dan Laporan Pengiriman |
| Kepala Gudang | Status & Detail Batch, dashboard, dan seluruh laporan |

Berganti akun dilakukan melalui logout lalu login kembali. Tidak tersedia jalur pintas
pergantian akun tanpa kata sandi.

## Aturan bisnis utama

**Satu gudang.** Sistem tidak memakai lokasi atau blok gudang.

**Potongan tara berdasarkan kode bal dan berat bruto.** Aturannya didefinisikan satu kali di
`src/config/aturanTimbang.ts` dan `hitungPotonganTaraKg` (`src/utils/formatters.ts`).

| Kode bal | Di bawah 50 kg | 50 kg sampai batas atas | Di atas batas atas |
|---|---|---|---|
| SB | 2 kg | 2 kg | 2 kg |
| TS dan T (batas atas 60,0 kg termasuk) | 4 kg | 5 kg | 6 kg |
| HF dan kode lain (batas atas di bawah 60 kg) | 3 kg | 5 kg | 6 kg |

Artinya bal TS/T seberat tepat 60,0 kg kena tara 5 kg, sedangkan HF 60,0 kg kena 6 kg. Perbedaan ini
masih menunggu konfirmasi pemilik (ada `it.todo` di `src/utils/potonganTara.test.ts`).

**Potongan biaya per bal.** Kuli Rp 7.000, tali Rp 3.000, dan ganti tikar Rp 75.000 bila
dipilih pada transaksi. Tarif ini didefinisikan satu kali di `src/config/aturanTimbang.ts`.

**Berat tidak pernah dibulatkan.** Nilai berat bruto, tara, dan netto disimpan serta
ditampilkan apa adanya sampai tiga angka di belakang koma. Sistem hanya membersihkan galat
presisi bilangan pecahan komputer, misalnya hasil pengurangan `15,75 - 3` dicatat tepat
`12,75` dan bukan `12,749999999999998`.

**Status lunas hanya dari Kasir.** Kupon berstatus lunas setelah dibayar di Kasir. Sebelum itu
dicatat sebagai kredit. Nilai pembelian, valuasi stok, dan aset hanya menghitung kupon lunas.
Unduh PDF nota baru terbuka setelah lunas. Nota yang dicetak sebelum lunas menampilkan status
BELUM LUNAS (KREDIT).

**Netto untuk pembelian, bruto untuk pengiriman.** Harga beli dihitung dari berat netto.
Surat Jalan, Surat Pengiriman Sample, dan nilai penjualan memakai berat bruto.

**Grade dan harga beli bersifat internal.** Grade adalah acuan harga beli, sehingga tidak
ditampilkan pada form maupun dokumen pengiriman. Harga pada Surat Jalan diambil dari Master
Harga Jual, dan surat jalan tidak dapat diterbitkan bila ada bal tanpa harga jual.

**Nomor surat diisi manual dan tidak boleh kembar.** No. Surat Jalan dan No. Surat Pengiriman
Sample diketik petugas. Nomor yang sudah dipakai ditolak, disertai informasi nomor terakhir
dan saran nomor berikutnya, misalnya setelah `PJM0001` disarankan `PJM0002`.

**Nomor yang tampil adalah nomor buatan pengguna.** Dokumen dan tabel menampilkan No. Kupon,
No. Bal, No. Surat Jalan, No. Surat Sample, dan username. ID internal sistem tetap disimpan
sebagai kunci data tetapi tidak ditampilkan.

**Jumlah bayar sama di semua layar.** Jumlah bayar per bal = nilai beli − kuli − tali − tikar; bal
yang belum ditimbang belum dibayar (0) dan jumlah bayar tidak pernah negatif. Kasir, Nota, dan
Laporan Pembelian memakai rumus yang sama (`hitungJumlahBayarBal`), sehingga total lunas dan kredit
di ketiganya selalu cocok.

**Data yang sudah dikirim tidak dapat dihapus.** Kupon tidak dapat dihapus bila salah satu balnya
sudah tercantum pada Surat Jalan. Surat Jalan dapat diedit atau dibatalkan selama belum Selesai;
status Selesai bersifat final dan baru saat itulah nilai penjualannya masuk laporan. Batch sample
dapat dihapus selama belum dibuatkan Surat Jalan; balnya tetap di stok gudang.

**Harga jual boleh di bawah harga beli.** Sistem tidak memblokir penetapan harga jual yang
lebih rendah dari harga beli, karena kondisi tersebut sah pada kesepakatan khusus atau
penghabisan stok.

**Batas berat bal SB.** Bal bertanda SB ditolak bila melebihi 50 kg.

**Petani nonaktif.** Petani yang dinonaktifkan tidak lagi muncul pada pilihan penyetor di loket
sortir, sehingga tidak dapat masuk ke antrian timbang. Seluruh riwayat transaksinya tetap
tersimpan dan tetap muncul pada laporan. Alasan penonaktifan dicatat pada jejak audit.

**Dokumen tanpa data karangan.** Kop surat, nama penandatangan, dan angka pada dokumen hanya
berasal dari data yang diisi pengguna. Nama petugas pada surat jalan dan laporan diambil dari
akun yang sedang login.

## Menjalankan di komputer lokal

Prasyarat: Node.js versi 20 atau lebih baru. Backend Laravel dijalankan terpisah pada
`http://localhost:8000` (`php artisan serve`). Tanpa backend, aplikasi tetap berjalan memakai
data peramban.

Pasang dependensi sesuai `package-lock.json`.

```bash
npm ci
```

Jalankan server pengembangan pada port 3000.

```bash
npm run dev
```

Periksa tipe tanpa menghasilkan berkas keluaran. TypeScript berjalan dalam mode `strict` dengan
`noUnusedLocals`, jadi kode mati dan tipe yang longgar langsung terdeteksi.

```bash
npm run lint
```

Jalankan tes otomatis (Vitest dan Testing Library). Gunakan `npm run test:watch` saat mengembangkan.

```bash
npm test
```

Tes berkas `*.test.ts(x)` berada di samping kode yang diuji. Isinya: aturan hitung (netto jual, potongan tara,
penjualan hanya dari Surat Jalan Selesai, status bayar, nomor dokumen, kunci hapus), perubahan stok bal dan status batch
saat Surat Jalan diedit atau dibatalkan, alur login (server sebagai penentu), serta uji tampilan untuk menu Status
Pengiriman, Kasir, Timbangan, Pengiriman Reguler, dan Pengiriman Sample.

### Kualitas dan kinerja

- **Muat awal ringan:** setiap menu diunduh saat pertama dibuka (`React.lazy`); pustaka PDF, grafik, dan Excel hanya
  diunduh saat dipakai. Muat awal sekitar 230 kB gzip (sebelumnya sekitar 680 kB).
- **Galat tidak mengosongkan layar:** `ErrorBoundary` di akar aplikasi dan per menu. Setelah aplikasi diperbarui di server,
  sesi lama yang gagal mengunduh potongan kode diarahkan untuk memuat ulang halaman.
- **Dialog seragam:** pemberitahuan dan konfirmasi memakai `utils/dialog.ts` (`tampilkanInfo`, `mintaKonfirmasi`), bukan
  `alert()`/`confirm()` bawaan peramban.
- **Peringatan simpanan:** perubahan yang gagal dikirim ke server dan penyimpanan peramban yang penuh ditampilkan di Header
  (`utils/peringatanSimpanan.ts`), tidak lagi hanya di konsol.

## Deployment produksi

Bangun aset produksi. Perintah ini menjalankan pemeriksaan tipe terlebih dahulu dan akan
berhenti bila ada kesalahan.

```bash
npm run build
```

Hasil build berada di direktori `dist/`. Uji hasilnya secara lokal sebelum diunggah.

```bash
npm run preview
```

### VPS (staging dan produksi)

`.github/workflows/deploy.yml` berjalan pada setiap push:

| Branch | Job | Lingkungan GitHub | Secret |
|---|---|---|---|
| `staging` | `deploy-staging` | `staging` | `STAGING_VPS_HOST`, `STAGING_VPS_USER`, `STAGING_VPS_SSH_KEY`, `STAGING_VPS_PORT` (opsional, bawaan 22) |
| `main` | `deploy-production` | `production` | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT` (opsional, bawaan 22) |

Kedua job membangun di GitHub Actions (`npm ci`, `npm test`, `npm run build`); deploy dibatalkan bila tes atau
build gagal. Hasil `dist/` dikirim ke `/var/www/erp-fe/ERP-Sekar-Maju-Sejahtera` di VPS masing-masing, diekstrak di
atas `dist/` yang lama, lalu Nginx dimuat ulang. Berkas versi lama sengaja tidak dihapus agar tab yang masih
membuka versi sebelumnya tetap bisa memuat potongan kodenya. VPS tidak menjalankan build, `git pull`, atau Node.

Alamat API tidak diatur saat build: aplikasi memakai `{origin}/api/v1` dari domain yang sedang dibuka. Bila
frontend dan API berada di domain berbeda, tambahkan env `VITE_API_BASE_URL` (lengkap dengan `/api/v1`) pada
langkah build di workflow. Catatan: workflow lama mengisi `VITE_API_URL`, variabel yang tidak pernah dibaca
aplikasi, sehingga sudah dihapus.

Workflow `.github/workflows/ci.yml` menjalankan pemeriksaan yang sama (tipe, tes, build) untuk setiap pull request dan
push ke branch selain `main` dan `staging` (keduanya sudah diperiksa `deploy.yml`), tanpa deploy.

Konfigurasikan Nginx agar setiap permintaan yang tidak cocok dengan berkas nyata diarahkan ke
`index.html`, dan rute `/api/` diteruskan ke aplikasi Laravel. Bila `/api/v1/health` tidak
mengembalikan JSON, aplikasi menganggap server mati dan beralih ke data peramban.

```nginx
server {
    listen 80;
    server_name erp.sekarmajusejahtera.co.id;
    root /var/www/erp-fe/ERP-Sekar-Maju-Sejahtera/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # location /api/ { ... }  arahkan ke aplikasi Laravel backend

    location ~* \.(js|css|woff2|png|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Gunakan HTTPS pada lingkungan produksi. Login cadangan tanpa server menghitung hash kata sandi
memakai Web Crypto API yang hanya tersedia pada konteks aman, yaitu HTTPS atau `localhost`.

### Vercel (demo)

Vercel membangun proyek dengan `npm run build`. Build gagal bila ada kesalahan tipe, termasuk
sisa penanda konflik merge (`<<<<<<<`). Tanpa `VITE_API_BASE_URL`, deployment Vercel berjalan
tanpa backend seperti dijelaskan pada [Ringkasan arsitektur](#ringkasan-arsitektur).

## Penggunaan perdana

Instalasi baru tidak membawa data contoh apa pun. Seluruh master data dan transaksi dimulai
dari nol, dan hanya tersedia satu akun bawaan.

| Kolom | Nilai |
|---|---|
| Username | `Sekarmajuadmin` |
| Kata sandi awal | `Supersekar25` |
| Peran | Super Admin |

Urutan penyiapan yang disarankan. Lakukan di alamat VPS agar data tersimpan di server.

1. Login memakai akun Super Admin di atas.
2. **Ganti kata sandi Super Admin** melalui Manajemen Pengguna, menu Reset Kata Sandi.
3. Buat akun staf melalui Manajemen Pengguna, Tambah Pengguna. Yang wajib hanya Username,
   Kata Sandi (minimal 6 karakter), dan Role. Nama lengkap, email, dan nomor HP boleh kosong.
   Bila nama kosong, username dipakai sebagai nama pada dokumen. Username disimpan persis
   seperti diketik, tanpa spasi, dan login tidak membedakan huruf besar dan kecil.
4. Isi Master Harga Beli dan Master Harga Jual beserta tanggal berlakunya.
5. Daftarkan petani secara manual atau lewat Master Petani, Import / Export, Import Data.
   Pilih file CSV/TXT atau tempel daftar nama, satu nama per baris. Judul kolom `Nama` boleh
   ada. Petani disimpan ke server satu per satu sesuai urutan baris, sehingga baris pertama
   mendapat ID Petani paling awal. Bila satu baris gagal, impor berhenti di baris itu agar
   urutan ID tidak loncat, dan sisa daftar dapat diimpor ulang.
6. Mulai operasi harian dari modul Sortir.

Kata sandi disimpan sebagai hash, tidak pernah dalam bentuk teks biasa. Sistem tidak
menyediakan pemulihan kata sandi mandiri, sehingga reset hanya dapat dilakukan oleh Super Admin.

## Pencadangan dan pemulihan data

Data yang sudah tersinkron tersimpan di basis data server, sehingga pencadangan utama adalah
backup PostgreSQL di VPS dan harus dijadwalkan. Data yang masih lokal, misalnya jejak audit,
tetap berada di peramban masing-masing komputer.

- **Master Petani** menyediakan ekspor Excel melalui tombol Import / Export.
- **Modul laporan** menyediakan unduhan rekap Excel (.xlsx) untuk keperluan arsip dan audit.
- Simpan hasil unduhan pada penyimpanan terpisah, misalnya server berkas kantor.

Hal yang menyebabkan data lokal hilang permanen dan perlu dihindari.

- Menghapus data situs atau riwayat peramban pada mesin operasional.
- Menjalankan aplikasi dalam mode penyamaran atau jendela privat.
- Berganti peramban atau profil pengguna sistem operasi.
- Menaikkan versi skema penyimpanan tanpa ekspor terlebih dahulu. Versi skema didefinisikan
  pada konstanta `STORAGE_VERSION` di `src/utils/storage.ts`.

## Struktur proyek

```
src/
├── App.tsx                  Komposisi aplikasi, routing modul, dan penjagaan sesi
├── config/
│   ├── appInfo.ts           Identitas rilis serta nama dan alamat perusahaan pada dokumen
│   └── aturanTimbang.ts     Tarif potongan kuli, tali, dan ganti tikar
├── services/
│   ├── apiClient.ts         Alamat API, token, health check, dan pemanggil HTTP (ApiError berisi kode status)
│   ├── erpApi.ts            Panggilan API dan pemetaan jawaban ke model layar
│   ├── antrianSinkron.ts    Antrean kirim kupon: satu permintaan per kupon, coba ulang, verifikasi hasil
│   ├── antrianMutasi.ts     Antrean perubahan lain (petani, harga, pengguna, bal, batch sample, Surat Jalan, hapus)
│   ├── kirimMutasi.ts       Pengirim per entitas untuk antrean mutasi beserta verifikasi jawaban server
│   └── overlayDaftar.ts     Perubahan yang belum sampai server ditimpakan ke daftar yang baru dimuat
├── components/
│   ├── auth/                Halaman login
│   ├── Header.tsx           Bilah atas, profil pengguna, dan logout
│   ├── Sidebar.tsx          Navigasi modul
│   ├── petani/              Master petani, kartu petani, impor dan ekspor
│   ├── harga/               Master harga beli
│   ├── harga_jual/          Master harga jual
│   ├── transaksi/           Sortir, timbang, kasir, nota, dan koreksi transaksi
│   ├── pengiriman/          Delivery order, surat jalan, dan status batch
│   ├── sample/              Pengiriman sample dan evaluasi mutu
│   ├── laporan/             Dashboard analitik dan seluruh laporan
│   ├── user/                Manajemen pengguna, matriks peran, dan jejak audit
│   ├── print/               Tampilan cetak mandiri
│   └── common/              Kop surat, ikon urutan, modal, dialog (DialogHost), ErrorBoundary, paginasi, pilihan tercari, dan lencana status simpanan
├── data/                    Data bawaan instalasi, seluruhnya kosong kecuali akun Super Admin
├── hooks/                   Hook khusus, antara lain pemindai barcode
├── test/                    Pengaturan tes dan pembangun data uji (fixtures)
├── types/                   Definisi tipe domain
└── utils/
    ├── storage.ts           Baca dan tulis localStorage, otentikasi lokal, serta jejak audit
    ├── rbac.ts              Definisi peran dan pemeriksaan hak akses
    ├── crypto.ts            Hash kata sandi SHA-256
    ├── statusBayar.ts       Penentuan status lunas dan kredit
    ├── statusBatchSample.ts Status Draft batch sample dan baris sample per bal untuk laporan
    ├── nomorDokumen.ts      Validasi nomor surat manual dan saran nomor berikutnya
    ├── kunciHapus.ts        Aturan kunci: Surat Jalan Selesai final dan satu-satunya yang dihitung sebagai penjualan
    ├── alurPengiriman.ts    Perubahan stok bal dan status batch sample saat Surat Jalan diedit atau dibatalkan
    ├── dialog.ts            Pemberitahuan dan konfirmasi (pengganti alert/confirm)
    ├── peringatanSimpanan.ts  Peringatan gagal kirim ke server dan penyimpanan peramban penuh
    ├── lazyHalaman.ts       React.lazy untuk komponen berekspor bernama
    ├── beratKirim.ts        Berat bruto untuk pengiriman dan penjualan
    ├── formatters.ts        Format angka, tanggal, dan penanganan presisi berat
    ├── financialCalculations.ts  Perhitungan nilai transaksi
    ├── kuponSortir.ts       Aturan kupon terbuka Sortir dan Timbangan
    ├── rekapKodeBal.ts      Rekap jumlah bal per kode bal dan per petani
    ├── paginasiNota.ts      Pembagian halaman nota agar baris tidak terpotong
    ├── paginasiDokumen.ts   Pembagian halaman Surat Jalan dan Surat Sample (aturan sama dengan nota)
    ├── aturanNetto.ts       Aturan potongan bruto ke netto jual pada Surat Jalan (rentang berat per pembeli)
    ├── excelExport.ts       Ekspor laporan Excel (.xlsx) siap cetak
    └── printDownload.ts     Ekspor PDF
```

## Catatan keamanan

Batasan berikut perlu ditutup dengan prosedur operasional.

- **Login: server adalah penentu.** Bila server menjawab dan menolak (sandi salah, akun nonaktif, 4xx), login gagal dan tidak
  dilanjutkan ke akun lokal. Akun lokal hanya dipakai saat server tidak dapat dijangkau (offline, timeout, atau galat 5xx).
- **Otorisasi peran masih berjalan di sisi klien.** Pemeriksaan peran di backend belum
  diterapkan (lihat `RENCANA_PERBAIKAN_ALUR_FE_BE.md`). Pengguna dengan akses ke peralatan
  pengembang peramban dapat membaca dan mengubah data lokal. Batasi akses fisik ke komputer
  operasional dan kunci sesi sistem operasi saat ditinggalkan.
- **Sesi berakhir otomatis setelah 30 menit tanpa aktivitas.** Pengguna harus login ulang.
- **Seluruh halaman berada di balik autentikasi,** termasuk tautan cetak mandiri berformat
  `?cetak=...`. Tanpa sesi yang sah, halaman login yang ditampilkan.
- **Jejak audit mencatat aktivitas penting** dan hanya dapat dibaca oleh Super Admin. Jejak
  audit saat ini tersimpan per peramban.
- **Kata sandi awal Super Admin tercantum di dokumen ini.** Segera ganti setelah login pertama,
  terutama bila repositori dapat diakses pihak luar.
- Gunakan satu akun untuk satu orang. Akun bersama membuat jejak audit kehilangan maknanya.

## Standar tampilan

Aturan ini dijaga di seluruh menu agar aplikasi terlihat satu sistem. Ikuti saat menambah atau mengubah layar.

- **Tidak ada teks penjelasan di layar.** Fungsi, alur, dan aturan dijelaskan saat pelatihan, bukan lewat subjudul,
  kotak "Info/Catatan/Aturan", atau teks kecil di bawah kolom. Yang tetap tampil: label, satuan, data, pesan galat
  atau penolakan (singkat, tanpa emoji dan tanpa huruf kapital semua), dan konfirmasi untuk tindakan yang tidak bisa
  dibatalkan. Tooltip (`title`) boleh dipakai untuk alasan tombol yang terkunci.
- **Judul sama dengan nama menu.** Header, banner halaman, Beranda, dan Matriks Wewenang memakai nama yang sama
  dengan menu samping (mis. "Kasir", bukan "Data Pembelian Barang (Kasir & Cetak Nota)").
- **Warna.** Merah perusahaan `#b81d24` untuk tombol utama, menu aktif, dan angka total terpenting. Abu-abu (gray/slate)
  untuk teks, garis, tombol sekunder (putih bergaris), dan grafik (batang terbesar merah, sisanya abu-abu). Warna
  lain hanya untuk status: hijau = selesai/lunas/aktif, kuning (amber) = menunggu/kredit/nego/dalam perjalanan,
  merah = ditolak/galat. Biru, ungu, indigo, dan sky tidak dipakai.
- **Tabel.** Semua tabel bergaris kolom dengan judul kolom rata tengah (diatur global di `src/index.css`); kolom tidak
  diberi latar berwarna.
- **Modal.** Kepala putih bergaris bawah, kotak ikon `bg-red-50` dengan ikon merah, tombol Batal putih bergaris,
  tombol utama merah.
- **Notifikasi.** Toast hijau (centang) untuk berhasil, ikon kuning untuk pemberitahuan, penolakan, dan kegagalan.

## Dokumen terkait

| Berkas | Isi |
|---|---|
| `LAPORAN_AUDIT_2026-09-21.md` | Hasil audit menyeluruh (UI/UX, frontend, backend, DevOps, QA): temuan, perbaikan, dan pekerjaan yang masih menunggu backend |
| `RENCANA_PERBAIKAN_ALUR_FE_BE.md` | Status sinkronisasi per menu antara frontend, backend, dan cache lokal |
| `PANDUAN_PENGUJIAN_MANUAL.md` | Skenario uji manual per menu (UAT) untuk trial dan pelatihan, termasuk cara membuktikan data tersimpan di server |
| `DOKUMENTASI_DATABASE.md` | Alur data, relasi tabel, pemetaan field ke kolom, kontrak API, pola query, keandalan sinkronisasi, dan daftar periksa migrasi VPS |
| `db/usulan-indeks-constraint.sql` | Usulan indeks, constraint, kolom tambahan, dan view untuk PostgreSQL (aditif, aman diulang) |

---

Hak Cipta © 2026 PT. SEKAR MAJU SEJAHTERA, Pamekasan, Madura, Jawa Timur.
Perangkat lunak internal perusahaan, bukan untuk distribusi publik.

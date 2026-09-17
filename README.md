# ERP PR. Sekar Maju Sejahtera

Sistem Enterprise Resource Planning untuk operasional gudang tembakau PR. Sekar Maju Sejahtera,
Pamekasan, Madura. Aplikasi menangani rantai proses lengkap mulai dari pendaftaran petani,
sortir mutu, penimbangan bal, pembayaran kasir, pengelolaan stok gudang, sampai pengiriman
barang dan sample ke pabrik rekanan.

| | |
|---|---|
| Versi | 3.0.0 (rilis produksi perdana) |
| Jenis aplikasi | Single Page Application, berjalan penuh di peramban |
| Teknologi | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Penyimpanan data | `localStorage` peramban, terkompresi LZ-String |
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

---

## Ringkasan arsitektur

Aplikasi ini tidak memerlukan server backend, basis data, maupun layanan pihak ketiga.
Seluruh data operasional disimpan di `localStorage` peramban pada komputer yang digunakan,
dalam bentuk JSON terkompresi. Berkas yang dihasilkan proses build adalah aset statis biasa
sehingga dapat dilayani oleh web server apa pun.

Konsekuensi penting dari arsitektur ini:

- **Data bersifat lokal per komputer dan per peramban.** Dua komputer yang membuka aplikasi
  tidak berbagi data. Tetapkan satu komputer sebagai mesin operasional utama.
- **Membersihkan data situs peramban akan menghapus seluruh data ERP.** Lakukan ekspor rutin
  seperti dijelaskan pada bagian [Pencadangan dan pemulihan data](#pencadangan-dan-pemulihan-data).
- **Tidak ada sinkronisasi otomatis antar perangkat.** Bila kelak dibutuhkan operasi
  multi-komputer, aplikasi perlu dilengkapi backend tersendiri.

## Modul aplikasi

### Pembelian dan operasional harian

| Modul | Fungsi |
|---|---|
| Sortir | Input nomor kupon antrian, pemilihan petani, dan penetapan mutu grade per bal |
| Timbangan | Input berat bruto, perhitungan tara otomatis, dan penetapan berat netto |
| Kasir | Rekap nilai pembelian, pencatatan pembayaran, dan cetak nota timbang |
| Transaksi Pembelian | Riwayat transaksi, koreksi data timbang, dan penelusuran per kupon |

### Master data

| Modul | Fungsi |
|---|---|
| Master Petani | Registrasi petani (nomor HP dan alamat opsional), kartu petani, status keaktifan, impor data, dan ekspor Excel |
| Master Harga Beli | Kode harga beli per kilogram beserta tanggal berlaku |
| Master Harga Jual | Kode harga jual per pembeli beserta tanggal berlaku |

### Pengiriman

| Modul | Fungsi |
|---|---|
| Pengiriman Reguler (DO) | Penyusunan muatan per nomor bal, surat jalan, dan status pengiriman |
| Pengiriman Sample | Pengiriman contoh mutu ke laboratorium pabrik dan hasil ujinya |
| Status & Detail Batch | Pemantauan batch sortir pembeli dan realisasi delivery order |

### Laporan dan administrasi

| Modul | Fungsi |
|---|---|
| Dashboard Analytic | Ringkasan eksekutif, distribusi grade, dan tren pembelian |
| Laporan Bal, Kode Bal, Mutu Grade | Analisis stok dan valuasi per kategori |
| Laporan Pembelian, Petani, Pengiriman | Rekapitulasi dengan filter dinamis dan unduhan Excel siap cetak |
| Manajemen Pengguna | Pembuatan akun staf, penetapan peran, reset kata sandi, dan jejak audit |

## Peran pengguna dan hak akses

Kontrol akses berbasis peran diterapkan pada setiap modul. Pengguna yang membuka modul di luar
wewenangnya dikembalikan ke beranda disertai pemberitahuan, termasuk ketika modul terakhir
tersimpan dari sesi sebelumnya.

| Peran | Cakupan wewenang |
|---|---|
| Super Admin | Seluruh modul, termasuk manajemen pengguna dan jejak audit |
| Admin Sortir | Sortir mutu grade dan pengiriman sample |
| Admin Timbang | Penimbangan bal dan transaksi pembelian |
| Admin Kasir | Pembayaran, nota timbang, dan laporan pembelian |
| Admin Pengiriman | Delivery order, surat jalan, dan status batch |
| Kepala Gudang | Seluruh laporan, dashboard analitik, dan status batch |

Berganti akun dilakukan melalui logout lalu login kembali. Tidak tersedia jalur pintas
pergantian akun tanpa kata sandi.

## Aturan bisnis utama

**Potongan tara berdasarkan berat bruto.** Nilai tara ditentukan bertingkat mengikuti berat
bruto bal, dengan pengecualian khusus untuk bal bertanda SB.

| Kondisi berat bruto | Potongan tara |
|---|---|
| Bal bertanda SB | 2 kg |
| Sampai dengan 49 kg | 3 kg |
| 50 kg sampai 59 kg | 5 kg |
| 60 kg ke atas | 6 kg |

**Potongan biaya per bal.** Kuli Rp 7.000, tali Rp 3.000, dan ganti tikar Rp 75.000 bila
dipilih pada transaksi.

**Berat tidak pernah dibulatkan.** Nilai berat bruto, tara, dan netto disimpan serta
ditampilkan apa adanya sampai tiga angka di belakang koma. Sistem hanya membersihkan galat
presisi bilangan pecahan komputer, misalnya hasil pengurangan `15,75 - 3` dicatat tepat
`12,75` dan bukan `12,749999999999998`.

**Harga jual boleh di bawah harga beli.** Sistem tidak memblokir penetapan harga jual yang
lebih rendah dari harga beli, karena kondisi tersebut sah pada kesepakatan khusus atau
penghabisan stok.

**Batas berat bal SB.** Bal bertanda SB ditolak bila melebihi 50 kg.

**Petani nonaktif.** Petani yang dinonaktifkan tidak lagi muncul pada pilihan penyetor di loket
sortir, sehingga tidak dapat masuk ke antrian timbang. Seluruh riwayat transaksinya tetap
tersimpan dan tetap muncul pada laporan. Alasan penonaktifan dicatat pada jejak audit.

## Menjalankan di komputer lokal

Prasyarat: Node.js versi 20 atau lebih baru.

Pasang dependensi.

```bash
npm install
```

Jalankan server pengembangan pada port 3000.

```bash
npm run dev
```

Periksa tipe tanpa menghasilkan berkas keluaran.

```bash
npm run lint
```

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

Unggah seluruh isi `dist/` ke web server atau layanan hosting statis. Karena aplikasi
menggunakan satu halaman, konfigurasikan server agar setiap permintaan yang tidak cocok dengan
berkas nyata diarahkan ke `index.html`.

Contoh konfigurasi Nginx.

```nginx
server {
    listen 80;
    server_name erp.sekarmajusejahtera.co.id;
    root /var/www/erp/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|woff2|png|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Gunakan HTTPS pada lingkungan produksi. Aplikasi menghitung hash kata sandi memakai Web Crypto
API yang hanya tersedia pada konteks aman, yaitu HTTPS atau `localhost`.

## Penggunaan perdana

Instalasi baru tidak membawa data contoh apa pun. Seluruh master data dan transaksi dimulai
dari nol, dan hanya tersedia satu akun bawaan.

| Kolom | Nilai |
|---|---|
| Username | `Sekarmajuadmin` |
| Kata sandi awal | `Supersekar25` |
| Peran | Super Admin |

Urutan penyiapan yang disarankan.

1. Login memakai akun Super Admin di atas.
2. **Ganti kata sandi Super Admin** melalui Manajemen Pengguna, menu Reset Kata Sandi.
3. Buat akun staf sesuai peran masing-masing, satu akun untuk satu orang.
4. Isi Master Harga Beli dan Master Harga Jual beserta tanggal berlakunya.
5. Daftarkan petani secara manual atau lewat Import Data (salin tempel dari Excel) pada Master Petani.
6. Mulai operasi harian dari modul Sortir.

Kata sandi disimpan sebagai hash SHA-256, tidak pernah dalam bentuk teks biasa. Sistem tidak
menyediakan pemulihan kata sandi mandiri, sehingga reset hanya dapat dilakukan oleh Super Admin.

## Pencadangan dan pemulihan data

Karena data berada di peramban, pencadangan berkala adalah tanggung jawab operasional dan
harus dijadwalkan.

- **Master Petani** menyediakan ekspor Excel melalui tombol Import / Export.
- **Modul laporan** menyediakan unduhan rekap Excel (.xlsx) untuk keperluan arsip dan audit.
- Simpan hasil unduhan pada penyimpanan terpisah, misalnya server berkas kantor.

Hal yang menyebabkan data hilang permanen dan perlu dihindari.

- Menghapus data situs atau riwayat peramban pada mesin operasional.
- Menjalankan aplikasi dalam mode penyamaran atau jendela privat.
- Berganti peramban atau profil pengguna sistem operasi.
- Menaikkan versi skema penyimpanan tanpa ekspor terlebih dahulu. Versi skema didefinisikan
  pada konstanta `STORAGE_VERSION` di `src/utils/storage.ts`.

## Struktur proyek

```
src/
├── App.tsx                  Komposisi aplikasi, routing modul, dan penjagaan sesi
├── config/appInfo.ts        Identitas rilis: nama, versi, dan nomor build
├── components/
│   ├── auth/                Halaman login
│   ├── Header.tsx           Bilah atas, profil pengguna, dan logout
│   ├── Sidebar.tsx          Navigasi modul
│   ├── petani/              Master petani, kartu petani, impor dan ekspor
│   ├── harga/               Master harga beli
│   ├── harga_jual/          Master harga jual
│   ├── transaksi/           Sortir, timbang, kasir, nota, dan koreksi transaksi
│   ├── pengiriman/          Delivery order dan surat jalan
│   ├── sample/              Pengiriman sample dan evaluasi mutu
│   ├── laporan/             Dashboard analitik dan seluruh laporan
│   ├── user/                Manajemen pengguna, matriks peran, dan jejak audit
│   ├── print/               Tampilan cetak mandiri
│   └── common/              Komponen bersama seperti modal dan paginasi
├── data/                    Data bawaan instalasi, seluruhnya kosong kecuali akun Super Admin
├── hooks/                   Hook khusus, antara lain pemindai barcode
├── types/                   Definisi tipe domain
└── utils/
    ├── storage.ts           Baca dan tulis localStorage, otentikasi, serta jejak audit
    ├── rbac.ts              Definisi peran dan pemeriksaan hak akses
    ├── crypto.ts            Hash kata sandi SHA-256
    ├── formatters.ts        Format angka, tanggal, dan penanganan presisi berat
    ├── financialCalculations.ts  Perhitungan nilai transaksi
    ├── kuponSortir.ts       Aturan kupon terbuka Sortir dan Timbangan
    ├── excelExport.ts       Ekspor laporan Excel (.xlsx) siap cetak
    └── printDownload.ts     Ekspor PDF
```

## Catatan keamanan

Batasan berikut melekat pada arsitektur aplikasi dan perlu ditutup dengan prosedur operasional.

- **Otorisasi berjalan di sisi klien.** Pengguna dengan akses ke peralatan pengembang peramban
  dapat membaca dan mengubah data lokal. Batasi akses fisik ke komputer operasional dan
  kunci sesi sistem operasi saat ditinggalkan.
- **Sesi berakhir otomatis setelah 30 menit tanpa aktivitas.** Pengguna harus login ulang.
- **Seluruh halaman berada di balik autentikasi,** termasuk tautan cetak mandiri berformat
  `?cetak=...`. Tanpa sesi yang sah, halaman login yang ditampilkan.
- **Jejak audit mencatat aktivitas penting** dan hanya dapat dibaca oleh Super Admin.
- Gunakan satu akun untuk satu orang. Akun bersama membuat jejak audit kehilangan maknanya.

---

Hak Cipta © 2026 PR. SEKAR MAJU SEJAHTERA, Pamekasan, Madura, Jawa Timur.
Perangkat lunak internal perusahaan, bukan untuk distribusi publik.

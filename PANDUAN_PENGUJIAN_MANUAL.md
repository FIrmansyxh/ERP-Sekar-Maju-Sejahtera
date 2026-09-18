# Laporan Integrasi & Panduan Pengecekan Manual (Tahap 1)

Dokumen ini memuat ringkasan perubahan teknis integrasi API Frontend (`ERP-Sekar-Maju-Sejahtera`) ke Backend (`ERP-Sekar-Maju-Sejahtera-BE`), serta panduan langkah demi langkah untuk pengujian fungsional secara manual.

---

## 1. Status Pekerjaan & Lingkungan Saat Ini

- **Status Git**: Semua perubahan masih berada di lokal (`unstaged / uncommitted`). **Belum ada commit maupun push/deploy** ke server/Git repository.
- **Frontend Server**: Berjalan di terminal lokal via `npm run dev` (Vite, default `http://localhost:5173`).
- **Backend Server**: Berjalan di terminal lokal via `php artisan serve` (default `http://127.0.0.1:8000`).
- **Kompilasi TypeScript**: Lolos pemeriksaan (`npx tsc --noEmit` exit code 0 tanpa error).
- **Route API**: 36 rute endpoint API Backend aktif dan tervalidasi.

---

## 2. Berkas yang Diperbarui (Lokal)

### A. Frontend (`ERP-Sekar-Maju-Sejahtera`)
1. **`src/services/erpApi.ts`**:
   - Menambahkan method sinkronisasi API:
     - `saveHargaBeli(newPrice)`: Mengirim perubahan harga beli ke `/api/v1/master/harga-beli`.
     - `updateBarang(barang)`: Mengirim update status stok & catatan ke `/api/v1/barang/{id}/status`.
     - `getBatchSampleList()` & `saveBatchSample(batch)`: Mengambil dan menyimpan pengiriman batch sample ke `/api/v1/sample-batch`.
     - `getPengirimanList()` & `savePengiriman(pengiriman)`: Mengambil dan menyimpan Delivery Order (DO) ke `/api/v1/pengiriman`.
2. **`src/App.tsx`**:
   - Menghubungkan proses inisialisasi aplikasi dengan `getBatchSampleList` dan `getPengirimanList` saat user login.
   - Menghubungkan handler UI form:
     - `handleSaveNewPrice` -> `ErpApiService.saveHargaBeli`
     - `handleUpdateBarang` -> `ErpApiService.updateBarang`
     - `handleSaveBatchSample` -> `ErpApiService.saveBatchSample`
     - `handleSaveNewPengiriman` -> `ErpApiService.savePengiriman`

### B. Backend (`ERP-Sekar-Maju-Sejahtera-BE`)
1. **`app/Http/Controllers/Api/MasterDataController.php`**:
   - Penyesuaian `storeHarga` untuk melakukan `updateOrCreate` data harga beli per grade dan menonaktifkan harga lama dengan aman.
2. **`app/Http/Controllers/Api/BarangController.php`**:
   - Penyesuaian `updateStatus` agar dapat menerima pembaruan field `catatan` dan `status_stok`.
3. **`app/Http/Controllers/Api/SampleController.php`**:
   - Penggunaan user auth yang aman (`optional(auth('sanctum')->user())->user_id`) untuk mencegah 500 error bila token offline.
4. **`app/Http/Controllers/Api/PengirimanController.php`**:
   - Penggunaan user auth yang aman untuk pembuatan surat jalan / pengiriman DO.

---

## 3. Alur Pengecekan & Pengujian Manual (Step-by-Step)

Buka aplikasi di browser (misal: `http://localhost:5173`) dan buka **DevTools (F12) > tab Network** untuk memantau request HTTP.

---

### Pengujian 1: Master Data Harga Beli (Petani / Grade)
- **Tujuan**: Memastikan nominal harga beli tersimpan ke database backend dan tetap muncul setelah refresh.
- **Langkah Pengujian**:
  1. Masuk ke menu **Master Data** > pilih tab **Harga Beli**.
  2. Klik tombol **Tambah / Ubah Harga**, pilih salah satu grade (contoh: *Grade A* atau *Grade B*), lalu masukkan nominal baru (misal: `125000`).
  3. Klik tombol **Simpan**.
- **Kriteria Keberhasilan**:
  - Muncul dialog/notifikasi sukses.
  - Pada tab **Network (F12)**, terdapat request `POST /api/v1/master/harga-beli` dengan response HTTP status `200` atau `201`.
  - **Tekan F5 (Refresh browser)**: Pastikan nominal harga yang baru saja diinput tetap bernilai `125000` (tidak kembali ke nominal bawaan awal).

---
---

### Pengujian 3: Pengiriman Sample & Batch Sample
- **Tujuan**: Memastikan pembuatan batch sample tersimpan ke backend dan riwayatnya termuat dari API.
- **Langkah Pengujian**:
  1. Masuk ke menu **Sample & Grading** / **Pengiriman Sample**.
  2. Klik tombol **Buat Batch Baru / Kirim Sample**.
  3. Isi data batch (Nama Tujuan Pabrik, Tanggal, daftar sample/grade yang dikirim).
  4. Klik tombol **Simpan / Kirim**.
- **Kriteria Keberhasilan**:
  - Batch baru langsung bertambah pada daftar/riwayat batch sample.
  - Pada tab **Network (F12)**, terdapat request `POST /api/v1/sample-batch` dengan status HTTP `200` atau `201`.
  - **Tekan F5 (Refresh browser)**: Batch sample baru tersebut tetap muncul pada tabel riwayat (berhasil dimuat via `GET /api/v1/sample-batch`).

---

### Pengujian 4: Pengiriman Reguler (Delivery Order / Surat Jalan)
- **Tujuan**: Memastikan pembuatan pengiriman barang (DO) tersimpan ke database backend.
- **Langkah Pengujian**:
  1. Masuk ke menu **Pengiriman Barang / Delivery Order (DO)**.
  2. Klik **Buat Pengiriman Baru**.
  3. Isi data pengiriman: pilih nomor DO, tujuan/pembeli, nama supir / plat nomor, tanggal pengiriman, dan centang/pilih bal barang yang akan dikirim.
  4. Klik tombol **Konfirmasi & Simpan Pengiriman**.
- **Kriteria Keberhasilan**:
  - Data DO baru tercatat di tabel daftar pengiriman.
  - Pada tab **Network (F12)**, terdapat request `POST /api/v1/pengiriman` dengan status HTTP `200` atau `201`.
  - **Tekan F5 (Refresh browser)**: Data DO baru tersebut tetap ada di riwayat pengiriman (berhasil dimuat via `GET /api/v1/pengiriman`).

---

### Pengujian 5: Pengecekan Regresi Modul Sebelumnya (Opsional)
Untuk memastikan modul yang telah diintegrasikan sebelumnya tetap stabil:
1. **Manajemen Pengguna (User)**: Buat user baru di menu Pengguna, pastikan tersimpan ke `/api/v1/users` dan dapat login.
2. **Data Petani**: Tambah/edit data petani di menu Petani, pastikan tersimpan ke `/api/v1/petani`.
3. **Harga Jual Pabrik**: Perbarui harga jual di menu Master Data > Harga Jual, pastikan tersimpan ke `/api/v1/master/harga-jual`.

---

---

## 4. Hasil Kesimpulan Audit Konektivitas Keseluruhan Project

| Modul / Komponen | Status Backend | Verifikasi Network / Endpoint |
| :--- | :---: | :--- |
| **Backend Service & Database** | 🟢 **Terhubung** | `php artisan serve` aktif, PostgreSQL port 5432 aktif, `/health` status `ok`. |
| **Autentikasi (Login)** | 🟢 **Terhubung** | `POST /api/v1/auth/login` (Token Sanctum & User tersimpan). |
| **Master Petani** | 🟢 **Terhubung** | `GET /petani`, `POST /petani`, `PUT /petani/{id}`, `DELETE /petani/{id}`. |
| **Master Harga Beli** | 🟢 **Terhubung** | `GET /master/harga-beli`, `POST /master/harga-beli`. |
| **Master Harga Jual** | 🟢 **Terhubung** | `GET /master/harga-jual`, `POST /master/harga-jual`. |
| **Manajemen Pengguna (User)** | 🟢 **Terhubung** | `GET /users`, `POST /users`, `PUT /users/{id}`, `PUT /users/{id}/status`. |
| **Pengiriman Batch Sample** | 🟢 **Terhubung** | `GET /sample-batch`, `POST /sample-batch`. |
| **Pengiriman DO (Surat Jalan)**| 🟢 **Terhubung** | `GET /pengiriman`, `POST /pengiriman`. |
| **Transaksi Pembelian (Tahap 2)**| 🟢 **Terhubung Penuh** | `GET /transaksi`, `POST /transaksi/sortir`, `PUT /transaksi/{id}/timbang`, `PUT /transaksi/{id}/bayar`. |
| **Inventaris Bal Gudang** | 🟢 **Terhubung Penuh** | `GET /barang`, `PUT /barang/{id}/status`, auto-create bal saat pelunasan kasir. |

---

## 5. Alur Pengujian Transaksi Pembelian: Sortir -> Timbang -> Kasir (Tahap 2)

Langkah-langkah berikut digunakan untuk menguji integrasi transaksi pembelian end-to-end langsung dari UI frontend ke database server:

### Pengujian 6: Loket Sortir (Pendaftaran Kupon & Grade Bal)
- **Tujuan**: Memastikan kupon antrian sortir yang dibuat masuk ke tabel `transaksi_pembelian` dan `transaksi_item_bal` di backend.
- **Langkah Pengujian**:
  1. Masuk ke modul **Pembelian** > **Sortir Mutu Grade**.
  2. Pilih petani yang sudah terdaftar (contoh: *zaini*), isi nomor bal (misal: `1`), pilih grade (contoh: *30* atau *31*).
  3. Klik tombol **Simpan Kupon** / **Cetak Kupon Sortir**.
- **Kriteria Keberhasilan**:
  - Muncul toast notifikasi sukses (contoh: *Kupon KUP-... berhasil disimpan!*).
  - Pada tab **Network (F12)**, terdapat request `POST /api/v1/transaksi/sortir` berstatus HTTP `201 Created` dengan balikan objek `data` berisi `transaksi_id` resmi (misal `TRX-DDMMYYYY-XXX`).
  - Kupon otomatis muncul di antrean tunggu timbangan.

---

### Pengujian 7: Meja Timbangan (Pengisian Bruto, Tara, & Netto)
- **Tujuan**: Memastikan data timbangan bal diperbarui secara permanen di backend.
- **Langkah Pengujian**:
  1. Masuk ke modul **Pembelian** > **Meja Timbangan Bal**.
  2. Pilih transaksi kupon yang tadi dibuat di loket sortir.
  3. Masukkan **Berat Bruto** (misal: `55` kg), periksa potongan tara (misal: `5` kg), pastikan berat netto terhitung (`50` kg).
  4. Tentukan lokasi simpan (misal: *Blok A*), lalu klik tombol **Simpan Timbangan** / **Lanjut ke Kasir**.
- **Kriteria Keberhasilan**:
  - Pada tab **Network (F12)**, terdapat request `PUT /api/v1/transaksi/{id}/timbang` berstatus HTTP `200 OK`.
  - Field `berat_kg` dan `status_timbang` bal berubah menjadi `selesai_timbang`.

---

### Pengujian 8: Kasir & Pelunasan Pembelian
- **Tujuan**: Memastikan transaksi berhasil dilunasi dan bal tembakau secara otomatis dibuatkan record inventarisnya di tabel `barang` backend.
- **Langkah Pengujian**:
  1. Masuk ke modul **Pembelian** > **Kasir & Pembayaran**.
  2. Pilih transaksi yang sudah selesai ditimbang.
  3. Klik tombol **Proses Pembayaran / Bayar**.
  4. Pilih metode pembayaran (misal: *Cash* atau *Tunai*), pilih gudang tujuan (*Gudang Utama Pamekasan* / `PMK-01`), lalu klik tombol **Konfirmasi & Lunasi**.
- **Kriteria Keberhasilan**:
  - Pada tab **Network (F12)**, terdapat request `PUT /api/v1/transaksi/{id}/bayar` berstatus HTTP `200 OK`.
  - Status pembayaran berubah menjadi **LUNAS** (`status_pembayaran: lunas`) dan status tahap menjadi **LENGKAP**.
  - Nota pembayaran kasir dapat dicetak dengan nilai yang akurat.

---

### Pengujian 9: Verifikasi Stok Bal Masuk ke Inventaris Gudang
- **Tujuan**: Memastikan otomatisasi pembuatan stok bal di gudang dari transaksi kasir.
- **Langkah Pengujian**:
  1. Buka menu **Gudang / Bal Gudang** (Inventaris Bal).
  2. Periksa baris bal tembakau yang baru saja dilunasi dari kasir.
- **Kriteria Keberhasilan**:
  - Bal tersebut otomatis terdaftar dengan ID bal (misal: `BAL-...`), status **Tersedia / Di Gudang**, dan lokasi blok yang sesuai.
  - **Tekan F5 (Refresh Browser)**: Pastikan data transaksi di Kasir tetap berstatus **Lunas** dan bal di gudang tetap tersimpan (data berasal dari PostgreSQL backend, bukan hanya memori lokal sementara).

---

## 6. Langkah Selanjutnya

1. Lakukan verifikasi manual di browser mengikuti panduan **Pengujian 1 hingga 9** di atas.
2. Jika ada perilaku UI atau respon API yang perlu disesuaikan, laporkan nomor pengujian terkait untuk penyesuaian instan.
3. Setelah semua teruji dengan baik, project siap untuk dilakukan git commit & deploy.
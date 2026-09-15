# Bug Report — ERP Sekar Maju Sejahtera (2026-09-16-retest)

Sumber: eksekusi otomatis 110 test case (docs/E2E_Test_Execution_Result_2026-09-16-retest.md). Status Fixed/Deferred/Rejected mengikuti instruksi Product Owner 15-09-2026; kolom "Resolusi" menjelaskan perubahan kode yang dilakukan. Penomoran BUG-xxx dipakai agar tidak tertukar dengan DEF-xxx pada laporan QA 13–14 September 2026.

| ID | Severity | Modul | Judul | Test Case | Status |
|---|---|---|---|---|---|
| BUG-001 | Critical | Login & Otentikasi | "Ganti Akun Cepat" di menu profil memungkinkan role terendah (Admin Timbang) beralih menjadi Super Admin tanpa kata sandi | TC-AUTH-10 | Fixed |
| BUG-002 | Major | Cetak Dokumen | Halaman cetak nota (?cetak=nota&id=...) dapat dibuka tanpa login dan menampilkan data petani serta nominal pembayaran | TC-PRINT-10, TC-HOME-04 | Fixed |
| BUG-003 | Major | Data Petani | Nonaktifkan / Aktifkan petani tidak mengubah status (toast sukses tampil, data tetap aktif); petani nonaktif tetap bisa dipilih di Sortir | TC-PETANI-07, TC-PETANI-09 | Fixed |
| BUG-004 | Major | Manajemen User | Audit Trail tidak mencatat aksi Manajemen Pengguna (reset kata sandi, nonaktif/aktif, tambah/edit/hapus pengguna) | TC-USER-09 | Deferred |
| BUG-005 | Major | Data Barang/Tembakau | Filter Grade pada Inventaris Bal Gudang hanya berisi opsi A-F (hardcoded), sedangkan kode grade aktual numerik sehingga filter tidak berfungsi | TC-BARANG-07 | Open |
| BUG-006 | Major | Dashboard/Home | Seed data demo "Samsul Ansori" (46 bal acak, belum lunas) disuntik otomatis saat data kosong; ID petani seed (4 digit) merusak penomoran PTN-YYYY-XXX | TC-PETANI-03, TC-HOME-02 | Fixed |
| BUG-007 | Minor | Data Petani | Nomor HP tidak divalidasi formatnya: huruf diterima selama panjang >= 9 (form Petani) dan tanpa validasi (form Pengguna) | TC-PETANI-04, TC-USER-08 | Deferred |
| BUG-008 | Minor | Laporan & Rekap | Filter tanggal laporan menerima rentang terbalik (akhir < awal) tanpa pesan validasi | TC-LAPORAN-02 | Open |
| BUG-009 | Minor | Master Harga Jual | Master Harga Jual menerima harga jual di bawah harga beli terendah tanpa validasi margin minimum | TC-HARGA_JUAL-08 | Rejected |
| BUG-010 | Minor | Transaksi Pembelian & Penjualan | Berat netto dibulatkan ke 1 desimal (bruto 15.75 kg - tara 3 = 12.75 kg tersimpan 12.8 kg) | TC-TRANSAKSI-08 | Fixed |
| BUG-011 | Minor | Manajemen User | Form Tambah Pengguna terisi otomatis username "staf_N" dan kata sandi default "password123"; placeholder "Minimal 5 karakter" tidak konsisten dengan validasi 6 karakter | TC-USER-02 | Open |
| BUG-012 | Minor | Pengiriman/Distribusi | Status DO dapat diubah mundur tanpa pembatasan (Selesai -> Dimuat) via dropdown; nomor Surat Jalan hanya angka urut sederhana | TC-PENGIRIMAN-05, TC-PENGIRIMAN-03 | Open |
| BUG-013 | Minor | Transaksi Pembelian & Penjualan | Rincian audit pembayaran kasir mencatat "Status bayar: undefined -> lunas" karena transaksi dari Sortir tidak memiliki status_pembayaran awal | TC-TRANSAKSI-03 | Open |

## BUG-001 — "Ganti Akun Cepat" di menu profil memungkinkan role terendah (Admin Timbang) beralih menjadi Super Admin tanpa kata sandi

- **Severity / Priority:** Critical / High
- **Modul:** Login & Otentikasi
- **Test case terkait:** TC-AUTH-10
- **Lokasi kode (indikasi):** src/components/Header.tsx (blok "Quick Switch User"); src/App.tsx handleSwitchUser

**Langkah reproduksi**

1. Login sebagai admintimbang / timbang123.
2. Klik avatar akun di header.
3. Klik "Ganti Akun Cepat" lalu pilih @superadmin.
4. Amati sidebar.

**Hasil aktual**

Sesi langsung berganti menjadi Super Admin (menu Manajemen Pengguna tampil) tanpa diminta kata sandi.

**Hasil yang diharapkan**

Tidak ada cara berganti akun tanpa autentikasi.

**Root cause sementara**

Tombol dirender untuk semua pengguna dan handleSwitchUser menyimpan user tujuan sebagai sesi aktif tanpa authenticateUser.

**Rekomendasi**

Hapus fitur (dilakukan 15-09-2026).

**Status / Resolusi (Fixed, 2026-09-15):** Blok "Ganti Akun Cepat" di Header.tsx dan handleSwitchUser di App.tsx dihapus. Retest TC-AUTH-10: Pass.

## BUG-002 — Halaman cetak nota (?cetak=nota&id=...) dapat dibuka tanpa login dan menampilkan data petani serta nominal pembayaran

- **Severity / Priority:** Major / High
- **Modul:** Cetak Dokumen
- **Test case terkait:** TC-PRINT-10, TC-HOME-04
- **Lokasi kode (indikasi):** src/App.tsx: rute cetak dirender sebelum pemeriksaan sesi

**Langkah reproduksi**

1. Tanpa sesi login, buka http://localhost:3000/?cetak=nota&id=<transaksi_id lunas>.

**Hasil aktual**

Pratinjau nota tampil lengkap tanpa autentikasi.

**Hasil yang diharapkan**

Halaman login tampil; dokumen hanya dapat dibuka setelah login.

**Root cause sementara**

Urutan render menempatkan rute cetak di atas guard autentikasi.

**Rekomendasi**

Guard !currentUser dipindahkan ke sebelum rute cetak (dilakukan 15-09-2026).

**Status / Resolusi (Fixed, 2026-09-15):** Guard login kini mendahului semua rute termasuk ?cetak=...; sesi dengan user_id tidak terdaftar juga ditolak (loadCurrentUser). Retest TC-PRINT-10 & TC-HOME-04: Pass.

## BUG-003 — Nonaktifkan / Aktifkan petani tidak mengubah status (toast sukses tampil, data tetap aktif); petani nonaktif tetap bisa dipilih di Sortir

- **Severity / Priority:** Major / High
- **Modul:** Data Petani
- **Test case terkait:** TC-PETANI-07, TC-PETANI-09
- **Lokasi kode (indikasi):** src/components/petani/PetaniDeactivateModal.tsx (onConfirm mengirim objek Petani) vs src/App.tsx handleConfirmStatusToggle (mengharapkan petani_id string)

**Langkah reproduksi**

1. Master Petani > ikon Nonaktifkan Petani > Nonaktifkan.
2. Amati status & filter "Nonaktif Saja"; cek dropdown petani di Sortir.

**Hasil aktual**

Status tetap Aktif; petani masih muncul di Sortir.

**Hasil yang diharapkan**

Status berubah Nonaktif dan tidak dapat dipilih pada transaksi baru.

**Root cause sementara**

Ketidaksesuaian kontrak parameter antara modal dan handler.

**Rekomendasi**

Modal mengirim petani.petani_id (dilakukan 15-09-2026).

**Status / Resolusi (Fixed, 2026-09-15):** PetaniDeactivateModal kini memanggil onConfirm(petani.petani_id, reason). Retest TC-PETANI-07 & TC-PETANI-09: Pass.

## BUG-004 — Audit Trail tidak mencatat aksi Manajemen Pengguna (reset kata sandi, nonaktif/aktif, tambah/edit/hapus pengguna)

- **Severity / Priority:** Major / Medium
- **Modul:** Manajemen User
- **Test case terkait:** TC-USER-09
- **Lokasi kode (indikasi):** src/App.tsx: handleSaveUser, handleDeleteUser, handleToggleUserStatus, handleResetUserPassword tidak memanggil recordAuditLog

**Langkah reproduksi**

1. Manajemen Pengguna: reset sandi @adminkasir; nonaktifkan @kepalagudang.
2. Buka tab Audit Trail.

**Hasil aktual**

Tidak ada entri audit untuk kedua aksi.

**Hasil yang diharapkan**

Setiap aksi keamanan pada akun tercatat.

**Root cause sementara**

Handler user management tidak terintegrasi dengan recordAuditLog.

**Rekomendasi**

Tambahkan recordAuditLog pada handler user management.

**Status / Resolusi (Deferred):** Keputusan Product Owner 15-09-2026: dibiarkan (TC-USER-09 tetap Fail sebagai penanda).

## BUG-005 — Filter Grade pada Inventaris Bal Gudang hanya berisi opsi A-F (hardcoded), sedangkan kode grade aktual numerik sehingga filter tidak berfungsi

- **Severity / Priority:** Major / Medium
- **Modul:** Data Barang/Tembakau
- **Test case terkait:** TC-BARANG-07
- **Lokasi kode (indikasi):** src/components/barang/BarangManagement.tsx (opsi statis); datalist "Kode Beli" di LaporanPembelianBarangView.tsx

**Langkah reproduksi**

1. Inventaris Bal Gudang > dropdown filter Grade.

**Hasil aktual**

Opsi hanya A-F; kode aktual (30-70) tidak tersedia.

**Hasil yang diharapkan**

Opsi dibangkitkan dari Master Harga Beli / data inventaris.

**Root cause sementara**

Daftar opsi statis dari desain lama.

**Rekomendasi**

Bangkitkan opsi dari hargaList / distinct kode_grade.

**Status / Resolusi (Open):** Belum masuk instruksi perbaikan; masih Open.

## BUG-006 — Seed data demo "Samsul Ansori" (46 bal acak, belum lunas) disuntik otomatis saat data kosong; ID petani seed (4 digit) merusak penomoran PTN-YYYY-XXX

- **Severity / Priority:** Major / Medium
- **Modul:** Dashboard/Home
- **Test case terkait:** TC-PETANI-03, TC-HOME-02
- **Lokasi kode (indikasi):** src/seedSamsulAnsori.ts dipanggil dari App.tsx

**Langkah reproduksi**

1. Buka aplikasi dengan localStorage kosong, login, buka Kasir.

**Hasil aktual**

Transaksi demo bernilai > Rp 100 juta muncul; ID petani baru mis. PTN-2026-3679.

**Hasil yang diharapkan**

Tidak ada data fiktif pada instalasi produksi.

**Root cause sementara**

Fungsi seeding demo dipanggil tanpa syarat.

**Rekomendasi**

Hapus seed (dilakukan 15-09-2026).

**Status / Resolusi (Fixed, 2026-09-15):** seedSamsulAnsori.ts dihapus; seluruh data awal (petani, harga beli, harga jual, akun demo) dikosongkan; kunci storage dinaikkan ke _v32 agar data demo lama di browser terhapus. Retest TC-PETANI-03 & TC-HOME-02: Pass.

## BUG-007 — Nomor HP tidak divalidasi formatnya: huruf diterima selama panjang >= 9 (form Petani) dan tanpa validasi (form Pengguna)

- **Severity / Priority:** Minor / Medium
- **Modul:** Data Petani
- **Test case terkait:** TC-PETANI-04, TC-USER-08
- **Lokasi kode (indikasi):** PetaniFormModal.tsx validate(); UserFormModal.tsx

**Langkah reproduksi**

1. Master Petani > Tambah: HP "abcdefghij".
2. Manajemen Pengguna > Tambah: HP "abcde".

**Hasil aktual**

Tersimpan dengan nomor HP berisi huruf.

**Hasil yang diharapkan**

Hanya digit yang diterima.

**Root cause sementara**

Validasi hanya memeriksa panjang string.

**Rekomendasi**

Regex numerik pada kedua form.

**Status / Resolusi (Deferred):** Keputusan Product Owner 15-09-2026: dibiarkan (TC-PETANI-04 & TC-USER-08 tetap Fail sebagai penanda).

## BUG-008 — Filter tanggal laporan menerima rentang terbalik (akhir < awal) tanpa pesan validasi

- **Severity / Priority:** Minor / Low
- **Modul:** Laporan & Rekap
- **Test case terkait:** TC-LAPORAN-02
- **Lokasi kode (indikasi):** LaporanPembelianBarangView.tsx handleSearch (dan laporan lain)

**Langkah reproduksi**

1. Laporan Pembelian: Tanggal Dari 2026-09-15, Sampai 2026-09-01, Cari Data.

**Hasil aktual**

Tabel kosong tanpa penjelasan.

**Hasil yang diharapkan**

Pesan validasi rentang tidak valid.

**Root cause sementara**

Tidak ada validasi rentang tanggal.

**Rekomendasi**

Validasi rentang pada submit filter.

**Status / Resolusi (Open):** Belum masuk instruksi perbaikan; masih Open.

## BUG-009 — Master Harga Jual menerima harga jual di bawah harga beli terendah tanpa validasi margin minimum

- **Severity / Priority:** Minor / Low
- **Modul:** Master Harga Jual
- **Test case terkait:** TC-HARGA_JUAL-08
- **Lokasi kode (indikasi):** HargaJualManagement.tsx handleSaveForm

**Langkah reproduksi**

1. Master Harga Jual > Tambah Master: kode HJ-LOW, harga 1000.

**Hasil aktual**

Tersimpan dan aktif.

**Hasil yang diharapkan**

(Awal) peringatan bila harga jual < harga beli.

**Root cause sementara**

Tidak ada aturan margin di form.

**Rekomendasi**

-

**Status / Resolusi (Rejected):** Keputusan Product Owner 15-09-2026: bukan defect. Harga jual memang boleh lebih murah (kesepakatan khusus / menghabiskan stok). Test disesuaikan; retest TC-HARGA_JUAL-08: Pass.

## BUG-010 — Berat netto dibulatkan ke 1 desimal (bruto 15.75 kg - tara 3 = 12.75 kg tersimpan 12.8 kg)

- **Severity / Priority:** Minor / Low
- **Modul:** Transaksi Pembelian & Penjualan
- **Test case terkait:** TC-TRANSAKSI-08
- **Lokasi kode (indikasi):** TimbanganPageView.tsx liveNetto/liveTara/total (toFixed(1)); TransaksiEditModal, NotaTimbangContent, KasirPageView total; formatters.formatNumber

**Langkah reproduksi**

1. Timbangan: isi bruto 15.75, simpan.

**Hasil aktual**

Netto tersimpan 12.8 kg.

**Hasil yang diharapkan**

Berat tidak dibulatkan (12.75 kg).

**Root cause sementara**

Pembulatan toFixed(1) pada netto & total.

**Rekomendasi**

Hapus pembulatan (dilakukan 15-09-2026).

**Status / Resolusi (Fixed, 2026-09-15):** Semua pembulatan berat dihapus; penjumlahan memakai normalizeKg (hanya membersihkan noise floating-point pada 3 desimal, di atas ketelitian timbangan 0.01 kg); formatNumber menampilkan desimal asli hingga 3 digit. Retest TC-TRANSAKSI-08: Pass (netto 12.75 kg, total 573.750).

## BUG-011 — Form Tambah Pengguna terisi otomatis username "staf_N" dan kata sandi default "password123"; placeholder "Minimal 5 karakter" tidak konsisten dengan validasi 6 karakter

- **Severity / Priority:** Minor / Low
- **Modul:** Manajemen User
- **Test case terkait:** TC-USER-02
- **Lokasi kode (indikasi):** UserFormModal.tsx useEffect & placeholder

**Langkah reproduksi**

1. Manajemen Pengguna > Tambah Pengguna; amati nilai awal field.

**Hasil aktual**

Kata sandi lemah terisi otomatis.

**Hasil yang diharapkan**

Field kata sandi kosong; teks bantuan sesuai aturan.

**Root cause sementara**

Nilai default pengembangan tertinggal.

**Rekomendasi**

Hapus default password; samakan placeholder.

**Status / Resolusi (Open):** Belum masuk instruksi perbaikan; masih Open (TC-USER-02 Pass karena hanya observasi).

## BUG-012 — Status DO dapat diubah mundur tanpa pembatasan (Selesai -> Dimuat) via dropdown; nomor Surat Jalan hanya angka urut sederhana

- **Severity / Priority:** Minor / Low
- **Modul:** Pengiriman/Distribusi
- **Test case terkait:** TC-PENGIRIMAN-05, TC-PENGIRIMAN-03
- **Lokasi kode (indikasi):** StatusBatchPengirimanManagement.tsx select status; formatters.generateNoSuratJalanSimple

**Langkah reproduksi**

1. Terbitkan DO, Status Pengiriman Barang: Berangkat, Tiba, Selesai, lalu dropdown "Dimuat".

**Hasil aktual**

Status kembali ke dimuat; nomor surat jalan "1".

**Hasil yang diharapkan**

Transisi mundur dibatasi; nomor berformat dokumen.

**Root cause sementara**

Tidak ada state machine; generator nomor disederhanakan.

**Rekomendasi**

Tetapkan aturan transisi & format nomor bersama PO.

**Status / Resolusi (Open):** Belum masuk instruksi perbaikan; masih Open (observasi, test Pass).

## BUG-013 — Rincian audit pembayaran kasir mencatat "Status bayar: undefined -> lunas" karena transaksi dari Sortir tidak memiliki status_pembayaran awal

- **Severity / Priority:** Minor / Low
- **Modul:** Transaksi Pembelian & Penjualan
- **Test case terkait:** TC-TRANSAKSI-03
- **Lokasi kode (indikasi):** SortirPageView.tsx handleSaveSortirData; App.tsx diffSummary

**Langkah reproduksi**

1. Sortir 1 bal, timbang, bayar di Kasir.
2. Audit Trail: entri UBAH_TRANSAKSI pembayaran.

**Hasil aktual**

Rincian berisi literal "undefined".

**Hasil yang diharapkan**

Nilai sebelum "belum_lunas".

**Root cause sementara**

status_pembayaran tidak diinisialisasi di Sortir.

**Rekomendasi**

Set status_pembayaran "belum_lunas" pada finalTx Sortir.

**Status / Resolusi (Open):** Belum masuk instruksi perbaikan; masih Open (TC-TRANSAKSI-03 Fail hanya pada asersi ini; alur & kalkulasi Pass).

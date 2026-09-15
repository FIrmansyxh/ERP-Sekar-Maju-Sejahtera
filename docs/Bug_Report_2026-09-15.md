# Bug Report — ERP Sekar Maju Sejahtera (2026-09-15)

Sumber: eksekusi otomatis 110 test case (docs/E2E_Test_Execution_Result_2026-09-15.md). Root cause bersifat sementara berdasarkan analisis kode; tidak ada perubahan pada src/. Penomoran BUG-xxx dipakai agar tidak tertukar dengan DEF-xxx pada laporan QA 13–14 September 2026.

| ID | Severity | Modul | Judul | Test Case | Status |
|---|---|---|---|---|---|
| BUG-001 | Critical | Login & Otentikasi | "Ganti Akun Cepat" di menu profil memungkinkan role terendah (Admin Timbang) beralih menjadi Super Admin tanpa kata sandi | TC-AUTH-10 | Open |
| BUG-002 | Major | Cetak Dokumen | Halaman cetak nota (?cetak=nota&id=...) dapat dibuka tanpa login dan menampilkan data petani serta nominal pembayaran | TC-PRINT-10 | Open |
| BUG-003 | Major | Data Petani | Nonaktifkan / Aktifkan petani tidak mengubah status (toast "berhasil diperbarui" tampil, data tetap aktif); petani nonaktif tetap bisa dipilih di Sortir | TC-PETANI-07, TC-PETANI-09 | Open |
| BUG-004 | Major | Manajemen User | Audit Trail tidak mencatat aksi Manajemen Pengguna (reset kata sandi, nonaktif/aktif, tambah/edit/hapus pengguna) | TC-USER-09 | Open |
| BUG-005 | Major | Data Barang/Tembakau | Filter Grade pada Inventaris Bal Gudang hanya berisi opsi A-F (hardcoded), sedangkan kode grade aktual bersifat numerik (30-70) sehingga filter tidak berfungsi | TC-BARANG-07 | Open |
| BUG-006 | Major | Dashboard/Home | Seed data demo "Samsul Ansori" (46 bal, bobot & ganti tikar acak, belum lunas) disuntik otomatis setiap aplikasi dibuka saat data kosong; ID petani yang dihasilkan (4 digit dari timestamp) merusak penomoran PTN-YYYY-XXX berikutnya (intermiten: pada 3 dari 4 eksekusi TC-PETANI-03 ID baru menjadi 4 digit, mis. PTN-2026-3679) | TC-PETANI-03, TC-HOME-02 | Open |
| BUG-007 | Minor | Data Petani | Nomor HP tidak divalidasi formatnya: huruf diterima selama panjang >= 9 (form Petani) dan tanpa validasi sama sekali (form Pengguna) | TC-PETANI-04, TC-USER-08 | Open |
| BUG-008 | Minor | Laporan & Rekap | Filter tanggal Laporan Pembelian menerima rentang terbalik (tanggal akhir < tanggal awal) tanpa pesan validasi; hasil hanya tabel kosong | TC-LAPORAN-02 | Open |
| BUG-009 | Minor | Master Harga Jual | Master Harga Jual menerima harga jual di bawah harga beli terendah (Rp 1.000) tanpa validasi margin minimum | TC-HARGA_JUAL-08 | Open |
| BUG-010 | Minor | Transaksi Pembelian & Penjualan | Berat netto dibulatkan ke 1 desimal (bruto 15.75 kg - tara 3 = 12.75 kg tersimpan 12.8 kg) sementara input bruto 2 desimal diterima, sehingga nilai bayar berbeda dari perhitungan presisi | TC-TRANSAKSI-08 | Open |
| BUG-011 | Minor | Manajemen User | Form Tambah Pengguna terisi otomatis username "staf_N" dan kata sandi default "password123"; placeholder "Minimal 5 karakter" tidak konsisten dengan validasi minimal 6 karakter | TC-USER-02 | Open |
| BUG-012 | Minor | Pengiriman/Distribusi | Status DO dapat diubah mundur tanpa pembatasan (Selesai -> Dimuat) melalui dropdown, dan nomor Surat Jalan hanya berupa angka urut sederhana ("1", "2") tanpa format dokumen | TC-PENGIRIMAN-05, TC-PENGIRIMAN-03 | Open |
| BUG-013 | Minor | Transaksi Pembelian & Penjualan | Rincian audit pembayaran kasir mencatat "Status bayar: undefined -> lunas" karena transaksi dari Sortir tidak memiliki status_pembayaran awal (regresi DEF-004 laporan sebelumnya) | TC-TRANSAKSI-03 | Open |

## BUG-001 — "Ganti Akun Cepat" di menu profil memungkinkan role terendah (Admin Timbang) beralih menjadi Super Admin tanpa kata sandi

- **Severity / Priority:** Critical / High
- **Modul:** Login & Otentikasi
- **Test case terkait:** TC-AUTH-10
- **Lokasi kode (indikasi):** src/components/Header.tsx (blok "Quick Switch User" hanya dicek onSwitchUser && allUsers.length > 1, tidak dicek role); src/App.tsx handleSwitchUser (langsung setCurrentUser tanpa autentikasi)

**Langkah reproduksi**

1. Login sebagai admintimbang / timbang123.
2. Klik avatar akun di header.
3. Klik "Ganti Akun Cepat" lalu pilih @superadmin.
4. Amati sidebar.

**Hasil aktual**

Sesi langsung berganti menjadi Super Admin (menu Manajemen Pengguna tampil) tanpa diminta kata sandi. Semua role dapat melakukannya.

**Hasil yang diharapkan**

Fitur ganti akun tidak tersedia untuk role non-admin, atau selalu meminta kata sandi akun tujuan.

**Root cause sementara**

Tombol "Ganti Akun Cepat" dirender untuk semua pengguna dan handler handleSwitchUser menyimpan user tujuan sebagai sesi aktif tanpa memanggil authenticateUser.

**Rekomendasi**

Batasi tombol ke mode DEV (import.meta.env.DEV) atau hapus; jika tetap dibutuhkan, wajibkan verifikasi kata sandi akun tujuan dan catat di audit trail.

**Bukti:** test-results/artifacts/01-auth-*Ganti-Akun-Cepat*/test-failed-1.png

## BUG-002 — Halaman cetak nota (?cetak=nota&id=...) dapat dibuka tanpa login dan menampilkan data petani serta nominal pembayaran

- **Severity / Priority:** Major / High
- **Modul:** Cetak Dokumen
- **Test case terkait:** TC-PRINT-10
- **Lokasi kode (indikasi):** src/App.tsx: blok "if (printParam) return <DedicatedPrintView .../>" dieksekusi sebelum pemeriksaan "if (!currentUser) return <LoginView/>"

**Langkah reproduksi**

1. Pastikan ada transaksi lunas di data (mis. hasil TC-PRINT-03).
2. Logout / buka browser tanpa sesi.
3. Buka http://localhost:3000/?cetak=nota&id=<transaksi_id>.

**Hasil aktual**

Pratinjau "Surat Bukti Timbang & Nota Pembelian" tampil lengkap (nama petani, kupon, nominal, tombol Download PDF) tanpa autentikasi.

**Hasil yang diharapkan**

Pengguna tanpa sesi diarahkan ke halaman login; dokumen hanya bisa dibuka setelah login dengan role berwenang.

**Root cause sementara**

Urutan render di App.tsx menempatkan rute cetak di atas guard autentikasi.

**Rekomendasi**

Pindahkan guard !currentUser sebelum rute cetak, atau tampilkan LoginView lalu lanjut ke dokumen setelah login.

**Bukti:** test-results/artifacts/11-print-*tanpa-login*/test-failed-1.png

## BUG-003 — Nonaktifkan / Aktifkan petani tidak mengubah status (toast "berhasil diperbarui" tampil, data tetap aktif); petani nonaktif tetap bisa dipilih di Sortir

- **Severity / Priority:** Major / High
- **Modul:** Data Petani
- **Test case terkait:** TC-PETANI-07, TC-PETANI-09
- **Lokasi kode (indikasi):** src/components/petani/PetaniDeactivateModal.tsx (handleConfirm memanggil onConfirm(petani, reason) dengan objek Petani) vs src/App.tsx handleConfirmStatusToggle(petaniId: string, reason) yang membandingkan p.petani_id === petaniId

**Langkah reproduksi**

1. Login superadmin > Master Petani.
2. Klik ikon "Nonaktifkan Petani" pada salah satu baris, klik "Nonaktifkan".
3. Amati badge status dan filter "Nonaktif Saja"; buka Sortir dan cari petani tsb.

**Hasil aktual**

Toast "Status keaktifan petani berhasil diperbarui." tampil, tetapi status tetap Aktif (status_aktif=true), filter Nonaktif kosong, petani masih muncul di dropdown Sortir.

**Hasil yang diharapkan**

Status berubah menjadi Nonaktif, tampil pada filter Nonaktif, dan tidak dapat dipilih pada transaksi baru.

**Root cause sementara**

Ketidaksesuaian kontrak parameter: modal mengirim objek Petani sementara handler mengharapkan string ID sehingga map() tidak pernah cocok.

**Rekomendasi**

Samakan signature (kirim petani.petani_id dari modal atau terima objek di App) dan tambahkan pengujian regresi.

**Bukti:** test-results/artifacts/03-petani-*filter-status-aktif-nonaktif*/test-failed-1.png

## BUG-004 — Audit Trail tidak mencatat aksi Manajemen Pengguna (reset kata sandi, nonaktif/aktif, tambah/edit/hapus pengguna)

- **Severity / Priority:** Major / Medium
- **Modul:** Manajemen User
- **Test case terkait:** TC-USER-09
- **Lokasi kode (indikasi):** src/App.tsx: handleSaveUser, handleDeleteUser, handleToggleUserStatus, handleResetUserPassword tidak memanggil recordAuditLog

**Langkah reproduksi**

1. Login superadmin > Manajemen Pengguna.
2. Reset kata sandi @adminkasir; nonaktifkan @kepalagudang.
3. Buka tab "Audit Trail & Log Aktivitas".

**Hasil aktual**

Tidak ada entri audit untuk kedua aksi (log hanya berisi aksi transaksi).

**Hasil yang diharapkan**

Setiap aksi keamanan pada akun pengguna tercatat (user, role, aksi, target, waktu).

**Root cause sementara**

Handler user management tidak terintegrasi dengan recordAuditLog (utils/storage.ts).

**Rekomendasi**

Tambahkan recordAuditLog pada seluruh handler user management.

## BUG-005 — Filter Grade pada Inventaris Bal Gudang hanya berisi opsi A-F (hardcoded), sedangkan kode grade aktual bersifat numerik (30-70) sehingga filter tidak berfungsi

- **Severity / Priority:** Major / Medium
- **Modul:** Data Barang/Tembakau
- **Test case terkait:** TC-BARANG-07
- **Lokasi kode (indikasi):** src/components/barang/BarangManagement.tsx baris ~120-126 (opsi statis); pola serupa pada datalist "Kode Beli" di src/components/laporan/LaporanPembelianBarangView.tsx

**Langkah reproduksi**

1. Login superadmin > Inventaris Bal Gudang.
2. Buka dropdown filter Grade.
3. Pilih "Grade A (Super)".

**Hasil aktual**

Opsi hanya A-F; tidak satu pun kode grade aktual (30-70) tersedia, hasil filter kosong.

**Hasil yang diharapkan**

Opsi filter dibangkitkan dari Master Harga Beli / kode grade yang ada di data.

**Root cause sementara**

Daftar opsi filter ditulis statis dari desain lama (Grade A-F) dan tidak disinkronkan dengan skema kode harga beli numerik.

**Rekomendasi**

Bangkitkan opsi dari hargaList / distinct kode_grade barangList.

## BUG-006 — Seed data demo "Samsul Ansori" (46 bal, bobot & ganti tikar acak, belum lunas) disuntik otomatis setiap aplikasi dibuka saat data kosong; ID petani yang dihasilkan (4 digit dari timestamp) merusak penomoran PTN-YYYY-XXX berikutnya (intermiten: pada 3 dari 4 eksekusi TC-PETANI-03 ID baru menjadi 4 digit, mis. PTN-2026-3679)

- **Severity / Priority:** Major / Medium
- **Modul:** Dashboard/Home
- **Test case terkait:** TC-PETANI-03, TC-HOME-02
- **Lokasi kode (indikasi):** src/seedSamsulAnsori.ts (petani_id = PTN-<tahun>-<4 digit Date.now()>, Math.random untuk bobot/tikar); dipanggil dari src/App.tsx useEffect awal

**Langkah reproduksi**

1. Buka aplikasi dengan localStorage kosong (browser baru) dan login.
2. Buka Kasir: terdapat transaksi 46 bal a.n. Samsul Ansori berstatus belum lunas.
3. Tambah petani baru dan amati ID yang dihasilkan.

**Hasil aktual**

Transaksi demo bernilai > Rp 100 juta muncul tanpa input pengguna; ID petani baru menjadi mis. PTN-2026-3679 (bukan PTN-2026-036).

**Hasil yang diharapkan**

Tidak ada data transaksi fiktif pada instalasi produksi; ID petani berurutan 3 digit sesuai spesifikasi.

**Root cause sementara**

Fungsi seeding demo dipanggil tanpa syarat di App.tsx dan membuat ID dari timestamp.

**Rekomendasi**

Hapus/batasi seed ke mode DEV atau tombol "Reset ke data demo"; gunakan generatePetaniId untuk ID seed.

## BUG-007 — Nomor HP tidak divalidasi formatnya: huruf diterima selama panjang >= 9 (form Petani) dan tanpa validasi sama sekali (form Pengguna)

- **Severity / Priority:** Minor / Medium
- **Modul:** Data Petani
- **Test case terkait:** TC-PETANI-04, TC-USER-08
- **Lokasi kode (indikasi):** src/components/petani/PetaniFormModal.tsx validate() (hanya cek length < 9); src/components/user/UserFormModal.tsx (tidak ada validasi no_hp)

**Langkah reproduksi**

1. Master Petani > Tambah: nama valid, HP "abcdefghij", alamat valid > Simpan.
2. Manajemen Pengguna > Tambah: HP "abcde" > Daftarkan.

**Hasil aktual**

Kedua data tersimpan dengan nomor HP berisi huruf.

**Hasil yang diharapkan**

Hanya digit (dengan format Indonesia) yang diterima; pesan validasi jelas.

**Root cause sementara**

Validasi hanya memeriksa panjang string.

**Rekomendasi**

Tambahkan regex numerik (mis. /^0\d{8,14}$/) pada kedua form.

## BUG-008 — Filter tanggal Laporan Pembelian menerima rentang terbalik (tanggal akhir < tanggal awal) tanpa pesan validasi; hasil hanya tabel kosong

- **Severity / Priority:** Minor / Low
- **Modul:** Laporan & Rekap
- **Test case terkait:** TC-LAPORAN-02
- **Lokasi kode (indikasi):** src/components/laporan/LaporanPembelianBarangView.tsx handleSearch/appliedFilters (tidak ada pemeriksaan startDate <= endDate); pola sama di Laporan Bal/Petani/Pengiriman

**Langkah reproduksi**

1. Laporan Pembelian: Tanggal Dari 2026-09-15, Tanggal Sampai 2026-09-01, klik Cari Data.

**Hasil aktual**

Tabel menampilkan "Tidak ada data transaksi yang cocok" tanpa penjelasan bahwa rentang tidak valid.

**Hasil yang diharapkan**

Pesan validasi "Tanggal akhir tidak boleh lebih awal dari tanggal awal" dan filter tidak diterapkan (sesuai sheet Test_Data).

**Root cause sementara**

Tidak ada validasi rentang tanggal sebelum filter diterapkan.

**Rekomendasi**

Validasi rentang pada submit filter di seluruh laporan.

## BUG-009 — Master Harga Jual menerima harga jual di bawah harga beli terendah (Rp 1.000) tanpa validasi margin minimum

- **Severity / Priority:** Minor / Low
- **Modul:** Master Harga Jual
- **Test case terkait:** TC-HARGA_JUAL-08
- **Lokasi kode (indikasi):** src/components/harga_jual/HargaJualManagement.tsx handleSaveForm (hanya cek > 0); kode harga jual tidak memiliki relasi ke kode harga beli

**Langkah reproduksi**

1. Master Harga Jual > Tambah Master: kode HJ-LOW, harga 1000 > Simpan Data.

**Hasil aktual**

Tersimpan dan aktif; dapat dipilih pada DO sehingga keuntungan negatif.

**Hasil yang diharapkan**

Peringatan/penolakan bila harga jual < harga beli acuan (Test_Data: "Validasi margin minimum").

**Root cause sementara**

Tidak ada aturan bisnis margin di form; skema kode jual dan beli terpisah.

**Rekomendasi**

Tambahkan peringatan konfirmasi bila harga jual < min harga beli aktif, atau relasikan kode jual ke grade beli.

## BUG-010 — Berat netto dibulatkan ke 1 desimal (bruto 15.75 kg - tara 3 = 12.75 kg tersimpan 12.8 kg) sementara input bruto 2 desimal diterima, sehingga nilai bayar berbeda dari perhitungan presisi

- **Severity / Priority:** Minor / Low
- **Modul:** Transaksi Pembelian & Penjualan
- **Test case terkait:** TC-TRANSAKSI-08
- **Lokasi kode (indikasi):** src/components/transaksi/TimbanganPageView.tsx: liveNetto = Number((liveBruto - liveTara).toFixed(1)); input bruto step="0.1" tidak dipaksakan

**Langkah reproduksi**

1. Timbangan: pilih bal, isi bruto 15.75, simpan.

**Hasil aktual**

Netto tampil/tersimpan 12.8 kg; total_kotor = 12.8 x harga (selisih 0.05 kg x harga).

**Hasil yang diharapkan**

Presisi konsisten: tolak input di luar 0.1 kg atau hitung netto tanpa pembulatan tambahan.

**Root cause sementara**

Pembulatan toFixed(1) pada netto tanpa pembatasan presisi input bruto.

**Rekomendasi**

Batasi input bruto ke 1 desimal (validasi step) atau simpan netto dengan presisi yang sama dengan input.

## BUG-011 — Form Tambah Pengguna terisi otomatis username "staf_N" dan kata sandi default "password123"; placeholder "Minimal 5 karakter" tidak konsisten dengan validasi minimal 6 karakter

- **Severity / Priority:** Minor / Low
- **Modul:** Manajemen User
- **Test case terkait:** TC-USER-02
- **Lokasi kode (indikasi):** src/components/user/UserFormModal.tsx useEffect (setUsername(`staf_${nextNum}`), setPassword("password123")); placeholder vs handleSubmit (length < 6)

**Langkah reproduksi**

1. Manajemen Pengguna > Tambah Pengguna; amati nilai awal field.

**Hasil aktual**

Kata sandi lemah terisi otomatis dan bisa langsung disimpan; teks bantuan menyebut 5 karakter.

**Hasil yang diharapkan**

Field kata sandi kosong (wajib diisi admin) dan teks bantuan sesuai aturan (6 karakter).

**Root cause sementara**

Nilai default pengembangan tertinggal di form produksi.

**Rekomendasi**

Hapus default password; samakan placeholder dengan validasi.

## BUG-012 — Status DO dapat diubah mundur tanpa pembatasan (Selesai -> Dimuat) melalui dropdown, dan nomor Surat Jalan hanya berupa angka urut sederhana ("1", "2") tanpa format dokumen

- **Severity / Priority:** Minor / Low
- **Modul:** Pengiriman/Distribusi
- **Test case terkait:** TC-PENGIRIMAN-05, TC-PENGIRIMAN-03
- **Lokasi kode (indikasi):** src/components/pengiriman/StatusBatchPengirimanManagement.tsx (select status langsung memanggil onUpdatePengirimanStatus); src/utils/formatters.ts generateNoSuratJalanSimple

**Langkah reproduksi**

1. Terbitkan DO, buka Status & Detail Batch > tab Status Pengiriman Barang.
2. Klik Berangkat, Tiba, Selesai lalu ubah dropdown ke "Dimuat (Akan Kirim)".
3. Amati nomor surat jalan pada DO.

**Hasil aktual**

Status kembali ke dimuat tanpa konfirmasi/audit; nomor surat jalan "1".

**Hasil yang diharapkan**

Transisi mundur dibatasi/dikonfirmasi & tercatat; nomor surat jalan berformat dokumen (mis. SJ-YYYYMMDD-001 / PGR-0001 sesuai Test_Data).

**Root cause sementara**

Tidak ada mesin status (state machine) untuk DO; generator nomor disederhanakan.

**Rekomendasi**

Terapkan aturan transisi status & format nomor dokumen yang disepakati PO.

## BUG-013 — Rincian audit pembayaran kasir mencatat "Status bayar: undefined -> lunas" karena transaksi dari Sortir tidak memiliki status_pembayaran awal (regresi DEF-004 laporan sebelumnya)

- **Severity / Priority:** Minor / Low
- **Modul:** Transaksi Pembelian & Penjualan
- **Test case terkait:** TC-TRANSAKSI-03
- **Lokasi kode (indikasi):** src/components/transaksi/SortirPageView.tsx handleSaveSortirData (finalTx tanpa status_pembayaran); src/App.tsx handleSaveTransaksi diffSummary

**Langkah reproduksi**

1. Sortir 1 bal, timbang, bayar di Kasir.
2. Buka Audit Trail, lihat entri UBAH_TRANSAKSI pembayaran.

**Hasil aktual**

Rincian perubahan berisi literal "undefined".

**Hasil yang diharapkan**

Nilai sebelum "belum_lunas".

**Root cause sementara**

status_pembayaran tidak diinisialisasi saat transaksi dibuat di Sortir.

**Rekomendasi**

Set status_pembayaran: "belum_lunas" pada finalTx Sortir, atau fallback pada diffSummary.

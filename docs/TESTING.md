# Quality Assurance & Testing Strategy
**Project:** Sistem Manajemen Gudang Tembakau
**Document Owner:** QA Engineer
**Version:** 1.0.0

## 1. Fokus Pengujian (Test Strategy)
Fokus QA adalah pada **Integritas Data Transaksi** dan **Validasi Alur Kerja (Workflow)**, mengingat ini adalah aplikasi sistem manajemen gudang yang berkaitan langsung dengan uang dan barang nyata.

## 2. Test Cases Utama (Critical Scenarios)

### Modul Petani
- **TC-001 (Positif):** Mendaftarkan petani baru dengan mengisi seluruh field wajib. Pastikan "ID Petani" otomatis terbuat dengan format `PTN-YYYY-XXX`.
- **TC-002 (Negatif):** Import CSV petani dengan ID Petani yang sudah ada di database. Sistem **harus menolak** row tersebut dengan keterangan "ID Petani sudah dipakai".
- **TC-003 (Validasi):** Melakukan "Nonaktif" Petani. Petani yang nonaktif tidak boleh muncul di dropdown saat Operator Loket membuat transaksi baru.

### Modul Transaksi & Kasir
- **TC-004 (Akurasi Netto):**
  - *Input:* Bruto: 50.0 Kg, Ganti Tikar: Ya (Potongan Tara = 3 Kg).
  - *Expected Result:* Netto harus = 47.0 Kg.
- **TC-005 (Akurasi Pembayaran):**
  - *Kondisi:* Netto = 47.0 Kg. Harga Grade A = Rp 50.000. Potongan kuli + tali + tikar = Rp 85.000.
  - *Expected Result:* Kotor = Rp 2.350.000. Total Bersih = Rp 2.265.000.
- **TC-006 (End-to-End Workflow):**
  - Buat transaksi di *Loket* -> Timbang -> Simpan & Cetak Kupon.
  - Pindah ke tab *Kasir*, panggil kupon tersebut, lakukan *Bayar*.
  - *Expected:* Status transaksi menjadi "lunas", status stok menjadi "di_gudang".

### Modul Laporan & Analitik
- **TC-007 (Validasi Reaktivitas Data):**
  - Tambahkan transaksi baru sebesar 50.0 Kg (Netto).
  - Buka *Dashboard Analytics* dan *Laporan Petani*.
  - *Expected:* Total Tonase Masuk secara agregat bertambah persis 50.0 Kg. Valuasi aset bertambah sesuai (Netto * Harga Beli).
- **TC-008 (Handling Edge-Case UI):**
  - Filter rentang tanggal (Date Range) ke tanggal di mana tidak ada transaksi.
  - *Expected:* Laporan harus menampilkan *Empty State* yang rapi ("Tidak ada data"), aplikasi tidak boleh *crash*.

## 3. Catatan Temuan & Penyelesaian (Resolved Issues)
- **Bug Fix #1:** `TypeError: Cannot read properties of undefined (reading 'toFixed')` di Laporan Analitik Gudang. *Root Cause:* Data objek *Grade Dominan* belum lengkap, tapi fungsi `.toFixed()` sudah dieksekusi. *Resolution:* Developer telah merestrukturisasi logic `useMemo` sehingga UI aman dari render-crash (Diimplementasikan pada PR sebelumnya).
- **Bug Fix #2:** Redundansi "Nomor Kartu" dan "ID Petani". *Resolution:* "Nomor Kartu" sepenuhnya dimusnahkan. Saat ini Sistem 100% menggunakan 1 entitas identitas yaitu **ID Petani**.

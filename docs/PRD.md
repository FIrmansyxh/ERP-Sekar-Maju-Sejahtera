# Product Requirements Document (PRD)
**Project:** Sistem Manajemen Gudang Tembakau
**Document Owner:** Product Manager
**Version:** 1.0.0

## 1. Visi & Objektif Produk
Mengembangkan sistem informasi terintegrasi untuk digitalisasi rantai pasok pembelian tembakau dari petani hingga penyimpanan dan pengiriman ke pabrik. Sistem ini bertujuan untuk:
- Meningkatkan akurasi penimbangan dan perhitungan harga beli tembakau.
- Mempercepat pelayanan di loket penerimaan dan kasir.
- Menyediakan transparansi data stok (live stock) dan laporan analitik (tonase, grade, valuasi) secara real-time.

## 2. Target Pengguna (User Personas)
1. **Operator Loket:** Bertanggung jawab memindai ID Petani, menimbang berat bruto, menentukan grade, dan mencatat potongan tara (tikar).
2. **Kasir:** Melakukan validasi akhir transaksi, memotong biaya kuli/tali, dan melakukan pembayaran tunai/transfer ke petani.
3. **Admin Gudang:** Mengelola penempatan bal tembakau, konsolidasi pengiriman (Surat Jalan), dan mengawasi stok aktif di gudang.
4. **Pemilik/Manajemen (Owner):** Memantau dashboard analitik, laporan distribusi grade, performa petani, dan profitabilitas.

## 3. Ruang Lingkup Fitur Utama
### 3.1 Manajemen Petani (Single Identity)
- **Registrasi & ID Petani:** Setiap petani memiliki 1 ID Petani tunggal (format: `PTN-YYYY-XXX`) yang terhubung dengan barcode fisik. Menghapus sistem duplikasi "Nomor Kartu" lama.
- **Manajemen Status:** Pengaktifan dan penonaktifan ID Petani.
- **Import/Export:** Mendukung migrasi data petani massal via CSV.

### 3.2 Modul Transaksi (Penerimaan Tembakau)
- **Timbangan Real-time:** Kalkulasi otomatis Netto (Bruto - Tara).
- **Penentuan Harga:** Otomatis menyesuaikan harga berdasarkan input *Grade* (A, B, C, dsb) dari Master Barang.
- **Potongan Biaya:** Kalkulasi otomatis untuk potongan kuli, tali, dan tikar.

### 3.3 Modul Gudang & Pengiriman
- **Master Barang:** Pengelolaan Grade tembakau, harga beli, dan persentase target penjualan.
- **Surat Jalan (DO):** Pencetakan dokumen pengiriman ke pabrik (Outbound).

### 3.4 Pelaporan & Dashboard (Analytics)
- **Laporan Petani:** Mengetahui petani penyetor terbesar (Top Contributors).
- **Laporan Grade:** Mengetahui distribusi persentase kualitas tembakau (Grade Dominan).
- **Laporan Transaksi & Keuangan:** Melacak arus kas (total pembelian vs valuasi stok).

## 4. Metrik Keberhasilan (Success Metrics)
- **Waktu Layanan Loket:** < 2 menit per petani.
- **Akurasi Data:** 0% selisih antara perhitungan sistem vs perhitungan manual untuk Netto dan Total Harga.
- **Zero-Redundancy:** Tidak ada duplikasi ID Petani berkat validasi ketat di frontend.

# Sistem Manajemen Gudang Tembakau (Warehouse Management System)

Aplikasi *enterprise* modern berbasis web untuk mengelola rantai pasok pembelian tembakau, mulai dari registrasi petani, penerimaan di loket timbangan, pembayaran kasir, manajemen stok (gudang), hingga pengiriman ke pabrik.

## 🚀 Fitur Utama
1. **Identitas Tunggal Petani:** Seluruh petani menggunakan satu **ID Petani** yang terhubung langsung dengan *barcode scanner* untuk mencegah duplikasi data.
2. **Loket & Timbangan Otomatis:** Sistem yang terintegrasi secara logika untuk kalkulasi berat Bruto, Tara (Tikar), dan Netto secara *real-time*.
3. **Pembayaran Kasir Akurat:** Perhitungan otomatis subtotal harga dengan potongan operasional (kuli, tali, tikar).
4. **Dashboard & Analitik Real-Time:** Menampilkan agregasi tonase, valuasi aset, grade kualitas unggulan, dan daftar petani penyetor terbesar.

## 📁 Dokumentasi Proyek (Tim Pengembang)
Sistem ini disusun mengikuti standar kerja profesional yang dipetakan oleh tim:
- 📑 **[Product Requirements Document (PRD)](./docs/PRD.md)** - Disusun oleh *Product Manager*, memuat visi, ruang lingkup fitur, dan metrik kesuksesan aplikasi.
- 🏗️ **[Architecture & Technical Design](./docs/ARCHITECTURE.md)** - Disusun oleh *Fullstack Developer*, memuat panduan struktur folder, tech stack, *state management*, dan konvensi *clean code*.
- 🧪 **[QA & Testing Strategy](./docs/TESTING.md)** - Disusun oleh *Quality Assurance*, memuat *test cases* (skenario pengujian utama) untuk memastikan integritas data uang dan berat komoditas tidak pernah keliru.

## 💻 Tech Stack
- **Frontend Framework:** React 18 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide-React
- **Charts:** Recharts

## 🛠️ Cara Menjalankan Aplikasi (Lokal)
1. Pastikan Anda telah menginstal Node.js.
2. Lakukan clone repositori.
3. Jalankan `npm install` untuk mengunduh dependencies.
4. Jalankan `npm run dev` untuk memulai *development server*.
5. Buka `http://localhost:5173` di browser Anda (atau port yang diberikan oleh Vite).

---
*Dibangun dengan struktur dan dokumentasi yang ditujukan untuk skalabilitas industri tingkat lanjut.*

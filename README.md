<div align="center">
  <h1>🍃 Sistem Manajemen Gudang Tembakau</h1>
  <p><strong>Enterprise-Grade Warehouse Management System (WMS) for Tobacco Supply Chain</strong></p>
  
  [![React](https://img.shields.io/badge/React-18.x-blue?style=flat-square&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
  [![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
</div>

<br />

Sistem Manajemen Gudang Tembakau adalah aplikasi *web-based* terintegrasi yang dirancang khusus untuk mendigitalisasi proses rantai pasok (supply chain) pembelian tembakau. Sistem ini menjembatani seluruh alur operasional mulai dari registrasi petani, proses penimbangan di loket, pembayaran di kasir, manajemen inventori gudang, hingga pengiriman *(Delivery Order)* ke pabrik utama.

---

## 🌟 Fitur Utama & Modul Sistem

Aplikasi ini dibagi menjadi beberapa subsistem untuk memastikan pemisahan tugas (Segregation of Duties) yang jelas antar pengguna:

### 1. 🧑‍🌾 Manajemen Petani (Single Identity System)
- **ID Petani Tunggal:** Menerapkan sistem identitas unik (`PTN-YYYY-XXX`) yang terintegrasi dengan pemindai *barcode* untuk mencegah redudansi dan duplikasi data.
- **Penerbitan & Reset Kartu:** Mendukung pencetakan ID card fisik (PDF) dan fitur reset ID jika kartu hilang dengan *audit trail* keamanan.
- **Import/Export Data:** Mendukung migrasi massal (bulk import) data petani menggunakan format `.csv`.

### 2. ⚖️ Loket Penerimaan (Weighing Station)
- **Pemindai Barcode (Barcode Scanner Ready):** Operator cukup memindai kartu fisik petani untuk memanggil data seketika.
- **Kalkulasi Berat Otomatis:** Menghitung Netto secara presisi secara *real-time* (Bruto dikurangi potongan Tara seperti berat tikar).
- **Auto-Pricing Berdasarkan Grade:** Harga beli per kilogram otomatis terisi berdasarkan kualitas *Grade* (A, B, C, dsb) yang telah diatur oleh Manajemen Pusat.

### 3. 💰 Modul Kasir & Keuangan
- **Validasi Transaksi:** Kasir dapat meninjau kupon masuk sebelum melakukan eksekusi pembayaran.
- **Auto-Deduction (Potongan Otomatis):** Sistem menghitung otomatis potongan biaya operasional seperti biaya kuli dan tali.
- **Cetak Bukti Bayar:** Menghasilkan nota timbang dan bukti pembayaran yang dapat dicetak (Print/PDF) untuk diberikan kepada petani.

### 4. 📦 Manajemen Gudang & Logistik
- **Live Inventory Tracking:** Melacak status bal tembakau secara *real-time* (Misal: "Di Gudang", "Terkirim", "Sortir").
- **Delivery Order (Surat Jalan):** Modul untuk mengonsolidasi bal tembakau yang siap dikirim, menugaskan armada/supir, dan mencetak Surat Jalan resmi.

### 5. 📊 Dashboard & Analitik (Business Intelligence)
- **Real-Time Metrik:** Memantau Total Tonase (Kg), Jumlah Bal, dan Valuasi Aset yang ada di gudang.
- **Distribusi Grade:** Visualisasi data interaktif menggunakan *Recharts* untuk melihat persebaran persentase kualitas tembakau yang dibeli.
- **Top Contributors:** Peringkat petani penyetor terbesar untuk keperluan program loyalitas atau prioritas layanan.

---

## 🏗️ Arsitektur & Teknologi

Proyek ini dibangun dengan fokus pada performa, *type-safety*, dan antarmuka yang ramah pengguna.

- **Frontend Framework:** React 18
- **Build Engine:** Vite (Super-fast HMR & optimized production build)
- **Bahasa:** TypeScript (Strict Mode untuk mencegah *runtime errors*)
- **Styling:** Tailwind CSS (Mobile-first & Utility-first)
- **Icons & UI:** Lucide React
- **Charts:** Recharts (SVG-based charting library)

Untuk melihat panduan arsitektur yang lebih mendalam, kunjungi ➡️ **[Architecture & Technical Design](./docs/ARCHITECTURE.md)**

---

## 📂 Struktur Direktori

Kode sumber (Source Code) diorganisasikan menggunakan pola *Feature-Based Modules* agar terstruktur dengan rapi:

```text
src/
├── components/          # Kumpulan modul bisnis dan UI
│   ├── barang/          # Konfigurasi Master Grade & Harga
│   ├── home/            # Layout utama & Dashboard
│   ├── laporan/         # Modul Analitik, Tabel Laporan & Visualisasi
│   ├── operator/        # UI khusus untuk Operator Loket
│   ├── pengiriman/      # Manajemen Surat Jalan (Outbound)
│   ├── petani/          # CRUD Petani & Manajemen Barcode
│   ├── transaksi/       # Modul Kasir & Validasi
│   └── user/            # Sistem Peran & Akses (RBAC)
├── types/               # Global TypeScript Interfaces (Data Models)
├── utils/               # Helper, Formatters, & PDF Generator
└── App.tsx              # Root Component & Router Simulator
```

---

## 🛠️ Panduan Instalasi (Getting Started)

Ikuti langkah-langkah berikut untuk menjalankan aplikasi ini di lingkungan lokal (Local Development):

**1. Prasyarat:**
Pastikan Node.js (v18+) dan `npm` telah terinstal di mesin Anda.

**2. Clone Repositori:**
```bash
git clone <url-repositori-anda>
cd nama-folder-proyek
```

**3. Instalasi Dependensi:**
```bash
npm install
```

**4. Jalankan Development Server:**
```bash
npm run dev
```
Aplikasi akan berjalan di `http://localhost:5173` (atau port lain yang diinfokan di terminal).

**5. Build untuk Produksi:**
```bash
npm run build
```

---

## 📑 Dokumentasi Lanjutan

Tim pengembang menyertakan dokumen spesifikasi lengkap untuk mempermudah transfer *knowledge* dan pemeliharaan:

1. 🎯 **[Product Requirements Document (PRD)](./docs/PRD.md)** - Cakupan fitur bisnis, target pengguna, dan metrik keberhasilan.
2. 🏛️ **[Technical Architecture](./docs/ARCHITECTURE.md)** - Desain teknis aplikasi, konvensi penulisan kode, dan manajemen status.
3. 🧪 **[Testing Strategy](./docs/TESTING.md)** - Skenario pengujian QA (Quality Assurance) untuk memastikan integritas logika uang dan berat komoditas.

---
*Developed with ❤️ to modernize the agricultural supply chain.*

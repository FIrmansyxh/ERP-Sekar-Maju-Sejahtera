# Architecture & Technical Design
**Project:** Sistem Manajemen Gudang Tembakau
**Document Owner:** Fullstack Developer
**Version:** 1.0.0

## 1. Tech Stack
- **Framework:** React 18 (Client-side SPA)
- **Build Tool:** Vite
- **Language:** TypeScript (Strict Mode enabled)
- **Styling:** Tailwind CSS (Utility-first, responsive, mobile-first approach)
- **Icons:** Lucide React
- **Data Visualization:** Recharts

## 2. Struktur Direktori (Folder Structure)
Sistem menggunakan pendekatan *Feature-Based Folder Structure* yang memisahkan kode berdasarkan modul bisnis agar *scalable* dan mudah dikelola tim:

```text
src/
├── components/          # Kumpulan UI Components & Feature Modules
│   ├── barang/          # Modul Master Barang & Grade
│   ├── home/            # Dashboard & Home Layout
│   ├── laporan/         # Modul Analitik & Laporan (Keuangan, Petani, Grade)
│   ├── operator/        # UI Khusus Operator Loket & Timbangan
│   ├── pengiriman/      # Modul Pengiriman & Surat Jalan
│   ├── petani/          # Manajemen Data Petani (Registrasi, ID, Import CSV)
│   ├── transaksi/       # Modul Transaksi & Kasir
│   └── user/            # Manajemen User & Role Access
├── data/                # Data Mockup / Dummy Generator (maduraDatasetGenerator)
├── types/               # Global TypeScript Interfaces (Petani, Transaksi, Barang)
├── utils/               # Helper Functions (Formatters, Data Parsers, PDF Printers)
├── App.tsx              # Main Application Root & Router Simulator
├── index.css            # Global Tailwind Entry
└── main.tsx             # React DOM Rendering Entry
```

## 3. State Management & Performa
- **React Hooks:** Mengandalkan `useState` untuk local state dan komponen Form.
- **Memoization (`useMemo`, `useCallback`):** Diterapkan secara ekstensif pada perhitungan Laporan Analitik (ex: kalkulasi agregasi Total Tonase, Distribusi Grade) untuk mencegah *re-render* yang mahal (terutama saat dataset `maduraDatasetGenerator` menghasilkan ribuan baris).
- **Simulated Database Context:** Saat ini state dibagikan (di-lift) ke level `App.tsx` agar modul Transaksi dan Modul Laporan memiliki akses ke *single source of truth*. Nantinya ini siap diganti (drop-in replacement) dengan Context API / Redux / Zustand atau dihubungkan ke REST API.

## 4. Standar Kode & Konvensi
- **Strict Typing:** Seluruh objek harus memiliki Interface/Type (terdefinisi di `src/types/index.ts`). Penggunaan `any` dihindari.
- **Clean UI (Anti-Slop):** Tidak menggunakan *nested cards* berlapis, menghindari gradients berlebihan. Memanfaatkan *white space*, *border-radius* matematis, dan warna *cool neutral* (Tailwind Slate/Gray) agar cocok untuk *B2B Warehouse App*.
- **Desimal & Pembulatan:** Seluruh kalkulasi berat `kg` menggunakan `Number(value.toFixed(1))` untuk standarisasi 1 angka di belakang koma (akurasi timbangan industri). Uang menggunakan `.toLocaleString('id-ID')`.

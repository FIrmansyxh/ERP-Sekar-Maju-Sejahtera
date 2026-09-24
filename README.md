# ERP PT. Sekar Maju Sejahtera (Frontend + Backend)

Branch `erp-fe-be` menyatukan frontend dan backend dalam satu repositori, dengan susunan yang sama seperti folder
kerja `ERP FE-BE`:

| Folder | Isi |
|---|---|
| `ERP-Sekar-Maju-Sejahtera-FE/` | Frontend React + TypeScript + Vite (sebelumnya isi branch `staging` repositori ini) |
| `ERP-Sekar-Maju-Sejahtera-BE/` | Backend Laravel 10 + PostgreSQL (sebelumnya repositori `ERP-Sekar-Maju-Sejahtera-BE`) |

Perubahan utama di branch ini: server menjadi satu-satunya sumber data sehingga tambah, ubah, dan hapus terlihat sama
di semua komputer dan akun, termasuk di laporan. Rinciannya ada di
`ERP-Sekar-Maju-Sejahtera-FE/DOKUMENTASI_DATABASE.md` bagian 5.5 dan 10.

## Menjalankan di komputer lokal

Backend (PHP 8.2, PostgreSQL 16):

```bash
cd ERP-Sekar-Maju-Sejahtera-BE
composer install
cp .env.example .env          # isi koneksi database, lalu: php artisan key:generate
php artisan erp:perbarui-skema
php artisan db:seed
php artisan serve
```

Frontend (Node.js 20+):

```bash
cd ERP-Sekar-Maju-Sejahtera-FE
npm ci
npm run dev
```

## Deploy

Backend harus diperbarui lebih dulu dan menjalankan `php artisan erp:perbarui-skema` (menerapkan
`database/schema/schema.sql`, aman diulang), baru kemudian frontend. Workflow GitHub Actions masing-masing ada di
`<folder>/.github/workflows/` dan tidak aktif dari subfolder; pindahkan ke `.github/workflows/` di root bila branch ini
dipakai untuk deploy.

## Pengujian

- Frontend: `npm test` di folder FE.
- Backend: `php vendor/bin/phpunit` di folder BE (memakai database uji `erp_sekar_maju_uji`, lihat `phpunit.xml`).
- Uji dua komputer terhadap backend sungguhan: `npx vite-node scripts/uji-dua-perangkat/jalankan.ts` di folder FE
  (lihat keterangan di berkas itu).

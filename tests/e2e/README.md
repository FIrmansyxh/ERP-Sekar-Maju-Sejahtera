# E2E / Black-box Test Suite (Playwright)

Suite ini menurunkan 110 test case dari `ERP_SekarMajuSejahtera_Test_Report.xlsx` (11 modul x 10 skenario)
menjadi pengujian otomatis terhadap UI aplikasi yang berjalan di dev server Vite.

## Menjalankan

```bash
npm run test:e2e            # menjalankan seluruh suite (dev server dijalankan otomatis di port 3000)
npx playwright test tests/e2e/07-transaksi.spec.ts   # satu modul
npx playwright test -g "TC-AUTH-03"                  # satu test case
npm run test:e2e:report     # membuka laporan HTML (test-results/html-report)
```

Prasyarat: `npm install` sudah dijalankan dan browser Chromium Playwright terpasang (`npx playwright install chromium`).

## Struktur

| Path | Isi |
|---|---|
| `helpers/app.ts` | Fixture `test`/`app`: login, navigasi sidebar, helper Sortir/Timbang/Kasir, dialog handler, stub `window.print` |
| `helpers/store.ts` | Baca/tulis localStorage aplikasi (kompresi lz-string) untuk verifikasi & penyuntikan data uji |
| `helpers/factory.ts` | Pembuat data transaksi/bal/DO deterministik sesuai aturan tara & potongan |
| `01-auth.spec.ts` .. `11-print.spec.ts` | Satu file per modul, satu `test()` per Test_ID (judul diawali `TC-<MODUL>-NN`) |

## Data uji

Aplikasi produksi tidak membawa data demo (hanya akun `Sekarmajuadmin`). Fixture `app` menyuntik dataset QA ke
localStorage sebelum halaman dimuat (`helpers/app.ts`, `fixtures/`): 7 akun uji (`superadmin/admin123`, dst.),
34 petani, 41 kode harga beli & jual, dan 1 transaksi lunas 6 bal. `app.resetToCleanInstall()` mensimulasikan
instalasi bersih; `app.reseedQaData()` menyuntik ulang.

## Prinsip

- Setiap test memakai browser context baru (localStorage kosong + dataset QA), sehingga hasil deterministik.
- Verifikasi dilakukan dari perilaku UI dan data yang benar-benar tersimpan (black-box), tanpa mengubah `src/`.
- Kegagalan yang tersisa pada eksekusi 15-09-2026 adalah temuan aplikasi (lihat `docs/Bug_Report_2026-09-15.md`);
  test sengaja dibiarkan gagal sebagai bukti regresi sampai defect diperbaiki.

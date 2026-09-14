# Dokumen Persiapan End-to-End (E2E) Testing
## Sistem Manajemen Gudang Tembakau — ERP Sekar Maju Sejahtera

| Item | Detail |
|---|---|
| Nama Sistem | Sistem Manajemen Gudang Tembakau (ERP Sekar Maju Sejahtera) |
| Jenis Aplikasi | Single Page Application (SPA) — React 19 + TypeScript + Vite |
| Repository | https://github.com/FIrmansyxh/ERP-Sekar-Maju-Sejahtera |
| Jenis Dokumen | Test Preparation / Test Plan untuk End-to-End Testing |
| Disusun oleh | QA Lead (Senior ERP QA) |
| Status | Draft untuk review tim QA & Product Owner |

---

## 1. Ringkasan & Tujuan

Dokumen ini adalah panduan persiapan pengujian End-to-End (E2E) untuk sistem ERP pengelolaan rantai pasok tembakau, mulai dari pendaftaran petani, penerimaan & sortir di loket, penimbangan, pembayaran kasir, manajemen stok gudang, pengiriman sample ke pembeli (buyer), hingga pengiriman barang (Delivery Order) ke pabrik, serta pelaporan & analitik bisnis.

Tujuan pengujian E2E:
1. Memastikan **alur bisnis utama (critical path)** — dari petani datang hingga barang terkirim ke pabrik dan tercatat sebagai profit — berjalan benar dari ujung ke ujung, lintas modul dan lintas peran (role).
2. Memvalidasi **akurasi perhitungan finansial** (harga, potongan, netto, subtotal, keuntungan) karena berdampak langsung pada pembayaran petani dan laporan keuangan.
3. Memvalidasi **kontrol akses berbasis peran (RBAC)** agar tiap peran hanya bisa mengakses modul dan melakukan aksi sesuai kewenangannya.
4. Memvalidasi **integritas & konsistensi data** antar entitas (Petani ↔ Transaksi ↔ Barang ↔ Sample ↔ Pengiriman) mengingat sistem ini **tidak memiliki backend/database server** — seluruh data disimpan di **localStorage browser** (client-side persistence).
5. Menemukan risiko/cacat sebelum rilis ke lingkungan produksi (gudang riil), karena sistem ini menangani transaksi keuangan nyata terhadap petani.

---

## 2. Karakteristik Arsitektur yang Mempengaruhi Strategi Pengujian

> Bagian ini WAJIB dibaca sebelum menyusun kasus uji, karena arsitektur sistem ini berbeda dari ERP berbasis server pada umumnya.

| Karakteristik | Implikasi terhadap Pengujian |
|---|---|
| **Tidak ada backend/API server.** Semua data (`Petani`, `Barang`, `TransaksiPembelian`, `PengirimanBarang`, `User`, dll.) disimpan di **`localStorage`** browser, dikompresi dengan `lz-string` ([storage.ts](../src/utils/storage.ts)). | Data **tidak sinkron antar perangkat/browser**. Uji harus dilakukan di **satu browser/profile yang sama** untuk satu skenario end-to-end. Uji eksplisit untuk kondisi *localStorage penuh (quota exceeded)*, *localStorage dibersihkan*, dan *mode Incognito/Private*. |
| Versi skema data memakai suffix key `_v31` (mis. `erp_tembakau_petani_v31`). | Saat rilis versi baru dengan migrasi skema, uji **migrasi data lama → baru** dan pastikan data versi sebelumnya tidak hilang/korup. |
| Sesi login disimpan di localStorage (`erp_tembakau_current_user_v31`, flag `erp_explicit_logout`), dengan **auto-heal**: jika sesi hilang tapi user aktif ada, sistem otomatis login sebagai superadmin/aktif pertama. | Uji skenario **refresh halaman**, **tutup-buka tab**, dan pastikan auto-heal tidak menjadi celah keamanan (auto-login tanpa kredensial pada kondisi tertentu). |
| Tidak ada backend, artinya **tidak ada rate-limiting/CAPTCHA/session-expiry server-side** — validasi login sepenuhnya di client. | Fokus pengujian keamanan bergeser ke: apakah password tersimpan **plaintext** di objek `User` dan localStorage (`password` field terlihat di storage.ts) — ini adalah **temuan risiko keamanan** yang harus dicatat, bukan diverifikasi sebagai fitur. |
| RBAC (hak akses per modul & kapabilitas) diterapkan **hanya di layer UI/state React** ([rbac.ts](../src/utils/rbac.ts), variabel `activeModuleId`). | Uji **RBAC bypass** via DevTools: ubah `localStorage.erp_tembakau_active_module` atau state React secara manual, dan pastikan render ulang tetap menghormati batasan role (tidak hanya menyembunyikan menu, tapi juga mencegah akses konten/aksi). |
| Fitur cetak (nota, kartu ID petani, surat jalan, label sample) menggunakan `jspdf`, `html2canvas`, `html-to-image` — dirender di client lalu di-*print*/download. | Uji cetak harus dilakukan di **browser nyata** (bukan hanya unit test), termasuk uji preview cetak, ukuran kertas, dan hasil unduhan PDF/gambar. |
| Import/Export data petani via `.csv`, laporan export via `xlsx`. | Uji format file, karakter khusus, file kosong/korup, dan duplikasi ID saat import. |
| Data pribadi: nomor HP petani/karyawan pada dataset dummy tampak seperti data nyata/mirip nyata. | Pastikan **tidak ada data pribadi asli** dipakai untuk lingkungan uji publik/staging; gunakan data anonim/dummy khusus QA. |

---

## 3. Ruang Lingkup Pengujian

### 3.1 Modul dalam Ruang Lingkup (In-Scope)
1. Autentikasi & Manajemen Sesi (Login/Logout)
2. RBAC — Kontrol Akses Berbasis Peran (6 role)
3. Manajemen Petani (`modul-1-petani`)
4. Master Data Harga Beli per Grade (`modul-3-harga`)
5. Master Data Harga Jual (`modul-3-harga-jual`)
6. Master Barang / Master Grade (`modul-2-barang`)
7. Alur Transaksi Pembelian: Sortir → Timbangan → Kasir (`modul-0-sortir`, `modul-0-timbangan`, `modul-0-kasir`, `modul-0-transaksi`)
8. Manajemen Sample & Evaluasi Buyer (`modul-4-sample`)
9. Status Batch Pengiriman Sample (`modul-status-batch`)
10. Pengiriman Barang / Delivery Order (`modul-5-pengiriman`)
11. Dashboard Analitik & Laporan (`modul-6-*`)
12. Manajemen User & Role Matrix (`modul-users`)
13. Audit Trail Log
14. Cetak/Ekspor dokumen (PDF, gambar, Excel, CSV)
15. Non-fungsional: performa data besar, storage, kompatibilitas browser, keamanan dasar, aksesibilitas dasar

### 3.2 Di Luar Ruang Lingkup (Out-of-Scope)
- Pengujian backend/API (karena tidak ada backend — kecuali fitur AI Gemini/Firebase bila diaktifkan, lihat catatan §9.7)
- Load testing skala industri (concurrent user sangat tinggi) — tidak relevan untuk arsitektur client-only
- Penetration testing formal (hanya security sanity-check dasar tercakup di sini)

---

## 4. Lingkungan Pengujian (Test Environment)

| Aspek | Ketentuan |
|---|---|
| Build & Run | `npm install` → `npm run dev` (port 3000) untuk uji lokal; `npm run build` + `npm run preview` untuk uji mendekati produksi |
| Node.js | v18+ (sesuai README) |
| Browser Target (Desktop) | Chrome (terbaru), Edge (terbaru), Firefox (terbaru) — prioritas Chrome karena kemungkinan besar dipakai di lapangan |
| Browser Target (Perangkat Loket) | Uji khusus di perangkat aktual loket timbang jika menggunakan **barcode scanner USB (HID keyboard wedge)** dan/atau printer thermal/label |
| Resolusi Layar | Desktop 1366×768, 1920×1080; Tablet 768×1024 (jika loket pakai tablet) |
| Mode Browser | Normal & Incognito/Private (untuk uji localStorage-dependent behavior) |
| Data Uji | Reset ke data demo awal via fungsi `resetAllERPData()` sebelum siklus pengujian regresi utama, agar hasil dapat direproduksi |
| Environment Variables | Salin `.env.example` → `.env`; verifikasi variabel apa saja yang wajib diisi (mis. kunci Firebase/Gemini API jika modul terkait diuji) |
| Alat Pendukung | DevTools (Application tab untuk inspeksi localStorage), ekstensi pengukur aksesibilitas (axe), Lighthouse |

### 4.1 Akun Uji (Default Credentials)

> Sumber: [initialUserData.ts](../src/data/initialUserData.ts). **Wajib diganti/dinonaktifkan sebelum go-live produksi** — kredensial ini adalah risiko keamanan jika terbawa ke lingkungan nyata.

| Username | Password | Role | Cakupan Modul |
|---|---|---|---|
| `superadmin` | `admin123` | Super Admin | Semua modul |
| `adminsortir` | `sortir123` | Admin Sortir | Sortir, Petani, Harga, Harga Jual, Barang, Laporan |
| `adminsortir_b` | `sortir123` | Admin Sortir (shift lain) | sama seperti di atas |
| `admintimbang` | `timbang123` | Admin Timbang | Hanya Timbangan |
| `adminkasir` | `kasir123` | Admin Kasir | Kasir, Transaksi, Timbangan, Sortir, Laporan |
| `adminpengiriman` | `kirim123` | Admin Pengiriman | Pengiriman, Sample, Status Batch, Harga Jual, Laporan Pengiriman |
| `kepalagudang` | `gudang123` | Kepala Gudang | Dashboard & seluruh Laporan (read-only eksekutif), Status Batch |

### 4.2 Matriks Kapabilitas per Role (untuk uji RBAC)

| Kapabilitas | superadmin | admin_sortir | admin_timbang | admin_kasir | admin_pengiriman | kepala_gudang |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Kelola User | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lihat Audit Log | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kelola Master Data | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Buat Data Petani | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Input Transaksi | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Kelola Stok | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kelola QC/Sample | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kelola Pengiriman | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Lihat Analitik | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |

---

## 5. Alur Bisnis Utama (Critical User Journey) untuk Skenario E2E

Ini adalah **alur inti** yang wajib memiliki minimal satu skenario E2E utuh (happy path) dari awal sampai akhir:

```
1. Petani datang & didaftarkan/dikenali via ID/barcode  [Admin Sortir]
        ↓
2. Kupon antrian dibuat & dipanggil                      [Admin Sortir / Kasir]
        ↓
3. PROSES 1 — SORTIR: penentuan grade mutu per bal        [Admin Sortir]
        ↓
4. PROSES 2 — TIMBANG: input berat bruto, hitung tara,   [Admin Timbang]
   hitung netto otomatis
        ↓
5. KASIR: validasi transaksi, hitung potongan             [Admin Kasir]
   (kuli, tali, tikar), hitung harga final, bayar,
   cetak nota timbang
        ↓
6. Barang berstatus "di_gudang" tercatat sebagai stok     [Sistem/Auto]
        ↓
7a. (Opsional) Kirim SAMPLE ke buyer untuk evaluasi       [Admin Sortir/Pengiriman]
    → approve/tolak/nego harga
        ↓
7b. Update Master Harga Jual berdasarkan hasil deal       [Admin Pengiriman]
        ↓
8. PENGIRIMAN: konsolidasi bal siap kirim, assign         [Admin Pengiriman]
   sopir & kendaraan, cetak Surat Jalan (DO)
        ↓
9. Update status pengiriman s.d. "selesai"/"diterima"     [Admin Pengiriman]
        ↓
10. Verifikasi profit di Dashboard Analitik & Laporan      [Kepala Gudang / Superadmin]
    Pengiriman (Total Penjualan − Modal = Keuntungan Bersih)
        ↓
11. Verifikasi jejak audit (Audit Trail) mencatat setiap   [Superadmin]
    aksi penting di atas
```

Setiap tahap di atas harus diuji baik sebagai **modul individual (integration test antar layar)** maupun sebagai **satu rangkaian skenario E2E penuh** memakai kredensial role yang benar-benar berbeda di tiap tahap (multi-role handoff), untuk mensimulasikan kondisi nyata di lapangan (shift berbeda, loket berbeda).

---

## 6. Checklist Pengujian Detail per Modul

> Legenda prioritas: **P0** = wajib lulus sebelum rilis (blocker), **P1** = penting, **P2** = nice-to-have/edge case.

### 6.1 Autentikasi & Sesi (`LoginView`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Login sukses dengan setiap 7 akun default (§4.1), redirect ke `modul-home` | P0 |
| 2 | Login dengan username salah → pesan "Username atau email tidak terdaftar" | P0 |
| 3 | Login dengan password salah → pesan "Kata sandi... salah" | P0 |
| 4 | Login dengan akun `status_aktif = false` → pesan akun dinonaktifkan | P0 |
| 5 | Login menggunakan **email** (bukan username) sebagai identifier | P1 |
| 6 | Username/email dengan variasi kapitalisasi (case-insensitive) | P1 |
| 7 | Field password kosong / username kosong → validasi form | P1 |
| 8 | Setelah login, refresh halaman (F5) → sesi tetap aktif, tidak logout paksa | P0 |
| 9 | Logout eksplisit → localStorage `erp_explicit_logout=true`, refresh tidak auto-login kembali | P0 |
| 10 | Tutup tab & buka tab baru ke URL yang sama tanpa logout → sesi tetap login | P1 |
| 11 | Hapus `localStorage` manual lalu refresh → sistem fallback ke auto-heal (login sbg superadmin aktif) — **verifikasi apakah ini perilaku yang diinginkan atau celah keamanan** | P0 (security concern) |
| 12 | Update `terakhir_login` tercatat benar (timestamp ISO) setelah login sukses | P2 |
| 13 | Uji XSS pada field username/password (mis. `<script>alert(1)</script>`) — input harus di-escape, tidak dieksekusi | P0 (security) |
| 14 | Multi-tab: login sebagai user A di tab 1, lalu login sebagai user B di tab 2 (localStorage sama) → verifikasi perilaku sinkronisasi/konflik sesi | P1 |

### 6.2 RBAC — Kontrol Akses Modul

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Untuk tiap role, verifikasi sidebar **hanya** menampilkan modul sesuai `allowedModules` di §4.2 | P0 |
| 2 | Untuk tiap role, coba akses modul terlarang via manipulasi state/URL/localStorage (`erp_tembakau_active_module`) → sistem redirect balik ke `modul-home`, bukan menampilkan konten | P0 |
| 3 | `admin_timbang` **hanya** bisa masuk modul Timbangan — pastikan tombol/menu ke modul lain benar-benar tidak dapat diklik/tidak ada | P0 |
| 4 | `kepala_gudang` tidak bisa melakukan aksi tulis (create/edit/delete) di modul manapun — hanya lihat laporan | P0 |
| 5 | Tombol "Kelola User" & "Audit Trail" hanya muncul untuk `superadmin` | P0 |
| 6 | Menonaktifkan (deactivate) sebuah user yang sedang login di sesi lain → sesi tersebut kehilangan akses saat refresh berikutnya | P1 |
| 7 | Role Matrix Modal menampilkan data yang identik dengan tabel §4.2 (tidak ada penyimpangan antara dokumentasi UI dan implementasi) | P1 |

### 6.3 Manajemen Petani (`PetaniTable`, `PetaniFormModal`, dll.)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Tambah petani baru → `petani_id` ter-generate otomatis format `PTN-YYYY-XXX` berurutan (fungsi `generatePetaniId`) | P0 |
| 2 | Tambah petani dengan field wajib kosong (`nama_petani`, `alamat`) → validasi muncul | P0 |
| 3 | Nomor HP: uji format numerik, panjang tidak wajar, karakter non-digit | P1 |
| 4 | Edit data petani → perubahan tersimpan dan tampil di tabel & detail drawer | P0 |
| 5 | Nonaktifkan petani (`PetaniDeactivateModal`) → `status_aktif=false`, petani tidak lagi bisa dipilih di transaksi baru namun riwayat transaksi lama tetap utuh | P0 |
| 6 | Reset ID Card (`PetaniResetCardModal`) → audit trail mencatat aksi reset (keamanan: cegah penyalahgunaan kartu hilang) | P0 |
| 7 | Cetak Kartu ID Petani (`PetaniCardPrintModal`) → PDF/kartu berisi barcode/ID yang sesuai & terbaca ulang oleh scanner | P0 |
| 8 | Import CSV massal — file valid → seluruh baris masuk tanpa duplikasi `petani_id` | P0 |
| 9 | Import CSV — file dengan baris duplikat, kolom hilang, karakter aneh (mis. koma dalam nama, encoding UTF-8/emoji) → error handling yang jelas, tidak corrupt data existing | P1 |
| 10 | Export data petani ke CSV → file lengkap & dapat dibuka kembali (round-trip test: export → import → data identik) | P1 |
| 11 | Pencarian & filter petani (nama, ID, status aktif, desa/kecamatan) berfungsi akurat | P1 |
| 12 | Pagination tabel petani (`Pagination` komponen) — uji halaman pertama/terakhir/pindah halaman dengan >34 data | P2 |
| 13 | Statistik petani (`total_setoran_bal`, `total_berat_kg`, `grade_dominan`) ter-update otomatis setelah transaksi baru selesai | P0 |
| 14 | Barcode scanner (hardware, HID keyboard wedge) memanggil data petani dengan benar saat scan cepat berturut-turut (< 50ms antar karakter, diakhiri Enter) — lihat [useBarcodeScanner.ts](../src/hooks/useBarcodeScanner.ts) | P0 |
| 15 | Simulasikan input manual cepat (paste) yang menyerupai pola scanner → pastikan tidak salah terdeteksi sebagai scan barcode jika bukan dari field yang tepat | P2 |

### 6.4 Master Data Harga Beli per Grade (`HargaManagement`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Tambah harga grade baru (`kode_grade`, `harga_per_kg`, `tanggal_berlaku`) | P0 |
| 2 | Ubah harga grade yang sudah aktif → riwayat perubahan tersimpan di `HargaHistoryModal` | P0 |
| 3 | Kode grade duplikat / format tidak valid (maksimal 3 karakter, awalan huruf) → validasi | P1 |
| 4 | Nonaktifkan (`status: nonaktif`) suatu grade → grade tidak muncul lagi sebagai opsi di transaksi baru, tapi transaksi lama tetap menampilkan harga snapshot lama | P0 |
| 5 | Perubahan harga grade **tidak mengubah retroaktif** transaksi yang sudah selesai (harga di-*snapshot* pada saat transaksi, field `harga_per_kg` di `TransaksiPembelian`) | P0 (kritikal keuangan) |
| 6 | `rate_potongan_per_bal` dan `berat_standar_kg` per grade tersimpan dan dipakai dengan benar di kalkulasi Kasir | P0 |
| 7 | Tanggal berlaku vs tanggal berakhir — uji rentang tanggal tumpang tindih antar entri harga grade yang sama | P1 |

### 6.5 Master Data Harga Jual (`HargaJualManagement`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | CRUD kode harga jual (`kode`, `harga_jual`, `tanggal_berlaku`) | P0 |
| 2 | Nonaktifkan harga jual → tidak muncul sebagai opsi baru di Pengiriman, namun histori Pengiriman lama tetap terhubung ke kode lama | P0 |
| 3 | Harga jual dipakai dengan benar di kalkulasi profit (lihat §6.9 & [financialCalculations.ts](../src/utils/financialCalculations.ts)) | P0 |

### 6.6 Master Barang (`MasterBarangManagement`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | CRUD master grade/kategori/varietas barang | P1 |
| 2 | `berat_standar_kg` & `lokasi_default_gudang` terisi otomatis dengan benar saat dipakai di modul lain | P1 |
| 3 | Nonaktifkan master barang tidak menghapus riwayat barang (`Barang`) yang sudah tercipta dari master tsb | P1 |

### 6.7 Alur Transaksi: Sortir → Timbang → Kasir

Ini adalah **jantung bisnis proses** — pengujian harus sangat detail pada perhitungan.

#### 6.7.1 Proses 1 — Sortir (`Proses1SortirModal`, `SortirPageView`)
| # | Skenario | Prioritas |
|---|---|---|
| 1 | Buat transaksi baru dari kupon antrian → status awal `status_tahap: proses_sortir` | P0 |
| 2 | Assign `kode_grade` per bal (multi-bal dalam satu transaksi, field `items: TransaksiItemBal[]`) | P0 |
| 3 | Transaksi dengan multi-grade → `kode_grade` transaksi tampil sebagai "Multi-Grade" | P1 |
| 4 | Validasi jumlah bal (`total_bal`) sesuai jumlah `items` yang diinput | P0 |
| 5 | Setelah sortir selesai, status berpindah ke `menunggu_timbang` dan muncul di antrian modul Timbangan | P0 |

#### 6.7.2 Proses 2 — Timbang (`Proses2TimbangModal`, `TimbanganPageView`)
| # | Skenario | Prioritas |
|---|---|---|
| 1 | Input `berat_bruto_kg` per bal → sistem hitung `potongan_tara_kg` otomatis sesuai aturan: **grade "SB" = tara tetap 2kg**; grade lain: **≤49kg → tara 3kg, 50–59kg → tara 5kg, ≥60kg → tara 6kg** (lihat komentar pada `TransaksiItemBal.potongan_tara_kg`, [types/index.ts](../src/types/index.ts)) | P0 (kritikal) |
| 2 | Uji nilai batas (boundary) tepat di 49/50, 59/60 kg untuk memastikan tier tara benar tidak salah-off-by-one | P0 |
| 3 | `berat_kg` (netto) = `berat_bruto_kg` − `potongan_tara_kg`, dihitung otomatis dan real-time saat input berubah | P0 |
| 4 | Override manual netto (`is_netto_manual = true`) → sistem tidak menimpa ulang nilai manual saat bruto diedit lagi, dan mencatat flag ini untuk audit | P0 |
| 5 | Opsi "ganti tikar" (`ganti_tikar: true`) → mengaktifkan `potongan_tikar` (nominal rupiah), **tidak mengubah** `potongan_tara_kg` (berat) — uji keduanya independen | P0 |
| 6 | Status per-item berubah `menunggu_timbang` → `selesai_timbang`; status transaksi keseluruhan `menunggu_timbang` → `lengkap`/lanjut ke Kasir hanya jika **semua bal** dalam transaksi sudah `selesai_timbang` (`bal_selesai_timbang == total_bal`) | P0 |
| 7 | Input berat negatif/nol/huruf → validasi menolak nilai tidak valid | P0 |
| 8 | Barcode fisik (`barcode`) per bal ter-scan dan terhubung dengan benar ke item yang tepat saat multi-bal ditimbang berurutan | P0 |
| 9 | Lokasi simpan (`lokasi_simpan`, mis. Blok A/B) tersimpan per bal untuk keperluan pelacakan gudang | P1 |
| 10 | Cetak/print label sample (`sample_label_code`, `sample_label_printed`) jika berlaku di tahap ini | P2 |

#### 6.7.3 Kasir (`PembayaranKasirModal`, `KasirPageView`, `NotaTimbangContent`)
| # | Skenario | Prioritas |
|---|---|---|
| 1 | Kasir hanya bisa memproses pembayaran transaksi berstatus `lengkap` (semua bal sudah ditimbang) | P0 |
| 2 | Perhitungan **per-bal**: `potongan_kuli` = Rp 7.000/bal, `potongan_tali` = Rp 3.000/bal (nilai tetap, tidak berubah oleh grade) | P0 |
| 3 | `potongan_tikar` = Rp 75.000/bal **hanya jika** `ganti_tikar = true`, else 0 | P0 |
| 4 | `potongan` (total per bal) = `potongan_kuli + potongan_tali + potongan_tikar` — verifikasi penjumlahan tepat, tidak ada pembulatan salah | P0 |
| 5 | `total_kotor` (per bal) = `berat_kg (netto) × harga_per_kg` — verifikasi harga yang dipakai adalah **snapshot harga grade saat itu**, bukan harga master saat ini jika sudah berubah | P0 |
| 6 | `subtotal_bersih` (per bal) = `total_kotor − potongan` | P0 |
| 7 | Total transaksi: `total_harga_beli = Σ(berat_kg × harga_per_kg)`, `total_potongan = Σ potongan`, `harga_final = total_harga_beli − total_potongan` — verifikasi agregasi dari seluruh bal benar (uji dengan 1 bal, uji dengan 10+ bal campuran grade) | P0 (kritikal keuangan) |
| 8 | Uji pajak/`PPH 22` (`pajak` field) jika berlaku — verifikasi apakah dihitung dan dikurangkan dengan benar dari `harga_final` | P1 |
| 9 | Metode pembayaran `cash` vs `kredit` — verifikasi status `status_pembayaran` (`lunas`/`belum_lunas`) berubah sesuai metode | P0 |
| 10 | Setelah bayar: `status_transaksi = lengkap`, `dibayar_pada`, `dibayar_oleh` terisi otomatis dengan user & waktu saat itu | P0 |
| 11 | Cetak Nota Timbang (`NotaTimbangContent`) — verifikasi seluruh angka di nota cetak **identik** dengan data tersimpan (tidak ada selisih pembulatan antara layar & cetakan) | P0 |
| 12 | `status_nota` berubah `belum_cetak → sudah_cetak`, `unduh_nota_count` bertambah setiap kali diunduh ulang | P1 |
| 13 | Setelah pembayaran selesai, bal terkait otomatis tercatat sebagai `Barang` baru dengan `status_stok = di_gudang` | P0 |
| 14 | Edit transaksi setelah selesai (`TransaksiEditModal`) — wajib mengisi `alasan_perubahan_terakhir`; audit trail mencatat perubahan (`rincian_perubahan`) dengan nilai lama vs baru | P0 |
| 15 | Batalkan/hapus transaksi (jika didukung) — verifikasi `Barang` terkait ikut disesuaikan/dibatalkan, tidak menyisakan data yatim (orphan) | P0 |
| 16 | Cek kupon antrian (`KuponAntrian`) status berubah `menunggu → dipanggil → selesai` sinkron dengan progres transaksi; kupon `batal` untuk petani yang tidak jadi transaksi | P1 |
| 17 | Uji harga dengan angka besar (>999.999.999) & desimal — format Rupiah tampil benar tanpa pembulatan aneh (lihat [formatters.ts](../src/utils/formatters.ts)) | P1 |
| 18 | Uji ID transaksi auto-generate format `TRX-DDMMYYYY-XXX` unik per hari, tidak duplikat meski dibuat pada detik yang sama (concurrent create di 2 tab) | P0 |

### 6.8 Sample & Evaluasi Buyer (`SampleManagement`, `BatchEvaluasiSortirModal`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Buat batch pengiriman sample ke buyer (`BatchPengirimanSample`) dengan beberapa item bal (`SampleItemDetail`) | P0 |
| 2 | Status batch: `sample → diproses → dikirim → selesai`, atau `dibatalkan` | P0 |
| 3 | Update evaluasi tiap item: `disetujui`, `ditolak` (wajib isi `alasan_tolak`), atau `nego` (wajib isi `catatan_nego`, `harga_deal_kg`) | P0 |
| 4 | Total ringkasan batch (`total_bal_disetujui`, `total_bal_ditolak`, `total_bal_nego`, `total_estimasi_nilai`, `total_nilai_deal`) terhitung akurat dari item-item di dalamnya | P0 |
| 5 | Bal yang statusnya `disetujui`/nego dengan `sudah_dikirim_do = true` tidak bisa dimasukkan ke batch sample lain secara ganda | P0 |
| 6 | Bal yang `ditolak` tetap berstatus stok gudang normal (`di_gudang`), bukan hilang dari sistem | P0 |
| 7 | Cetak Print Sample (`BatchSamplePrintModal`) — label/dokumen sample sesuai data & barcode unik | P1 |
| 8 | Harga tawaran vs harga deal — uji negosiasi dengan harga_deal lebih rendah dari harga_tawaran, sama dengan, dan lebih tinggi (upsell) | P1 |
| 9 | Field `is_locked` pada batch — verifikasi batch yang terkunci tidak bisa lagi diedit itemnya | P1 |

### 6.9 Pengiriman Barang / Delivery Order (`PengirimanManagement`, `SuratJalanPrintModal`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Konsolidasi beberapa `barang_id` (bal siap kirim, status `siap_kirim`) ke dalam satu Surat Jalan | P0 |
| 2 | Hanya bal berstatus stok yang tepat (`siap_kirim`) yang dapat dipilih untuk DO baru — bal `keluar`/`terkirim_sample` tidak boleh dobel-input | P0 |
| 3 | Input `driver_nama`, `plat_nomor`, `tujuan` (pabrik), `tanggal_kirim` — validasi field wajib | P0 |
| 4 | `total_bal` dan `total_berat_kg` DO terhitung otomatis dari bal yang dipilih | P0 |
| 5 | `harga_deal_map`/`kode_harga_jual_map` per bal terisi benar dari hasil evaluasi sample (§6.8) atau input manual jika tanpa sample | P0 |
| 6 | Status DO: `dimuat → dalam_perjalanan → diterima/dikirim → selesai`; setelah status akhir, bal terkait berubah `status_stok = keluar` | P0 |
| 7 | Cetak Surat Jalan (`SuratJalanPrintModal`) — data sopir, kendaraan, daftar bal (no bal, grade, berat) sesuai isi DO | P0 |
| 8 | `rincian_grade` (breakdown per grade: jumlah bal & kg) pada DO terhitung akurat untuk laporan | P1 |
| 9 | Uji DO dengan bal campuran multi-grade dan multi-petani dalam satu pengiriman | P1 |
| 10 | **Perhitungan Profit** ([financialCalculations.ts](../src/utils/financialCalculations.ts) — `hitungProfitPengiriman`): <br>• `totalPenjualan = Σ(berat_netto × harga_jual_deal)` <br>• `totalHargaBeliTerkirim = Σ(berat_netto × harga_beli)` <br>• `keuntunganBersih = totalPenjualan − totalHargaBeliTerkirim` <br>• `profitMarginPct`, `roiPct` dihitung benar dan tidak `NaN`/`Infinity` saat pembagi nol | P0 (kritikal keuangan) |
| 11 | Jika DO punya `total_nilai_deal` langsung (bukan per-bal), verifikasi distribusi proporsional berdasarkan berat netto ke tiap bal dihitung benar (`proporsiBerat = netto / doTotalBeratKg`) | P0 |
| 12 | Hanya DO berstatus `dikirim/dalam_perjalanan/diterima/selesai` yang dihitung sebagai valid untuk laporan profit (`validShippedDO`) — DO `dimuat` (belum berangkat) tidak masuk hitungan | P0 |
| 13 | Nomor kontrak (`nomor_kontrak`) opsional tersimpan & tampil di laporan jika diisi | P2 |

### 6.10 Status Batch Pengiriman (`StatusBatchPengirimanManagement`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Tampilan gabungan status seluruh batch (sample & DO) untuk `kepala_gudang` sebagai monitoring eksekutif | P1 |
| 2 | Filter berdasarkan status, tanggal, tujuan buyer/pabrik | P2 |

### 6.11 Dashboard & Laporan Analitik (`DashboardAnalyticView`, `Laporan*View`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Metrik utama dashboard (Total Tonase, Jumlah Bal, Valuasi Aset) sesuai dengan data aktual di storage — cross-check manual dengan penjumlahan data mentah | P0 |
| 2 | Distribusi Grade (chart Recharts) — persentase tiap grade sesuai proporsi data riil, total = 100% | P0 |
| 3 | Top Contributors (petani penyetor terbesar) terurut benar (descending) dan konsisten dengan `statistik.total_berat_kg`/`total_setoran_bal` per petani | P1 |
| 4 | Laporan Bal (`LaporanBalView`), Kode Bal (`LaporanKodeBalView`), Grade (`LaporanGradeView`), Pembelian Barang, Petani, Pengiriman, Harga Jual — masing-masing filter (tanggal, grade, petani, status) menghasilkan data yang tepat, bukan seluruh dataset tanpa filter | P0 |
| 5 | Uji filter tanggal dengan rentang kosong (tidak ada transaksi) → tampilkan state "tidak ada data", bukan error/blank crash | P1 |
| 6 | Ekspor laporan ke Excel (`xlsx`) — file terbuka dengan benar, kolom & angka sesuai tampilan layar | P1 |
| 7 | Grafik responsif terhadap resize window/perbedaan resolusi layar | P2 |
| 8 | Valuasi Stok Gudang (`hitungValuasiStokGudang`) hanya menghitung status `di_gudang`, `siap_kirim`, `terkirim_sample` — TIDAK termasuk bal `keluar` — verifikasi eksplisit dengan data campuran status | P0 |
| 9 | Performa render dashboard dengan dataset besar (simulasikan 5.000+ transaksi, 10.000+ bal) — waktu render & interaksi chart tetap responsif | P1 |

### 6.12 Manajemen User (`UserManagement`, `UserFormModal`, `UserResetPasswordModal`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Hanya `superadmin` dapat mengakses modul ini (§6.2) | P0 |
| 2 | Tambah user baru dengan role tertentu → langsung mendapat hak akses sesuai `ROLE_DEFINITIONS` tanpa perlu re-login | P0 |
| 3 | Username duplikat ditolak saat pembuatan user baru | P0 |
| 4 | Reset password user lain — password baru langsung berlaku, sesi lama user tsb (jika aktif) harus diminta login ulang atau tetap valid sesuai desain yang disepakati | P0 |
| 5 | Nonaktifkan user → user tersebut tidak bisa login lagi (§6.1 no. 4) | P0 |
| 6 | Ubah role seorang user → akses modul berubah sesuai role baru | P0 |
| 7 | Tidak bisa menonaktifkan/menghapus akun `superadmin` terakhir yang aktif (safety net agar sistem tidak terkunci total) | P0 |
| 8 | Password disimpan **plaintext** di objek `User` — cross-reference dengan §2 & §9.6, pastikan ini didokumentasikan sebagai known-risk dan tidak ditampilkan di UI mana pun secara tidak sengaja (mis. di log, di export CSV) | P0 (security) |

### 6.13 Audit Trail (`AuditTrailView`)

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Hanya `superadmin` bisa melihat audit log | P0 |
| 2 | Aksi-aksi kritikal berikut **wajib** tercatat di audit log dengan `user_nama`, `role`, `modul`, `aksi`, `target_id`, `deskripsi`: tambah/ubah/hapus transaksi, timbang bal, reset kartu petani, deactivate user/petani, ubah harga master, ubah status pengiriman | P0 |
| 3 | `rincian_perubahan` (detail before/after) terisi lengkap untuk aksi edit (khususnya `TransaksiEditModal`) | P0 |
| 4 | Log terbatas ke 500 entri terakhir (`slice(0,500)`) — uji saat log ke-501 ditambahkan, entri tertua ter-drop dengan benar (bukan entri baru yang hilang) | P1 |
| 5 | Log tidak dapat diedit/dihapus manual dari UI (integritas audit trail) | P0 |
| 6 | Timestamp log akurat & terurut (terbaru di atas) | P1 |

### 6.14 Cetak & Ekspor Dokumen

| # | Skenario | Prioritas |
|---|---|---|
| 1 | Nota Timbang, Kartu ID Petani, Surat Jalan, Label Sample — semua bisa di-print langsung (`window.print`) dan/atau diunduh sebagai PDF/gambar | P0 |
| 2 | Layout cetak (`DedicatedPrintView`) tidak terpotong di ukuran kertas standar (A4/A5/label kecil, tergantung dokumen) | P0 |
| 3 | Karakter khusus (nama dengan tanda kutip, apostrof, huruf non-latin) tidak merusak layout cetak/PDF | P1 |
| 4 | Cetak ulang dokumen yang sama menghasilkan output identik (idempotent) — tidak ada nomor/angka yang berubah setiap kali dicetak ulang, kecuali counter cetak yang memang disengaja | P1 |
| 5 | Uji cetak di browser berbeda (Chrome vs Edge vs Firefox print dialog) | P2 |

---

## 7. Pengujian Non-Fungsional

### 7.1 Integritas & Konsistensi Data (khusus arsitektur client-storage)
- Uji **referential integrity** manual: hapus/nonaktifkan Petani yang punya transaksi aktif → transaksi lama tidak boleh menampilkan data petani kosong/`undefined`.
- Uji fungsi pembersihan data legacy di `storage.ts` (`purgeLegacyDemoCaches`, normalisasi ID transaksi `TRX-YYYYMMDD-XXXX → TRX-DDMMYYYY-XXX`, sinkronisasi ID ke tabel `Barang`) — pastikan migrasi berjalan sekali dan tidak mengubah ulang ID yang sudah benar pada load berikutnya.
- Uji `resetAllERPData()` (reset ke data demo) benar-benar mereset **semua** entitas secara atomik, tidak meninggalkan sisa data lama tercampur data demo baru.
- Uji localStorage mendekati/melebihi kuota (≈5–10MB tergantung browser) → fallback `memoryStore` aktif, aplikasi tidak crash, namun beri peringatan ke user bahwa data tidak persisten setelah refresh (temuan penting untuk kondisi lapangan data besar).

### 7.2 Kompatibilitas & Responsivitas
- Uji tampilan di lebar layar sempit (tablet) untuk modul yang kemungkinan dipakai di loket dengan tablet (Timbangan, Kasir).
- Uji dengan zoom browser 90%–150% (operator lapangan kadang mengubah zoom).

### 7.3 Performa
- Waktu load awal aplikasi dengan dataset besar dari localStorage (dekompresi `lz-string` bisa jadi bottleneck) — ukur waktu ke *interactive*.
- Waktu render tabel/list dengan ribuan baris (Petani, Transaksi, Barang) — pastikan ada pagination/virtualisasi efektif, tidak me-render semua baris sekaligus.

### 7.4 Keamanan Dasar (Security Sanity Check)
- **Password plaintext** di storage — dokumentasikan sebagai temuan berisiko tinggi untuk lingkungan produksi nyata; rekomendasikan hashing sebelum go-live jika belum ada rencana migrasi ke backend.
- RBAC hanya di client (§2) — dokumentasikan sebagai keterbatasan arsitektur (bukan bug), tapi tetap uji agar tidak ada cara mudah (tanpa devtools) untuk user biasa membajak modul lain.
- Input sanitization (XSS) di semua field teks bebas: nama petani, catatan, alasan tolak, deskripsi audit.
- Uji apakah ada endpoint eksternal (Firebase/Gemini API di `package.json`) yang mengirim data sensitif tanpa autentikasi/enkripsi yang layak — cek `firebase-applet-config.json` dan `.env.example` untuk kunci yang seharusnya tidak ter-commit ke repo publik.

### 7.5 Aksesibilitas (Basic)
- Kontras warna badge role & status (superadmin merah, dsb.) memenuhi WCAG AA minimal.
- Navigasi keyboard dasar untuk form modal (Tab order, Esc menutup modal).
- Alt text/label untuk ikon-ikon Lucide yang bersifat aksi (bukan dekoratif).

---

## 8. Data Uji yang Perlu Disiapkan

| Kategori | Kebutuhan Data Uji |
|---|---|
| Petani | Minimal: 1 petani baru (untuk uji create), 1 petani nonaktif, 1 petani dengan nama panjang/karakter khusus, dataset besar (≥100) untuk uji pagination & performa |
| Grade & Harga | Semua grade yang dipakai di data demo (A, B, C, SB, dst.) + 1 grade baru untuk uji create; harga dengan nominal ekstrem (sangat kecil & sangat besar) |
| Transaksi | 1 transaksi single-bal, 1 transaksi multi-bal single-grade, 1 transaksi multi-bal multi-grade, 1 transaksi dengan `ganti_tikar=true`, 1 transaksi dengan netto manual override |
| Sample | 1 batch dengan campuran hasil disetujui/ditolak/nego |
| Pengiriman | 1 DO dengan `total_nilai_deal` langsung, 1 DO dengan `harga_deal_map` per-bal, 1 DO multi-grade |
| User | Minimal 1 akun per role (sudah tersedia di data demo, §4.1), 1 akun untuk diuji reset password dan deaktivasi |
| File Import/Export | File CSV valid, file CSV rusak/kolom hilang, file CSV kosong, file dengan encoding non-UTF8 |

---

## 9. Kriteria Masuk & Keluar Pengujian (Entry/Exit Criteria)

### 9.1 Kriteria Masuk (Entry)
- Build aplikasi berhasil (`npm run build`) tanpa error kompilasi TypeScript (`npm run lint` / `tsc --noEmit` lulus).
- Environment uji tersedia dengan data demo ter-reset.
- Dokumen ini dan skenario turunannya (test case detail) sudah direview oleh Product Owner/QA Lead.

### 9.2 Kriteria Keluar (Exit)
- 100% skenario **P0** lulus (blocker tidak boleh ada).
- ≥95% skenario **P1** lulus, sisanya punya *known issue* terdokumentasi dengan mitigasi.
- Tidak ada defect **Critical/Blocker** terbuka pada modul: Kasir (perhitungan finansial), Sortir-Timbang, Pengiriman (profit calculation), RBAC.
- Temuan keamanan (§7.4) sudah dikomunikasikan tertulis ke Product Owner sebagai *accepted risk* atau ditindaklanjuti.

---

## 10. Klasifikasi Tingkat Keparahan Defect

| Level | Definisi | Contoh dari sistem ini |
|---|---|---|
| **Blocker** | Menghentikan alur kerja utama, tidak ada workaround | Kasir gagal menyimpan pembayaran; login tidak bisa sama sekali |
| **Critical** | Data/keuangan salah tapi sistem tidak crash | Perhitungan tara/potongan salah, profit pengiriman salah hitung |
| **Major** | Fitur tidak berfungsi sesuai spek tapi ada workaround | Filter laporan tidak berfungsi, tapi data bisa dicek manual |
| **Minor** | Masalah kecil UI/UX, tidak menghambat pekerjaan | Label salah ketik, alignment tidak rapi |
| **Cosmetic** | Estetika murni | Warna badge kurang kontras di kondisi tertentu |

---

## 11. Deliverable Pengujian

1. **Test Case Detail** (spreadsheet/tool) — turunan langsung dari checklist §6, dengan kolom: ID, Modul, Precondition, Langkah, Expected Result, Actual Result, Status, Prioritas, Role Penguji.
2. **Test Execution Report** — ringkasan pass/fail per modul, per role.
3. **Defect Log** — dengan severity (§10), langkah reproduksi, screenshot/video, environment.
4. **Traceability Matrix** — memetakan tiap kasus uji ke alur bisnis (§5) dan modul (§6), memastikan tidak ada celah cakupan.
5. **Sign-off Note** — persetujuan Product Owner sebelum rilis, mereferensikan status Exit Criteria (§9.2).

---

## 12. Lampiran

### 12.1 Referensi Formula Keuangan Kunci
```
Netto (berat_kg)        = Berat Bruto (kg) − Potongan Tara (kg)
Potongan Tara            = 2 kg (jika grade "SB")
                          | 3 kg (jika netto ≤ 49 kg, grade selain SB)
                          | 5 kg (jika 50 ≤ netto ≤ 59 kg)
                          | 6 kg (jika netto ≥ 60 kg)
Potongan per Bal          = Potongan Kuli (Rp 7.000) + Potongan Tali (Rp 3.000)
                          + Potongan Tikar (Rp 75.000, hanya jika ganti_tikar = true)
Total Kotor per Bal       = Berat Netto (kg) × Harga Beli per kg
Subtotal Bersih per Bal   = Total Kotor − Potongan
Total Harga Beli (Transaksi) = Σ (Berat Netto × Harga Beli) seluruh bal
Total Potongan (Transaksi)   = Σ Potongan seluruh bal
Harga Final (Dibayar ke Petani) = Total Harga Beli − Total Potongan (− Pajak, jika ada)

Nilai Bal (Modal)         = Berat Netto × Harga Beli per kg
Total Penjualan (DO)      = Σ (Berat Netto × Harga Jual Deal) seluruh bal terkirim
Total Modal Bal Terkirim  = Σ (Berat Netto × Harga Beli) seluruh bal terkirim
Keuntungan Bersih         = Total Penjualan − Total Modal Bal Terkirim
Margin Profit (%)         = (Keuntungan Bersih / Total Penjualan) × 100
ROI (%)                   = (Keuntungan Bersih / Total Modal Bal Terkirim) × 100
Valuasi Stok Gudang       = Σ (Berat Netto × Harga Beli) untuk status: di_gudang, siap_kirim, terkirim_sample
                            (status "keluar" TIDAK dihitung)
```

### 12.2 Referensi ID Modul (untuk uji RBAC & navigasi)
`modul-home`, `modul-1-petani`, `modul-2-barang`, `modul-3-harga`, `modul-3-harga-jual`, `modul-0-sortir`, `modul-0-timbangan`, `modul-0-kasir`, `modul-0-transaksi`, `modul-4-sample`, `modul-status-batch`, `modul-5-pengiriman`, `modul-6-dashboard-analytic`, `modul-6-laporan-bal`, `modul-6-laporan-kode-bal`, `modul-6-laporan-grade`, `modul-6-laporan-pembelian`, `modul-6-laporan-petani`, `modul-6-laporan-pengiriman`, `modul-users`.

### 12.3 Status Enumerasi Kunci (untuk uji transisi status)
- `StatusStokBarang`: `di_gudang` → `siap_kirim` → `keluar` (atau `terkirim_sample`)
- `TransaksiPembelian.status_tahap`: `proses_sortir` → `menunggu_timbang` → `lengkap`
- `StatusSample`: `sample` → `dikirim` → `diterima` → `disetujui` / `ditolak` / `nego`
- `StatusBatchSample`: `sample` → `diproses` → `dikirim` → `selesai` (atau `dibatalkan`)
- `StatusPengiriman`: `dimuat` → `dalam_perjalanan` → `diterima` / `dikirim` → `selesai`

### 12.4 Catatan Risiko yang Perlu Perhatian Product Owner
1. Password user tersimpan **plaintext** — risiko keamanan jika perangkat/localStorage bocor.
2. Tidak ada backend — data **tidak backup otomatis**; kehilangan/reset browser = kehilangan seluruh data operasional. Perlu strategi backup (export rutin) sebelum sistem dipakai produksi penuh.
3. RBAC hanya client-side — cukup untuk mencegah kesalahan operator awam, tapi tidak untuk mencegah pengguna teknis yang punya akses DevTools.
4. Auto-heal login (fallback ke superadmin) perlu keputusan eksplisit: apakah ini "convenience" yang disengaja untuk demo, atau harus dinonaktifkan sebelum produksi.

---

*Dokumen ini adalah dokumen hidup (living document) — perbarui setiap kali ada penambahan modul, perubahan aturan bisnis (potongan, tara, harga), atau perubahan arsitektur (mis. migrasi ke backend nyata).*

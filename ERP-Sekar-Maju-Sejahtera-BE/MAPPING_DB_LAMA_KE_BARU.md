# Mapping DB Lama → Baru + Keputusan Produk

Sumber: skema live `erp_sekar_maju` vs `newplan-db.md`  
Tujuan: acuan migrasi & checklist keputusan **sebelum** coding.

---

## Ringkasan arsitektur


| Domain            | Sekarang                                       | Rencana baru                                                     |
| ----------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| User              | `users` + RBAC 4 tabel                         | `pengguna` + enum role saja                                      |
| Audit             | `audit_log` (kosong, FE localStorage)          | `audit_trail`                                                    |
| Petani            | `petani`                                       | `master_petani`                                                  |
| Grade             | `grade_master`                                 | **hilang** → `master_harga_beli.kode_grade`                      |
| Harga beli        | `tabel_harga`                                  | `master_harga_beli`                                              |
| Harga jual        | `master_harga_jual`                            | `master_harga_jual` (bentuk beda)                                |
| Gudang            | `gudang`                                       | **tidak ada di plan**                                            |
| Pembelian         | `transaksi_pembelian` + `transaksi_item_bal`   | `sortir` + `sortir_bal` + `timbangan` + `kasir` + `kasir_detail` |
| Stok bal          | `barang` (baru muncul setelah bayar)           | `sortir_bal.status_stok` (dari sortir)                           |
| Sample            | `sample_batch` + `sample_batch_item`           | `pengiriman_sample` + `pengiriman_sample_bal`                    |
| DO                | `pengiriman_barang` + `pengiriman_barang_item` | `pengiriman_reguler` + `pengiriman_reguler_bal`                  |
| Histori status    | inline di batch/DO (+ FE lokal)                | `status_batch`                                                   |
| Sequence          | `sequence_counters` + string PK                | integer PK + kode bisnis unique                                  |
| Opname / lampiran | `stock_opname_*`, `file_attachments`           | **tidak ada di plan**                                            |
| Auth token        | `personal_access_tokens`                       | tetap perlu (Sanctum) — tidak di plan                            |


---



## 1. Manajemen pengguna



### `users` → `pengguna`


| Lama                             | Baru                        | Catatan                                         |
| -------------------------------- | --------------------------- | ----------------------------------------------- |
| `user_id` varchar PK (`USR-###`) | `pengguna_id` integer PK    | **breaking**: semua FK & Sanctum `tokenable_id` |
| `username`                       | `username`                  | OK                                              |
| `password_hash`                  | `password_hash`             | OK                                              |
| `nama_lengkap`                   | `nama_lengkap`              | OK                                              |
| `role_code` → `roles`            | `role` enum `role_pengguna` | nilai enum sama; hilang tabel `roles`           |
| `email`                          | `email`                     | OK                                              |
| `no_hp`                          | `no_hp`                     | OK                                              |
| `unit_penugasan`                 | —                           | **kehilangan kolom**                            |
| `status_aktif`                   | `status_aktif`              | OK                                              |
| `terakhir_login`                 | `terakhir_login`            | OK                                              |
| `dibuat_pada`                    | `created_at`                | rename                                          |
| —                                | `updated_at`                | baru                                            |




### RBAC (kehilangan struktur)


| Lama                 | Baru                       | Keputusan                               |
| -------------------- | -------------------------- | --------------------------------------- |
| `roles`              | diganti enum di `pengguna` | label/warna badge FE? hardcode?         |
| `modules`            | —                          | menu FE tetap di `App.tsx` / `rbac.ts`? |
| `role_module_access` | —                          | akses modul dari mana?                  |
| `role_capabilities`  | —                          | capability flags dari mana?             |




### `audit_log` → `audit_trail`


| Lama                               | Baru                                    | Catatan                                   |
| ---------------------------------- | --------------------------------------- | ----------------------------------------- |
| `audit_id`                         | `audit_trail_id`                        | integer tetap                             |
| `table_name`                       | `nama_tabel`                            |                                           |
| `record_id` varchar                | `record_id` integer                     | **breaking** jika PK bisnis string        |
| `action` enum INSERT/UPDATE/DELETE | `aksi` varchar bebas                    | perlu standar nilai (`TAMBAH`, `UBAH`, …) |
| `changed_by`                       | `pengguna_id`                           | NOT NULL di plan                          |
| `changed_at`                       | `created_at`                            |                                           |
| `old_values` / `new_values`        | `rincian_perubahan` jsonb               | digabung 1 kolom                          |
| —                                  | `modul`, `deskripsi`, `nomor_referensi` | baru, wajib diisi aplikasi                |


**Data sekarang:** 0 baris. Migrasi data audit tidak kritis; yang kritis: **wiring API** (sekarang FE localStorage).

### `personal_access_tokens`

Tidak ada di plan. **Harus tetap ada** untuk Sanctum. Sesuaikan `tokenable_id` jika PK user jadi integer.

---



## 2. Master data



### `petani` → `master_petani`


| Lama                                    | Baru                                              | Catatan                                |
| --------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| `petani_id` varchar PK (`PTN-YYYY-###`) | `master_petani_id` integer + `kode_petani` unique | `kode_petani` ≈ nilai lama `petani_id` |
| `nama_petani`                           | `nama_petani`                                     | OK                                     |
| `no_hp`                                 | `no_hp`                                           | OK                                     |
| `alamat` NOT NULL                       | `alamat` nullable                                 | longgarkan constraint                  |
| `desa_kecamatan`                        | `desa_kecamatan`                                  | OK                                     |
| `status_aktif`                          | `status_aktif`                                    | OK                                     |
| `alasan_nonaktif`                       | `alasan_nonaktif`                                 | OK                                     |
| `tanggal_daftar`                        | `tanggal_daftar`                                  | OK                                     |
| `catatan`                               | `catatan`                                         | OK                                     |
| `created_at` / `updated_at`             | sama                                              | OK                                     |




### `grade_master` → (tidak ada)


| Lama                                      | Opsi migrasi                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `kode_grade`, `nama_grade`, `warna_badge` | A) buang, UI pakai `kode_grade` saja; B) tetap simpan master grade (tambah ke plan) |


**Data sekarang:** 44 grade. Dipakai FK di `tabel_harga`, `barang`, `transaksi_item_bal`.

### `tabel_harga` → `master_harga_beli`


| Lama                        | Baru                            | Catatan                                          |
| --------------------------- | ------------------------------- | ------------------------------------------------ |
| `harga_id` varchar (`HB-n`) | `master_harga_beli_id` integer  |                                                  |
| `kode_grade`                | `kode_grade`                    | tanpa FK ke `grade_master`                       |
| `harga_per_kg`              | `harga_per_kg`                  | OK                                               |
| `rate_potongan_per_bal`     | —                               | **hilang** (potongan sekarang di `kasir_detail`) |
| `berat_standar_kg`          | —                               | **hilang**                                       |
| `tanggal_berlaku`           | `tanggal_berlaku`               | OK                                               |
| `tanggal_berakhir`          | —                               | diganti pola: baris baru + `status_aktif=false`  |
| `status` aktif/nonaktif     | `status_aktif` boolean          |                                                  |
| `dibuat_oleh` varchar       | `dibuat_oleh_id` integer        | NOT NULL di plan                                 |
| `deskripsi`                 | —                               | **hilang**                                       |
| `created_at`                | `created_at`                    |                                                  |
| —                           | `updated_at`                    | baru                                             |
| Unique                      | `(kode_grade, tanggal_berlaku)` | beda dari PK string lama                         |




### `master_harga_jual` → `master_harga_jual`


| Lama                    | Baru                           | Catatan      |
| ----------------------- | ------------------------------ | ------------ |
| `harga_jual_id` varchar | `master_harga_jual_id` integer |              |
| `kode`                  | `kode`                         | OK           |
| `harga_jual`            | `harga_jual_per_kg`            | rename       |
| `tanggal_berlaku`       | `tanggal_berlaku`              | OK           |
| `status_aktif`          | `status_aktif`                 | OK           |
| `created_at`            | `created_at`                   |              |
| —                       | `updated_at`, `dibuat_oleh_id` | baru / wajib |
| Unique                  | `(kode, tanggal_berlaku)`      | baru         |




### `gudang` → ???


| Lama                                         | Status di plan |
| -------------------------------------------- | -------------- |
| `gudang_id`, `kode_gudang`, `nama_gudang`, … | **tidak ada**  |


Dipakai sekarang di: `barang.gudang_id`, `sample_batch.sumber_gudang_id`, default `PMK-01`.  
**Data:** 3 gudang. **Wajib keputusan produk.**

---



## 3. Pembelian (inti — perubahan terbesar)



### Header: `transaksi_pembelian` → `sortir` + `kasir`

Satu baris transaksi lama dipecah:

#### → `sortir` (fase intake)


| Lama (`transaksi_pembelian`) | Baru (`sortir`)                                      |
| ---------------------------- | ---------------------------------------------------- |
| `transaksi_id`               | diganti `sortir_id` integer; `no_kupon` tetap unique |
| `no_kupon`                   | `no_kupon`                                           |
| `petani_id`                  | `master_petani_id`                                   |
| `tanggal_transaksi`          | `tanggal_sortir`                                     |
| `status_tahap`               | `status_tahap` (enum mirip)                          |
| `petugas_sortir_user_id`     | `petugas_sortir_id`                                  |
| `catatan`                    | `catatan`                                            |
| `created_at` / `updated_at`  | sama                                                 |




#### → `kasir` (fase pembayaran, 1:1 dengan sortir)


| Lama                                               | Baru (`kasir`)                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| (1 transaksi = 1 nota)                             | `sortir_id` unique                                                                  |
| hitungan FE/API saat bayar                         | `total_bal`, `total_berat_netto_kg`, `total_kotor`, `total_potongan`, `total_bayar` |
| `status_pembayaran`                                | `status_pembayaran`                                                                 |
| `metode_pembayaran`                                | `metode_pembayaran` (varchar; plan: `cash` / kosong)                                |
| `dibayar_oleh` / `dibayar_pada`                    | `dibayar_oleh_id` / `dibayar_pada`                                                  |
| `status_nota` / `dicetak_pada`                     | sama                                                                                |
| `dicetak_oleh`, `unduh_nota_count`                 | — **hilang**                                                                        |
| `status_transaksi`, `jenis_timbang`                | — **hilang / diganti status_tahap**                                                 |
| `operator_user_id`, `petugas_timbang_user_id`      | timbang pindah ke `timbangan.petugas_timbang_id`                                    |
| `catatan_kasir`, `catatan_qc`, audit ubah terakhir | — **hilang** (sebagian bisa ke `audit_trail`)                                       |


**Catatan alur:** sekarang `barang` dibuat saat **bayar**. Di plan, bal sudah “hidup” sejak `sortir_bal`; kasir hanya nota.

### Item: `transaksi_item_bal` → `sortir_bal` + `timbangan` + `kasir_detail`



#### → `sortir_bal`


| Lama                                                                        | Baru                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------- |
| `item_id`                                                                   | `sortir_bal_id`                                         |
| `transaksi_id`                                                              | `sortir_id`                                             |
| `no_bal`                                                                    | `no_bal` unique                                         |
| `kode_grade` (+ harga di item)                                              | `master_harga_beli_id` FK                               |
| `ganti_tikar`                                                               | `ganti_tikar`                                           |
| (stok di `barang` setelah bayar)                                            | `status_stok` di sini dari awal                         |
| `kode_bal_pembeli`, `barcode`, `lokasi_simpan`, `sample_label_*`, `catatan` | — **tidak di sortir_bal**; sebagian pindah ke sample/DO |




#### → `timbangan` (1:1 dengan bal yang sudah ditimbang)


| Lama                                  | Baru                                               |
| ------------------------------------- | -------------------------------------------------- |
| `berat_bruto_kg`                      | `berat_bruto_kg`                                   |
| `potongan_tara_kg`                    | `potongan_tara_kg`                                 |
| `berat_kg` (netto)                    | `berat_netto_kg`                                   |
| `is_netto_manual`                     | `is_netto_manual`                                  |
| `status_timbang`                      | tidak perlu jika baris timbangan = sudah ditimbang |
| `petugas_timbang_user_id` (di header) | `petugas_timbang_id` per bal                       |
| —                                     | `ditimbang_pada`                                   |


Bal belum ditimbang = **belum ada** baris `timbangan` (beda dari sekarang: item sudah ada dengan `menunggu_timbang`).

#### → `kasir_detail` (snapshot saat nota)


| Lama (di item / generated)                     | Baru                                         |
| ---------------------------------------------- | -------------------------------------------- |
| `harga_per_kg`                                 | `harga_beli_per_kg` + `master_harga_beli_id` |
| `berat_kg`                                     | `berat_netto_kg`                             |
| `total_kotor`, `potongan_*`, `subtotal_bersih` | sama di `kasir_detail`                       |
| `potongan` (generated)                         | diganti agregat di header `kasir`            |


---



## 4. Stok: `barang` → `sortir_bal.status_stok`


| Lama (`barang`)                                                       | Baru                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `barang_id`                                                           | diganti referensi `sortir_bal_id` di sample/DO                                           |
| `transaksi_item_id` / `transaksi_id`                                  | via `sortir_bal` → `sortir`                                                              |
| `petani_id`                                                           | via `sortir.master_petani_id`                                                            |
| `kode_grade`                                                          | via `sortir_bal.master_harga_beli_id`                                                    |
| `no_bal`                                                              | di `sortir_bal`                                                                          |
| `status_stok`: `di_gudang`, `siap_kirim`, `keluar`, `terkirim_sample` | plan: `proses_sortir`, `di_gudang`, `terkirim_sample`, `keluar` — **tanpa** `siap_kirim` |
| `gudang_id`, `lokasi_blok`                                            | **hilang** (kecuali gudang dikembalikan ke plan)                                         |
| `tanggal_masuk` / `tanggal_keluar`                                    | tidak eksplisit; bisa dari created_at / status                                           |
| dibuat saat bayar                                                     | status berubah ke `di_gudang` saat timbang selesai (perlu aturan bisnis jelas)           |


**API** `/barang` **& FE stok pre-kasir lokal harus diganti.**

---



## 5. Sample



### `sample_batch` → `pengiriman_sample`


| Lama                               | Baru                                                           |
| ---------------------------------- | -------------------------------------------------------------- |
| `batch_id`                         | `pengiriman_sample_id`                                         |
| `kode_batch`                       | `no_surat_sample` (manual, unique)                             |
| `tujuan_buyer`                     | `tujuan_buyer`                                                 |
| `permintaan_buyer`                 | `permintaan_buyer`                                             |
| `tanggal_kirim` / `tanggal_respon` | sama                                                           |
| `status`                           | `status` (enum mirip; nilai item vs batch dipisah lebih ketat) |
| `dikirim_oleh`                     | `dikirim_oleh_id` NOT NULL                                     |
| `petugas_qc_pabrik`, `catatan`     | sama                                                           |
| `is_locked`                        | — **hilang**                                                   |
| `sumber_gudang_id`                 | — **hilang** (ikut keputusan gudang)                           |
| `created_at`                       | + `updated_at`                                                 |




### `sample_batch_item` → `pengiriman_sample_bal`


| Lama                                 | Baru                                                           |
| ------------------------------------ | -------------------------------------------------------------- |
| `sample_item_id`                     | `pengiriman_sample_bal_id`                                     |
| `batch_id`                           | `pengiriman_sample_id`                                         |
| `barang_id`                          | `sortir_bal_id`                                                |
| `kode_harga_jual`                    | `master_harga_jual_id`                                         |
| `berat_sample_gram`                  | sama                                                           |
| `harga_tawaran_kg` / `harga_deal_kg` | `harga_tawaran_per_kg` / `harga_deal_per_kg`                   |
| —                                    | `berat_bruto_kg`, `estimasi_nilai` (snapshot wajib)            |
| `status_item`                        | `status_item` (default `dikirim`; enum lebih sempit)           |
| `alasan_tolak`, `catatan_nego`       | sama                                                           |
| `tanggal_evaluasi`                   | `dievaluasi_pada` timestamp                                    |
| `sudah_dikirim_do`                   | diganti link `pengiriman_reguler_bal.pengiriman_sample_bal_id` |
| —                                    | `kode_bal_pembeli` (dari item transaksi lama)                  |


---



## 6. Pengiriman reguler (DO)



### `pengiriman_barang` → `pengiriman_reguler`


| Lama                                                                     | Baru                                                      |
| ------------------------------------------------------------------------ | --------------------------------------------------------- |
| `pengiriman_id`                                                          | `pengiriman_reguler_id`                                   |
| `no_surat_jalan`                                                         | `no_surat_jalan`                                          |
| `tujuan`                                                                 | `tujuan`                                                  |
| `tanggal_kirim` / `tanggal_diterima`                                     | sama                                                      |
| `driver_nama`                                                            | `nama_supir`                                              |
| `plat_nomor`                                                             | `plat_nomor`                                              |
| `status`                                                                 | `status` (default plan: `dikirim`; lama default `dimuat`) |
| `batch_sample_id_ref`                                                    | `pengiriman_sample_id`                                    |
| `dibuat_oleh` / `petugas`                                                | `petugas_id` NOT NULL                                     |
| `jenis_pengeluaran`, `unit_produksi`, `mandor_produksi`, `nomor_kontrak` | — **hilang**                                              |
| `catatan`, `created_at`                                                  | + `updated_at`                                            |




### `pengiriman_barang_item` → `pengiriman_reguler_bal`


| Lama                                      | Baru                                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| PK komposit (`pengiriman_id`,`barang_id`) | `pengiriman_reguler_bal_id`                                 |
| `barang_id`                               | `sortir_bal_id` unique (1 bal 1x keluar)                    |
| `kode_harga_jual`                         | `master_harga_jual_id`                                      |
| `harga_deal_per_kg`                       | `harga_jual_per_kg` NOT NULL                                |
| —                                         | `berat_bruto_gudang_kg`, `berat_bruto_kirim_kg`, `subtotal` |
| —                                         | `pengiriman_sample_bal_id` (asal harga deal sample)         |




### Baru: `status_batch`

Tidak ada padanan 1 tabel. Menggantikan update status inline + log FE lokal.  
Constraint bisnis plan: tepat satu dari `pengiriman_sample_id` / `pengiriman_sample_bal_id` / `pengiriman_reguler_id` terisi.

---



## 7. Tabel orphan / pendukung


| Tabel                                                                       | Di plan? | Rekomendasi                                                                                    |
| --------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `sequence_counters`                                                         | tidak    | tetap butuh generator `no_kupon` / `no_bal` / `kode_petani` — buat ulang atau service sequence |
| `file_attachments`                                                          | tidak    | buang jika tidak dipakai (0 baris)                                                             |
| `stock_opname_session/item`                                                 | tidak    | buang atau tunda fitur (0 baris, tanpa API)                                                    |
| Views `v_transaksi_summary`, `v_stok_valuasi_grade`, `v_pengiriman_summary` | tidak    | rewrite setelah skema baru                                                                     |
| `personal_access_tokens`                                                    | tidak    | **wajib tetap**                                                                                |


---



## 8. Checklist keputusan produk (wajib sebelum coding)

Centang sebelum migrasi dikerjakan.

### A. Scope fitur

- [x] **Gudang:** tetap multi-gudang / single hardcode / dihapus total? single hardcode
- [ ] **RBAC:** enum role saja (hardcode menu di FE) **atau** pertahankan `modules` + capabilities?
- [ ] **Grade master:** buang (`kode_grade` bebas) **atau** tetap tabel master + warna badge?
- [ ] **Stock opname & file attachments:** buang resmi dari roadmap?
- [ ] **Audit:** wajib API server-side di `audit_trail`, hentikan localStorage?



### B. Aturan stok & status

- [ ] Kapan `sortir_bal.status_stok` = `di_gudang`? (setelah timbang? setelah kasir lunas?)
- [ ] Apakah `siap_kirim` dihapus? Lalu kapan bal boleh masuk DO?
- [ ] Bolehkah sample/DO memakai bal yang **belum lunas** di kasir?
- [ ] Default status DO: `dimuat` (lama) atau `dikirim` (plan)?
- [ ] Siapa boleh hapus sample / DO sesuai catatan plan?



### C. Identitas & nomor

- [ ] Konfirmasi: PK integer internal; nomor bisnis (`kode_petani`, `no_kupon`, `no_bal`, `no_surat_*`) tetap string unique?
- [ ] `no_surat_sample` & `no_surat_jalan`: **manual** (plan) atau auto sequence?
- [ ] Format generator `no_bal` / `no_kupon` sama seperti sekarang?



### D. Kolom yang hilang — terima atau kembalikan ke plan?

- [ ] `users.unit_penugasan`
- [ ] `tabel_harga.rate_potongan_per_bal`, `berat_standar_kg`, `deskripsi`
- [ ] Nota: `dicetak_oleh`, `unduh_nota_count`
- [ ] Item: `barcode`, `lokasi_simpan`, `sample_label_*`
- [ ] DO: `jenis_pengeluaran`, `nomor_kontrak`, `unit_produksi`, `mandor_produksi`
- [ ] Sample: `is_locked`



### E. Migrasi data & lingkungan

- [ ] Target pertama: **lokal saja** (data kecil) atau termasuk remote?
- [ ] Strategi: big-bang cutover **atau** dual-write / fase per domain?
- [ ] Setelah cutover: FE online-only (hapus jalur localStorage kritis) atau hybrid sementara?

---



## 9. Urutan migrasi yang disarankan (setelah keputusan)

1. **Master:** `pengguna` (+ tokens), `master_petani`, `master_harga_beli`, `master_harga_jual` (+ keputusan gudang/grade/RBAC)
2. **Pembelian:** `sortir` → `sortir_bal` → `timbangan` → `kasir` → `kasir_detail` + ETL dari transaksi lama
3. **Stok:** map `barang` → update `sortir_bal.status_stok` (tanpa tabel `barang`)
4. **Sample & DO:** `pengiriman_`* + ETL dari batch/pengiriman lama
5. `status_batch` **+** `audit_trail`
6. Drop tabel lama + rewrite API/FE
7. Rewrite views dashboard / laporan

---



## 10. Estimasi dampak kode (pengingat)


| Layer                                                                                        | Dampak                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Backend models/controllers/services/schema/seed                                              | hampir semua domain                         |
| Frontend `erpApi.ts`, types, `App.tsx`, modul transaksi/sample/pengiriman/harga/user/laporan | hampir semua                                |
| Data lokal                                                                                   | rendah (puluhan baris)                      |
| Data remote                                                                                  | **belum diukur** — cek dulu sebelum cutover |


Dokumen ini hanya mapping & keputusan. Belum termasuk script migrasi SQL atau perubahan aplikasi.

hold on dulu soal ini, nanti ketika saya minta "lanjut rencana mapping db". kita lanjut percakapan ini
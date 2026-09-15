# Instruksi Pembuatan ERD (Entity Relationship Diagram) — ERP Sekar Maju Sejahtera

| Item | Detail |
|---|---|
| Tool | [dbdiagram.io](https://dbdiagram.io) (bahasa DBML) |
| Sumber struktur data | `src/types/index.ts`, `src/utils/storage.ts` (kunci penyimpanan `_v32`) |
| Tanggal penyusunan | 2026-09-16 |
| Status | Siap dipakai; skrip DBML pada §4 dapat langsung ditempel |

---

## 1. Latar belakang & catatan penting

1. Aplikasi saat ini **tidak memakai database server**. Seluruh data disimpan di `localStorage` browser sebagai dokumen JSON (dikompresi lz-string), satu kunci per entitas (`erp_tembakau_petani_v32`, `erp_tembakau_transaksi_v32`, dst.).
2. ERD ini adalah **model relasional logis** dari struktur JSON tersebut. Ia berguna untuk dokumentasi, review integritas data, dan sebagai cetak biru migrasi ke database (PostgreSQL/MySQL) di kemudian hari.
3. Beberapa field di JSON berbentuk **array/objek tersarang** (mis. `TransaksiPembelian.items[]`, `PengirimanBarang.barang_ids[]`, `harga_deal_map{}`, `rincian_grade{}`, `Petani.statistik{}`). Dalam ERD, struktur tersarang dinormalisasi menjadi tabel anak atau kolom terpisah. Pemetaan lengkap ada di §5.
4. Relasi ditandai sebagai:
   - **Referensi kuat** (garis penuh di diagram): kolom benar-benar menyimpan ID entitas lain (mis. `barang.transaksi_pembelian_id`).
   - **Referensi logis** (dicatat di `Note`): aplikasi hanya menyimpan nilai teks yang sama (mis. `transaksi_pembelian.no_kupon`, `dibayar_oleh` berisi nama, `kode_grade` merujuk `master_harga_beli.kode_grade`). Tetap digambar sebagai relasi agar diagram informatif, tetapi tidak ada foreign key nyata di aplikasi.

---

## 2. Langkah membuat diagram di dbdiagram.io

1. Buka https://dbdiagram.io dan masuk (akun Google/GitHub/email gratis).
2. Klik **New Diagram** (atau **Create new diagram** di dashboard).
3. Ganti judul diagram menjadi `ERP Sekar Maju Sejahtera - ERD v1`.
4. Hapus contoh kode di panel kiri, lalu **tempel seluruh skrip DBML pada §4** (mulai dari baris `Project ...` sampai akhir).
5. Tunggu render otomatis di panel kanan. Jika ada error, panel akan menunjuk baris yang bermasalah; pastikan tidak ada baris yang terpotong saat menyalin.
6. Rapikan tata letak: seret tabel per kelompok mengikuti `TableGroup` (Master Data, Transaksi Pembelian, Inventaris, Sample & QC, Pengiriman, Sistem). Susunan yang disarankan, dari kiri ke kanan:
   `users / audit_log` → `petani, master_harga_beli, master_harga_jual, master_barang` → `kupon_antrian, transaksi_pembelian, transaksi_item_bal` → `barang` → `batch_pengiriman_sample, sample_item_detail, pengiriman_sample` → `pengiriman_barang, pengiriman_barang_item, pengiriman_rincian_grade` → `stock_opname_session, stock_opname_item`.
7. Aktifkan **Auto-arrange** (ikon di toolbar) bila ingin tata letak otomatis, lalu sesuaikan manual.
8. Ekspor: menu **Export** → **PNG** (untuk dokumen), **PDF**, atau **Export to SQL** (PostgreSQL/MySQL/SQL Server) jika akan dipakai sebagai skema migrasi.
9. Bagikan: **Share** → salin tautan publik/privat, atau simpan tautan tersebut di README/dokumen arsitektur.

Tips DBML yang dipakai di skrip:
- `[pk]` primary key, `[ref: > tabel.kolom]` relasi banyak-ke-satu, `[ref: - tabel.kolom]` satu-ke-satu, `[note: '...']` keterangan kolom.
- `Enum` mendefinisikan nilai status yang dipakai aplikasi.
- `TableGroup` hanya untuk pengelompokan visual.

---

## 3. Daftar entitas & relasi utama

| Entitas (tabel) | Sumber tipe | Kunci | Relasi utama |
|---|---|---|---|
| users | `User` | user_id | dibayar_oleh/operator pada transaksi (logis, berisi nama) |
| petani | `Petani` | petani_id (`PTN-YYYY-XXX`) | 1 → banyak transaksi_pembelian, barang, kupon_antrian |
| master_harga_beli | `TabelHarga` | harga_id | kode_grade dipakai transaksi_item_bal & barang (logis) |
| master_harga_jual | `MasterHargaJual` | harga_jual_id | kode dipakai sample_item_detail & pengiriman_barang_item (logis) |
| master_barang | `MasterBarang` | master_id | referensi kode_grade (logis) |
| kupon_antrian | `KuponAntrian` | kupon_id | nomor_kupon = transaksi_pembelian.no_kupon (logis) |
| transaksi_pembelian | `TransaksiPembelian` | transaksi_id (`TRX-DDMMYYYY-XXX`) | 1 → banyak transaksi_item_bal, barang |
| transaksi_item_bal | `TransaksiItemBal` (array `items`) | item_id | 1 – 1 barang (barang_id) |
| barang | `Barang` | barang_id | milik petani & transaksi; dipakai sample_item_detail & pengiriman_barang_item |
| batch_pengiriman_sample | `BatchPengirimanSample` | batch_id | 1 → banyak sample_item_detail; 1 → banyak pengiriman_barang (batch_sample_id_ref) |
| sample_item_detail | `SampleItemDetail` (array `items`) | sample_item_id | → barang, → master_harga_jual (logis) |
| pengiriman_sample | `PengirimanSample` (legacy per-sample) | sample_id | → batch, → barang |
| pengiriman_barang | `PengirimanBarang` (Surat Jalan / DO) | pengiriman_id | 1 → banyak pengiriman_barang_item, pengiriman_rincian_grade |
| pengiriman_barang_item | normalisasi `barang_ids[]`, `barcode_list[]`, `harga_deal_map{}`, `kode_harga_jual_map{}` | (pengiriman_id, barang_id) | → barang |
| pengiriman_rincian_grade | normalisasi `rincian_grade{}` | (pengiriman_id, kode_grade) | — |
| stock_opname_session | `StockOpnameSession` | opname_id | 1 → banyak stock_opname_item |
| stock_opname_item | `StockOpnameItemDetail` (array `items_detail`) | (opname_id, barang_id) | → barang |
| audit_log | `AuditLogEntry` | log_id | target_id merujuk entitas apa pun (polimorfik, logis) |

Alur bisnis yang tercermin di relasi: **petani → kupon → transaksi_pembelian → transaksi_item_bal → barang (stok gudang) → sample_item_detail (evaluasi buyer, opsional) → pengiriman_barang_item (Surat Jalan/DO) → status_stok barang = keluar**.

---

## 4. Skrip DBML (tempel ke dbdiagram.io)

```dbml
Project erp_sekar_maju_sejahtera {
  database_type: 'PostgreSQL'
  Note: '''
  ERD logis ERP Sekar Maju Sejahtera (Sistem Manajemen Gudang Tembakau).
  Sumber: src/types/index.ts. Aplikasi saat ini menyimpan data sebagai dokumen JSON di localStorage
  (kunci erp_tembakau_*_v32); tabel anak pada diagram ini adalah normalisasi dari array/objek tersarang.
  Kolom bertanda (logis) hanya menyimpan nilai teks yang sama, tanpa foreign key nyata di aplikasi.
  '''
}

// ===================== ENUM =====================
Enum user_role {
  superadmin
  admin_sortir
  admin_timbang
  admin_kasir
  admin_pengiriman
  kepala_gudang
}

Enum status_harga {
  aktif
  nonaktif
}

Enum status_kupon {
  menunggu
  dipanggil
  selesai
  batal
}

Enum status_transaksi {
  lengkap
  menunggu
}

Enum status_tahap {
  proses_sortir
  menunggu_timbang
  lengkap
}

Enum status_pembayaran {
  lunas
  belum_lunas
}

Enum metode_pembayaran {
  cash
  kredit
}

Enum status_nota {
  belum_cetak
  sudah_cetak
}

Enum jenis_timbang {
  bruto
  netto
}

Enum status_timbang {
  menunggu_timbang
  selesai_timbang
}

Enum status_stok_barang {
  di_gudang
  siap_kirim
  keluar
  terkirim_sample
}

Enum status_sample {
  sample
  dikirim
  diterima
  disetujui
  ditolak
  nego
}

Enum status_batch_sample {
  sample
  diproses
  dikirim
  dibatalkan
  selesai
}

Enum status_pengiriman {
  dimuat
  dalam_perjalanan
  diterima
  dikirim
  selesai
}

Enum status_opname {
  draft
  proses
  selesai
}

Enum status_fisik_opname {
  ditemukan
  tidak_ditemukan
  tambahan_baru
}

// ===================== SISTEM =====================
Table users {
  user_id varchar [pk, note: 'USR-001']
  username varchar [unique, not null, note: 'Login (dibandingkan case-insensitive); akun produksi: Sekarmajuadmin']
  password varchar [note: 'Hash SHA-256 (64 hex). Nilai lama plaintext masih diterima (fallback migrasi)']
  nama_lengkap varchar [not null]
  role user_role [not null]
  email varchar [note: 'Bisa dipakai sebagai identifier login']
  no_hp varchar
  unit_penugasan varchar [not null]
  status_aktif boolean [not null, default: true]
  terakhir_login timestamp
  dibuat_pada timestamp [not null]
}

Table audit_log {
  log_id varchar [pk, note: 'LOG-<epoch>-<rand>']
  timestamp timestamp [not null]
  user_nama varchar [not null, note: 'Nama pengguna pelaku (bukan user_id)']
  user_role varchar [not null]
  modul varchar [not null, note: 'mis. Transaksi Pembelian']
  aksi varchar [not null, note: 'TAMBAH_TRANSAKSI, UBAH_TRANSAKSI, HAPUS_TRANSAKSI, TIMBANG_BAL, ...']
  target_id varchar [not null, note: 'ID entitas terkait (polimorfik, logis)']
  deskripsi text [not null]
  rincian_perubahan text [note: 'Array string before/after (JSON)']
  Note: 'Disimpan maksimal 500 entri terakhir'
}

// ===================== MASTER DATA =====================
Table petani {
  petani_id varchar [pk, note: 'PTN-YYYY-XXX, dibuat otomatis berurutan']
  nama_petani varchar [not null]
  no_hp varchar [not null]
  alamat varchar [not null]
  desa_kecamatan varchar
  status_aktif boolean [not null, default: true]
  tanggal_daftar date
  catatan text
  alasan_nonaktif text
  // statistik{} (tersarang) -> kolom
  stat_total_setoran_bal int [note: 'statistik.total_setoran_bal']
  stat_total_berat_kg decimal(10,3) [note: 'statistik.total_berat_kg']
  stat_kunjungan_terakhir date [note: 'statistik.kunjungan_terakhir']
  stat_grade_dominan varchar [note: 'statistik.grade_dominan']
}

Table master_harga_beli {
  harga_id varchar [pk, note: 'HB-xx / HB-<epoch>']
  kode_grade varchar [unique, not null, note: 'Kode harga beli, mis. 30..70, A']
  nama_grade varchar [not null]
  warna_badge varchar
  harga_per_kg decimal(14,2) [not null]
  harga_jual_per_kg decimal(14,2)
  rate_potongan_per_bal decimal(14,2) [note: 'default 2000']
  rate_potongan_per_10kg decimal(14,2) [note: 'legacy alias']
  berat_standar_kg decimal(10,3) [note: 'default 50']
  tanggal_berlaku date [not null]
  tanggal_berakhir date
  status status_harga [not null]
  dibuat_oleh varchar [not null]
  deskripsi text
}

Table master_harga_jual {
  harga_jual_id varchar [pk, note: 'HJ-xx / HJ-<epoch>']
  kode varchar [unique, not null, note: 'Kode harga jual, mis. 40..80, HJ-A']
  harga_jual decimal(14,2) [not null]
  tanggal_berlaku date [not null]
  status_aktif boolean [default: true]
}

Table master_barang {
  master_id varchar [pk]
  kode_barang varchar [not null]
  nama_barang varchar [not null]
  kode_grade varchar [not null, note: '(logis) -> master_harga_beli.kode_grade']
  kategori varchar
  varietas varchar
  berat_standar_kg decimal(10,3)
  satuan varchar
  harga_referensi_kg decimal(14,2)
  lokasi_default_gudang varchar
  status_aktif boolean [default: true]
  tanggal_dibuat date
  Note: 'Modul UI-nya tidak dirutekan di App.tsx saat ini (kode ada, tidak dipakai)'
}

// ===================== TRANSAKSI PEMBELIAN =====================
Table kupon_antrian {
  kupon_id varchar [pk]
  nomor_kupon varchar [not null, note: 'mis. KUP0001; (logis) = transaksi_pembelian.no_kupon']
  petani_id varchar [ref: > petani.petani_id]
  nama_petani varchar
  waktu_kedatangan timestamp
  status status_kupon [not null]
}

Table transaksi_pembelian {
  transaksi_id varchar [pk, note: 'TRX-DDMMYYYY-XXX']
  no_kupon varchar [not null, note: 'Unik per transaksi; (logis) -> kupon_antrian.nomor_kupon']
  petani_id varchar [not null, ref: > petani.petani_id]
  nama_petani varchar [not null, note: 'Snapshot nama saat transaksi']
  no_hp varchar
  desa_kecamatan varchar
  no_bal varchar [note: 'Ringkasan nomor bal, mis. "A0001, A0002"']
  kode_bal_pembeli varchar
  kode_grade varchar [not null, note: 'Grade utama atau "Multi (...)"']
  total_bal int
  bal_selesai_timbang int
  jenis_timbang jenis_timbang [not null]
  berat_terukur_kg decimal(10,3) [note: 'Total bruto']
  potongan_tara_kg decimal(10,3) [note: 'Total tara']
  berat_kg decimal(10,3) [not null, note: 'Total netto (tidak dibulatkan)']
  harga_per_kg decimal(14,2) [not null, note: 'Snapshot / rata-rata harga beli']
  rate_potongan_per_10kg decimal(14,2)
  total_kotor decimal(16,2)
  potongan_kuli decimal(14,2) [not null, note: 'Rp 7.000 x bal']
  potongan_tali decimal(14,2) [note: 'Rp 3.000 x bal']
  potongan_tikar decimal(14,2) [not null, note: 'Rp 75.000 x bal ganti tikar']
  total_potongan decimal(14,2) [not null]
  pajak decimal(14,2)
  total_harga_beli decimal(16,2) [not null, note: 'Σ netto x harga_per_kg']
  harga_final decimal(16,2) [not null, note: 'total_harga_beli - total_potongan']
  status_transaksi status_transaksi [not null]
  status_tahap status_tahap
  status_pembayaran status_pembayaran
  metode_pembayaran metode_pembayaran
  catatan_kasir text
  dibayar_pada timestamp
  dibayar_oleh varchar [note: '(logis) nama pengguna kasir']
  status_nota status_nota
  dicetak_pada timestamp
  dicetak_oleh varchar
  unduh_nota_count int
  tanggal_transaksi date [not null]
  operator_nama varchar [not null, note: '(logis) nama pengguna']
  petugas_sortir varchar
  petugas_timbang varchar
  barang_id_terkait varchar
  barcode_terkait varchar
  catatan_qc text
  catatan text
  terakhir_diubah_oleh varchar
  terakhir_diubah_pada timestamp
  alasan_perubahan_terakhir text [note: 'Wajib saat koreksi transaksi']
}

Table transaksi_item_bal {
  item_id varchar [pk, note: 'Dari array TransaksiPembelian.items[]']
  transaksi_id varchar [not null, ref: > transaksi_pembelian.transaksi_id]
  no_bal varchar [not null, note: 'Unik di inventaris; prefix SB = tara 2 kg']
  kode_bal_pembeli varchar
  barcode varchar
  kode_grade varchar [not null, ref: > master_harga_beli.kode_grade, note: '(logis) kode harga beli']
  harga_per_kg decimal(14,2) [not null, note: 'Snapshot harga saat sortir']
  ganti_tikar boolean [default: false]
  berat_bruto_kg decimal(10,3)
  potongan_tara_kg decimal(10,3) [note: 'SB=2; <=49:3; 50-59:5; >=60:6']
  is_netto_manual boolean [default: false]
  berat_kg decimal(10,3) [not null, note: 'Netto final (0 = belum ditimbang)']
  potongan_kuli decimal(14,2) [note: '7000']
  potongan_tali decimal(14,2) [note: '3000']
  potongan_tikar decimal(14,2) [note: '75000 jika ganti_tikar']
  potongan decimal(14,2) [not null, note: 'kuli + tali + tikar']
  total_kotor decimal(16,2) [not null, note: 'berat_kg x harga_per_kg']
  subtotal_bersih decimal(16,2) [not null, note: 'total_kotor - potongan']
  status_timbang status_timbang
  lokasi_simpan varchar [note: 'Blok A, Blok B, ...']
  sample_label_code varchar
  sample_label_printed boolean
  barang_id varchar [ref: - barang.barang_id, note: 'Bal inventaris yang dihasilkan']
  catatan text
}

// ===================== INVENTARIS GUDANG =====================
Table barang {
  barang_id varchar [pk, note: 'BAL-<DDMMYYYY-XXX>-NN']
  kode_grade varchar [not null, note: '(logis) -> master_harga_beli.kode_grade']
  no_bal varchar [not null, note: 'Nomor bal / barcode fisik']
  kode_bal_pembeli varchar
  berat_kg decimal(10,3) [not null, note: 'Netto']
  harga_per_kg decimal(14,2)
  total_harga decimal(16,2) [note: 'berat_kg x harga_per_kg']
  berat_bruto_kg decimal(10,3)
  potongan_tara_kg decimal(10,3)
  status_stok status_stok_barang [not null]
  tanggal_masuk date [not null]
  tanggal_keluar date
  petani_id varchar [not null, ref: > petani.petani_id]
  transaksi_pembelian_id varchar [ref: > transaksi_pembelian.transaksi_id]
  pengiriman_id varchar [ref: > pengiriman_barang.pengiriman_id, note: 'Diisi saat bal keluar via Surat Jalan']
  nama_petani varchar
  desa_kecamatan varchar
  catatan text
}

// ===================== SAMPLE & QC BUYER =====================
Table batch_pengiriman_sample {
  batch_id varchar [pk, note: 'SMP-BATCH-... / SPL0001']
  kode_batch varchar [not null]
  tujuan_buyer varchar [not null]
  is_locked boolean [default: false, note: 'Terkunci setelah diproses DO']
  permintaan_buyer text
  sumber_gudang varchar
  tanggal_kirim date [not null]
  tanggal_respon date
  status status_batch_sample [not null]
  dikirim_oleh varchar [not null]
  petugas_qc_pabrik varchar
  catatan text
  total_sample_bal int
  total_bal_disetujui int
  total_bal_ditolak int
  total_bal_nego int
  total_estimasi_nilai decimal(16,2)
  total_nilai_deal decimal(16,2)
}

Table sample_item_detail {
  sample_item_id varchar [pk, note: 'Dari array BatchPengirimanSample.items[]']
  batch_id varchar [not null, ref: > batch_pengiriman_sample.batch_id]
  barang_id varchar [not null, ref: > barang.barang_id]
  no_bal varchar [not null]
  kode_bal_pembeli varchar
  kode_grade varchar [not null]
  kode_harga_jual varchar [ref: > master_harga_jual.kode, note: '(logis)']
  berat_bal_kg decimal(10,3) [not null]
  berat_bruto_kg decimal(10,3)
  potongan_tara_kg decimal(10,3)
  berat_sample_gram decimal(10,2)
  harga_beli_kg decimal(14,2)
  harga_tawaran_kg decimal(14,2) [not null]
  harga_deal_kg decimal(14,2)
  status_item status_sample [not null]
  alasan_tolak text
  catatan_nego text
  tanggal_evaluasi date
  nama_petani varchar
  sudah_dikirim_do boolean [default: false]
  no_surat_jalan_do varchar [note: '(logis) -> pengiriman_barang.no_surat_jalan']
}

Table pengiriman_sample {
  sample_id varchar [pk, note: 'Legacy: satu baris per sampel (sebelum model batch)']
  batch_id varchar [ref: > batch_pengiriman_sample.batch_id]
  barang_id varchar [ref: > barang.barang_id]
  barcode_sumber varchar
  no_bal varchar
  kode_grade varchar [not null]
  sumber varchar [not null]
  tujuan varchar [not null]
  berat_sample_gram decimal(10,2) [not null]
  berat_bal_kg decimal(10,3)
  berat_bruto_kg decimal(10,3)
  potongan_tara_kg decimal(10,3)
  harga_beli_kg decimal(14,2)
  harga_tawaran_kg decimal(14,2)
  harga_deal_kg decimal(14,2)
  tanggal_kirim date [not null]
  tanggal_respon date
  status status_sample [not null]
  alasan_tolak text
  catatan_nego text
  catatan text
  dikirim_oleh varchar [not null]
  nama_petani varchar
  sudah_dikirim_do boolean
  no_surat_jalan_do varchar
  permintaan_buyer text
}

// ===================== PENGIRIMAN (SURAT JALAN / DO) =====================
Table pengiriman_barang {
  pengiriman_id varchar [pk, note: 'Urutan sederhana "1", "2", ...']
  no_surat_jalan varchar [not null, note: 'Saat ini = urutan sederhana (lihat BUG-012)']
  tujuan varchar [not null, note: 'Pabrik / gudang buyer']
  jenis_pengeluaran varchar
  unit_produksi varchar
  mandor_produksi varchar
  driver_nama varchar [not null]
  plat_nomor varchar [not null, note: 'Disimpan huruf besar']
  tanggal_kirim date [not null]
  tanggal_diterima date
  total_bal int [not null]
  total_berat_kg decimal(10,3) [not null]
  status status_pengiriman [not null, note: 'Status awal saat terbit: dikirim']
  sample_id_ref varchar [note: '(logis) -> pengiriman_sample.sample_id']
  batch_sample_id_ref varchar [ref: > batch_pengiriman_sample.batch_id, note: 'Diisi bila DO ditarik dari batch sample']
  total_nilai_deal decimal(16,2) [note: 'Σ berat x harga deal']
  nomor_kontrak varchar
  catatan text
  petugas varchar
  dibuat_oleh varchar
}

Table pengiriman_barang_item {
  pengiriman_id varchar [not null, ref: > pengiriman_barang.pengiriman_id]
  barang_id varchar [not null, ref: > barang.barang_id]
  barcode varchar [note: 'Dari barcode_list[] (indeks sama dengan barang_ids[])']
  harga_deal_per_kg decimal(14,2) [note: 'Dari harga_deal_map{barang_id}']
  kode_harga_jual varchar [ref: > master_harga_jual.kode, note: 'Dari kode_harga_jual_map{barang_id} (logis)']
  indexes {
    (pengiriman_id, barang_id) [pk]
  }
  Note: 'Normalisasi array barang_ids[], barcode_list[], harga_deal_map{}, kode_harga_jual_map{} pada PengirimanBarang'
}

Table pengiriman_rincian_grade {
  pengiriman_id varchar [not null, ref: > pengiriman_barang.pengiriman_id]
  kode_grade varchar [not null]
  jumlah_bal int [not null]
  total_kg decimal(10,3) [not null]
  indexes {
    (pengiriman_id, kode_grade) [pk]
  }
  Note: 'Normalisasi objek rincian_grade{kode_grade: {bal, kg}}'
}

// ===================== STOCK OPNAME =====================
Table stock_opname_session {
  opname_id varchar [pk]
  judul_opname varchar [not null]
  tanggal_opname date [not null]
  petugas_opname varchar [not null]
  target_grade varchar
  total_sistem_bal int
  total_fisik_bal int
  total_selisih_bal int
  total_berat_sistem_kg decimal(10,3)
  total_berat_fisik_kg decimal(10,3)
  status status_opname [not null]
  catatan text
}

Table stock_opname_item {
  opname_id varchar [not null, ref: > stock_opname_session.opname_id]
  barang_id varchar [not null, ref: > barang.barang_id]
  barcode varchar
  no_bal varchar
  kode_bal_pembeli varchar
  kode_grade varchar
  berat_kg decimal(10,3)
  status_sistem status_stok_barang
  status_fisik status_fisik_opname [not null]
  waktu_scan timestamp
  indexes {
    (opname_id, barang_id) [pk]
  }
  Note: 'Dari array StockOpnameSession.items_detail[]'
}

// ===================== PENGELOMPOKAN VISUAL =====================
TableGroup sistem {
  users
  audit_log
}

TableGroup master_data {
  petani
  master_harga_beli
  master_harga_jual
  master_barang
}

TableGroup transaksi_pembelian_grp {
  kupon_antrian
  transaksi_pembelian
  transaksi_item_bal
}

TableGroup inventaris {
  barang
  stock_opname_session
  stock_opname_item
}

TableGroup sample_qc {
  batch_pengiriman_sample
  sample_item_detail
  pengiriman_sample
}

TableGroup pengiriman {
  pengiriman_barang
  pengiriman_barang_item
  pengiriman_rincian_grade
}
```

---

## 5. Pemetaan struktur JSON → tabel ERD

| Struktur di aplikasi (localStorage) | Representasi di ERD |
|---|---|
| `Petani.statistik { total_setoran_bal, total_berat_kg, kunjungan_terakhir, grade_dominan }` | Kolom `stat_*` pada tabel `petani` |
| `TransaksiPembelian.items: TransaksiItemBal[]` | Tabel `transaksi_item_bal` (FK `transaksi_id`) |
| `TransaksiPembelian.barang_ids: string[]` | Diturunkan dari `transaksi_item_bal.barang_id` / `barang.transaksi_pembelian_id` (tidak dibuat tabel terpisah) |
| `BatchPengirimanSample.items: SampleItemDetail[]` | Tabel `sample_item_detail` (FK `batch_id`) |
| `PengirimanBarang.barang_ids[]`, `barcode_list[]`, `harga_deal_map{}`, `kode_harga_jual_map{}` | Tabel `pengiriman_barang_item` (satu baris per bal) |
| `PengirimanBarang.rincian_grade{ kode: {bal, kg} }` | Tabel `pengiriman_rincian_grade` |
| `StockOpnameSession.items_detail[]` | Tabel `stock_opname_item` |
| `AuditLogEntry.rincian_perubahan: string[]` | Kolom `text` (JSON array) pada `audit_log` |
| `User.password` (hash SHA-256) | Kolom `password` pada `users`; simpan hanya hash |

Kunci localStorage (untuk referensi migrasi): `erp_tembakau_users_v32`, `erp_tembakau_petani_v32`, `erp_tembakau_harga_v32`, `erp_tembakau_harga_jual_v32`, `erp_tembakau_master_barang_v32`, `erp_tembakau_transaksi_v32`, `erp_tembakau_barang_v32`, `erp_tembakau_sample_v32`, `erp_tembakau_batch_sample_v32`, `erp_tembakau_pengiriman_v32`, `erp_tembakau_stock_opname_v32`, `erp_tembakau_audit_log_v32`, ditambah `erp_tembakau_current_user_v32`, `erp_tembakau_auth_session`, `erp_explicit_logout`, `erp_tembakau_active_module` untuk sesi/preferensi (bukan entitas bisnis).

---

## 6. Aturan bisnis yang perlu dicatat di diagram (gunakan `Note`)

- **Tara per bal:** prefix nomor bal `SB` = 2 kg; selain itu bruto ≤ 49 kg = 3 kg, 50–59 kg = 5 kg, ≥ 60 kg = 6 kg. Bal `SB` maksimal 50 kg.
- **Potongan per bal:** kuli Rp 7.000 + tali Rp 3.000 + tikar Rp 75.000 (hanya jika `ganti_tikar`).
- **Nilai:** `total_kotor = berat_kg × harga_per_kg`; `subtotal_bersih = total_kotor − potongan`; `harga_final = Σ total_kotor − Σ potongan`.
- **Berat tidak dibulatkan** (keputusan 15-09-2026): simpan desimal apa adanya (tipe `decimal(10,3)` disarankan).
- **Snapshot harga:** `harga_per_kg` pada item transaksi adalah harga saat sortir; perubahan Master Harga Beli tidak mengubah transaksi lama.
- **Status stok bal:** `di_gudang` → `terkirim_sample` (opsional) → `keluar` saat Surat Jalan terbit; menghapus DO mengembalikan bal ke `di_gudang`.
- **Dashboard** hanya menghitung transaksi `status_pembayaran = lunas`; profit DO dihitung untuk status `dikirim`, `dalam_perjalanan`, `diterima`, `selesai`.

---

## 7. Checklist verifikasi diagram

- [ ] 18 tabel dan 16 enum ter-render tanpa error DBML.
- [ ] Relasi `petani → transaksi_pembelian → transaksi_item_bal → barang` tergambar sebagai rantai utama.
- [ ] `pengiriman_barang_item` menghubungkan `pengiriman_barang` dan `barang` (banyak-ke-banyak).
- [ ] `batch_pengiriman_sample` terhubung ke `sample_item_detail` dan ke `pengiriman_barang.batch_sample_id_ref`.
- [ ] Kolom bertanda `(logis)` diberi catatan bahwa tidak ada foreign key nyata di aplikasi.
- [ ] Judul diagram, tanggal, dan versi (`v1`, 2026-09-16) tercantum di `Project.Note` atau nama diagram.
- [ ] Hasil ekspor PNG/PDF disimpan ke `docs/` (mis. `docs/ERD_ERP_Sekar_Maju_Sejahtera_v1.png`) dan tautan dbdiagram dicatat di README.

Project erp_sa_group_tembakau {
  database_type: 'PostgreSQL'
  Note: 'ERP gudang tembakau S.A Group. Alur: Master Petani > Sortir > Timbangan > Kasir > Pengiriman Sample / Reguler (DO). Pembelian memakai berat netto, pengiriman memakai berat bruto'
}

// =====================================================================
// ENUM
// =====================================================================

Enum role_pengguna {
  superadmin
  admin_sortir
  admin_timbang
  admin_kasir
  admin_pengiriman
  kepala_gudang
}

Enum status_tahap_sortir {
  proses_sortir [note: 'Bal masih ditambahkan petugas sortir']
  menunggu_timbang [note: 'Sortir selesai, masih ada bal belum ditimbang']
  lengkap [note: 'Semua bal dalam kupon sudah ditimbang']
}

Enum status_stok_bal {
  proses_sortir [note: 'Sudah disortir, belum ditimbang']
  di_gudang
  terkirim_sample
  keluar [note: 'Sudah dikirim lewat Surat Jalan (DO)']
}

Enum status_pembayaran {
  belum_lunas [note: 'Kredit, belum masuk valuasi / nilai pembelian / aset']
  lunas
}

Enum status_nota {
  belum_cetak
  sudah_cetak
}

Enum status_pengiriman_sample {
  sample
  diproses
  dikirim
  selesai
  dibatalkan
}

Enum status_item_sample {
  dikirim
  disetujui
  nego
  ditolak
}

Enum status_pengiriman_reguler {
  dimuat [note: 'Satu-satunya status yang masih boleh dihapus']
  dikirim
  dalam_perjalanan
  diterima
  selesai
}

// =====================================================================
// GRUP MENU
// =====================================================================

TableGroup master_data {
  master_petani
  master_harga_beli
  master_harga_jual
}

TableGroup pembelian {
  sortir
  sortir_bal
  timbangan
  kasir
  kasir_detail
}

TableGroup pengiriman_barang {
  pengiriman_sample
  pengiriman_sample_bal
  pengiriman_reguler
  pengiriman_reguler_bal
  status_batch
}

TableGroup manajemen_pengguna {
  pengguna
  audit_trail
}

// =====================================================================
// MANAJEMEN PENGGUNA
// =====================================================================

Table pengguna {
  pengguna_id integer [pk, increment]
  username varchar(50) [not null, unique, note: 'Identitas yang tampil dan dipakai login']
  password_hash varchar(255) [not null]
  nama_lengkap varchar(100) [not null, note: 'Dicetak sebagai Petugas Logistik / Pengirim saat akun ini mencetak Surat Jalan']
  role role_pengguna [not null]
  email varchar(100) [unique]
  no_hp varchar(20)
  status_aktif boolean [not null, default: true, note: 'Nonaktifkan, jangan hapus, bila sudah punya riwayat transaksi']
  terakhir_login timestamp
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  Note: 'Menu: Manajemen Pengguna'
}

Table audit_trail {
  audit_trail_id integer [pk, increment]
  pengguna_id integer [not null]
  modul varchar(50) [not null, note: 'Nama menu, mis. Sortir, Timbangan, Kasir']
  aksi varchar(50) [not null, note: 'mis. TAMBAH, UBAH, HAPUS, TIMBANG_BAL, BAYAR']
  nama_tabel varchar(50) [not null]
  record_id integer [not null, note: 'Primary key baris yang berubah pada nama_tabel']
  nomor_referensi varchar(50) [note: 'Nomor yang dilihat pengguna: No Kupon, No Bal, No Surat Jalan']
  deskripsi text [not null]
  rincian_perubahan jsonb
  created_at timestamp [not null, default: `now()`]

  indexes {
    (nama_tabel, record_id)
    created_at
  }

  Note: 'Menu: Manajemen Pengguna > Audit Trail. Hanya ditambah, tidak diubah atau dihapus'
}

// =====================================================================
// MASTER DATA
// =====================================================================

Table master_petani {
  master_petani_id integer [pk, increment]
  kode_petani varchar(20) [not null, unique, note: 'Nomor kartu petani, mis. PTN-2026-001']
  nama_petani varchar(100) [not null]
  no_hp varchar(20) [note: 'Opsional']
  alamat text [note: 'Opsional']
  desa_kecamatan varchar(100)
  tanggal_daftar date [not null, default: `current_date`]
  status_aktif boolean [not null, default: true]
  alasan_nonaktif text
  catatan text
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    nama_petani
  }

  Note: 'Menu: Master Data > Master Petani. Statistik setoran dihitung dari sortir, tidak disimpan'
}

Table master_harga_beli {
  master_harga_beli_id integer [pk, increment]
  kode_grade varchar(10) [not null, note: 'Kode harga beli / grade, mis. A, B, A1']
  harga_per_kg decimal(15,2) [not null, note: 'Dikalikan berat netto']
  tanggal_berlaku date [not null]
  status_aktif boolean [not null, default: true]
  dibuat_oleh_id integer [not null]
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    (kode_grade, tanggal_berlaku) [unique]
  }

  Note: 'Menu: Master Data > Master Harga Beli. Perubahan harga = baris baru, harga lama dinonaktifkan'
}

Table master_harga_jual {
  master_harga_jual_id integer [pk, increment]
  kode varchar(30) [not null, note: 'Kode harga jual, mis. HJ-45']
  harga_jual_per_kg decimal(15,2) [not null, note: 'Dikalikan berat bruto kirim']
  tanggal_berlaku date [not null]
  status_aktif boolean [not null, default: true]
  dibuat_oleh_id integer [not null]
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    (kode, tanggal_berlaku) [unique]
  }

  Note: 'Menu: Master Data > Master Harga Jual. Dipakai pengiriman sample dan DO'
}

// =====================================================================
// PEMBELIAN (berat netto)
// =====================================================================

Table sortir {
  sortir_id integer [pk, increment]
  no_kupon varchar(20) [not null, unique, note: 'Nomor kupon petani, mis. KUP0001']
  master_petani_id integer [not null]
  tanggal_sortir date [not null]
  status_tahap status_tahap_sortir [not null, default: 'proses_sortir']
  petugas_sortir_id integer [not null]
  catatan text
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    master_petani_id
    tanggal_sortir
    status_tahap
  }

  Note: 'Menu: Pembelian > Sortir (Intake). Satu baris = satu kupon petani; bisa berjalan paralel dengan Timbangan'
}

Table sortir_bal {
  sortir_bal_id integer [pk, increment]
  sortir_id integer [not null]
  no_bal varchar(20) [not null, unique, note: 'Nomor bal fisik, mis. SB0001']
  master_harga_beli_id integer [not null, note: 'Grade / kode harga beli hasil sortir']
  ganti_tikar boolean [not null, default: false]
  status_stok status_stok_bal [not null, default: 'proses_sortir']
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    sortir_id
    status_stok
  }

  Note: 'Menu: Pembelian > Sortir (Intake). Detail bal dalam kupon; status_stok berubah mengikuti timbang dan pengiriman'
}

Table timbangan {
  timbangan_id integer [pk, increment]
  sortir_bal_id integer [not null, unique, note: 'Satu bal satu hasil timbang']
  berat_bruto_kg decimal(10,3) [not null, note: 'Dasar berat untuk pengiriman sample dan DO']
  potongan_tara_kg decimal(10,3) [not null, note: 'No Bal SB 2 kg; bal lain bruto <50 kg 3 kg, 50-59 kg 5 kg, >=60 kg 6 kg']
  berat_netto_kg decimal(10,3) [not null, note: 'Dasar pembelian & dokumentasi internal; tidak dibulatkan']
  is_netto_manual boolean [not null, default: false]
  petugas_timbang_id integer [not null]
  ditimbang_pada timestamp [not null, default: `now()`]
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  Note: 'Menu: Pembelian > Timbangan (Berat)'
}

Table kasir {
  kasir_id integer [pk, increment]
  sortir_id integer [not null, unique, note: 'Satu kupon satu nota pembelian']
  total_bal integer [not null]
  total_berat_netto_kg decimal(12,3) [not null]
  total_kotor decimal(15,2) [not null]
  total_potongan decimal(15,2) [not null]
  total_bayar decimal(15,2) [not null, note: 'total_kotor - total_potongan']
  status_pembayaran status_pembayaran [not null, default: 'belum_lunas']
  metode_pembayaran varchar(20) [note: 'cash; kosong selama belum_lunas']
  nominal_tunai decimal(15,2)
  dibayar_oleh_id integer
  dibayar_pada timestamp
  status_nota status_nota [not null, default: 'belum_cetak', note: 'Nota resmi hanya dicetak bila lunas']
  dicetak_pada timestamp
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    status_pembayaran
    dibayar_pada
  }

  Note: 'Menu: Pembelian > Kasir. Nota pembelian per kupon, dibuat saat semua bal selesai ditimbang'
}

Table kasir_detail {
  kasir_detail_id integer [pk, increment]
  kasir_id integer [not null]
  timbangan_id integer [not null, unique]
  master_harga_beli_id integer [not null]
  harga_beli_per_kg decimal(15,2) [not null, note: 'Snapshot harga saat nota dibuat']
  berat_netto_kg decimal(10,3) [not null]
  total_kotor decimal(15,2) [not null, note: 'berat_netto_kg x harga_beli_per_kg']
  potongan_kuli decimal(15,2) [not null, default: 7000]
  potongan_tali decimal(15,2) [not null, default: 3000]
  potongan_tikar decimal(15,2) [not null, default: 0, note: '75000 bila ganti tikar']
  subtotal_bersih decimal(15,2) [not null]
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    kasir_id
  }

  Note: 'Menu: Pembelian > Kasir. Baris nota per bal'
}

// =====================================================================
// PENGIRIMAN BARANG (berat bruto)
// =====================================================================

Table pengiriman_sample {
  pengiriman_sample_id integer [pk, increment]
  no_surat_sample varchar(30) [not null, unique, note: 'Diisi manual, tolak kembar; mis. SAMPLE-PJM0001']
  tujuan_buyer varchar(150) [not null]
  permintaan_buyer text
  tanggal_kirim date [not null]
  tanggal_respon date
  status status_pengiriman_sample [not null, default: 'sample']
  dikirim_oleh_id integer [not null]
  petugas_qc_pabrik varchar(100)
  catatan text
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    tanggal_kirim
    status
  }

  Note: 'Menu: Pengiriman Barang > Pengiriman Sample. Boleh dihapus'
}

Table pengiriman_sample_bal {
  pengiriman_sample_bal_id integer [pk, increment]
  pengiriman_sample_id integer [not null]
  sortir_bal_id integer [not null]
  kode_bal_pembeli varchar(30) [note: 'No Jadi / kode bal dari buyer']
  berat_bruto_kg decimal(10,3) [not null, note: 'Snapshot bruto timbangan; netto tidak ditampilkan ke buyer']
  master_harga_jual_id integer
  harga_tawaran_per_kg decimal(15,2) [not null]
  harga_deal_per_kg decimal(15,2) [note: 'Terisi setelah disetujui atau nego']
  estimasi_nilai decimal(15,2) [not null, note: 'berat_bruto_kg x harga_tawaran_per_kg']
  berat_sample_gram decimal(10,2)
  status_item status_item_sample [not null, default: 'dikirim']
  alasan_tolak text
  catatan_nego text
  dievaluasi_pada timestamp
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    (pengiriman_sample_id, sortir_bal_id) [unique]
    sortir_bal_id
  }

  Note: 'Menu: Pengiriman Barang > Pengiriman Sample. Detail bal yang dikirim sebagai sample'
}

Table pengiriman_reguler {
  pengiriman_reguler_id integer [pk, increment]
  no_surat_jalan varchar(30) [not null, unique, note: 'Diisi manual, tolak kembar; mis. SJ-PJM0001']
  pengiriman_sample_id integer [note: 'Kosong bila DO langsung dari stok gudang']
  tujuan varchar(150) [not null]
  tanggal_kirim date [not null]
  tanggal_diterima date
  nama_supir varchar(100) [not null]
  plat_nomor varchar(20) [not null]
  status status_pengiriman_reguler [not null, default: 'dikirim']
  petugas_id integer [not null, note: 'Akun penerbit DO; nama petugas logistik di dokumen = akun yang mencetak']
  catatan text
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    tanggal_kirim
    status
  }

  Note: 'Menu: Pengiriman Barang > Pengiriman Reguler (DO). Tidak boleh dihapus setelah status dikirim'
}

Table pengiriman_reguler_bal {
  pengiriman_reguler_bal_id integer [pk, increment]
  pengiriman_reguler_id integer [not null]
  sortir_bal_id integer [not null, unique, note: 'Satu bal hanya sekali keluar lewat DO']
  master_harga_jual_id integer [note: 'Kosong bila memakai harga deal sample']
  pengiriman_sample_bal_id integer [note: 'Sumber harga deal bila DO berasal dari batch sample']
  harga_jual_per_kg decimal(15,2) [not null, note: 'Snapshot, wajib lebih dari 0']
  berat_bruto_gudang_kg decimal(10,3) [not null, note: 'Bruto hasil timbangan']
  berat_bruto_kirim_kg decimal(10,3) [not null, note: 'Bruto saat dikirim, boleh susut']
  subtotal decimal(15,2) [not null, note: 'berat_bruto_kirim_kg x harga_jual_per_kg']
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    pengiriman_reguler_id
  }

  Note: 'Menu: Pengiriman Barang > Pengiriman Reguler (DO). Detail bal muatan Surat Jalan'
}

Table status_batch {
  status_batch_id integer [pk, increment]
  pengiriman_sample_id integer [note: 'Diisi bila perubahan status batch sample']
  pengiriman_sample_bal_id integer [note: 'Diisi bila evaluasi per bal sample: disetujui / nego / ditolak']
  pengiriman_reguler_id integer [note: 'Diisi bila perubahan status Surat Jalan']
  status_sebelum varchar(30)
  status_sesudah varchar(30) [not null]
  keterangan text
  diubah_oleh_id integer [not null]
  created_at timestamp [not null, default: `now()`]

  indexes {
    pengiriman_sample_id
    pengiriman_reguler_id
    created_at
  }

  Note: 'Menu: Pengiriman Barang > Status & Detail Batch (Sortir & DO). Riwayat perubahan status; tepat satu referensi terisi'
}

// =====================================================================
// RELASI
// =====================================================================

// Master Data
Ref: master_harga_beli.dibuat_oleh_id > pengguna.pengguna_id
Ref: master_harga_jual.dibuat_oleh_id > pengguna.pengguna_id

// Pembelian: Petani > Sortir > Timbangan > Kasir
Ref: sortir.master_petani_id > master_petani.master_petani_id
Ref: sortir.petugas_sortir_id > pengguna.pengguna_id
Ref: sortir_bal.sortir_id > sortir.sortir_id [delete: cascade]
Ref: sortir_bal.master_harga_beli_id > master_harga_beli.master_harga_beli_id
Ref: timbangan.sortir_bal_id - sortir_bal.sortir_bal_id [delete: cascade]
Ref: timbangan.petugas_timbang_id > pengguna.pengguna_id
Ref: kasir.sortir_id - sortir.sortir_id [delete: cascade]
Ref: kasir.dibayar_oleh_id > pengguna.pengguna_id
Ref: kasir_detail.kasir_id > kasir.kasir_id [delete: cascade]
Ref: kasir_detail.timbangan_id - timbangan.timbangan_id [delete: cascade]
Ref: kasir_detail.master_harga_beli_id > master_harga_beli.master_harga_beli_id

// Pengiriman Sample
Ref: pengiriman_sample.dikirim_oleh_id > pengguna.pengguna_id
Ref: pengiriman_sample_bal.pengiriman_sample_id > pengiriman_sample.pengiriman_sample_id [delete: cascade]
Ref: pengiriman_sample_bal.sortir_bal_id > sortir_bal.sortir_bal_id [delete: cascade]
Ref: pengiriman_sample_bal.master_harga_jual_id > master_harga_jual.master_harga_jual_id

// Pengiriman Reguler (DO): restrict ke sortir_bal = kupon dengan bal terkirim tidak bisa dihapus
Ref: pengiriman_reguler.pengiriman_sample_id > pengiriman_sample.pengiriman_sample_id [delete: set null]
Ref: pengiriman_reguler.petugas_id > pengguna.pengguna_id
Ref: pengiriman_reguler_bal.pengiriman_reguler_id > pengiriman_reguler.pengiriman_reguler_id [delete: cascade]
Ref: pengiriman_reguler_bal.sortir_bal_id > sortir_bal.sortir_bal_id [delete: restrict]
Ref: pengiriman_reguler_bal.master_harga_jual_id > master_harga_jual.master_harga_jual_id
Ref: pengiriman_reguler_bal.pengiriman_sample_bal_id > pengiriman_sample_bal.pengiriman_sample_bal_id [delete: set null]

// Status & Detail Batch
Ref: status_batch.pengiriman_sample_id > pengiriman_sample.pengiriman_sample_id [delete: cascade]
Ref: status_batch.pengiriman_sample_bal_id > pengiriman_sample_bal.pengiriman_sample_bal_id [delete: cascade]
Ref: status_batch.pengiriman_reguler_id > pengiriman_reguler.pengiriman_reguler_id
Ref: status_batch.diubah_oleh_id > pengguna.pengguna_id

// Manajemen Pengguna
Ref: audit_trail.pengguna_id > pengguna.pengguna_id
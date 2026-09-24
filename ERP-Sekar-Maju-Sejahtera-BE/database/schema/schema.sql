-- =============================================================================
-- ERP SEKAR MAJU SEJAHTERA — SKEMA DATABASE RELASIONAL (PostgreSQL 16+)
-- =============================================================================
-- Menggantikan persistensi in-memory di src/utils/storage.ts (saat ini SEMUA
-- data bisnis non-user hilang setiap refresh browser -- lihat catatan audit).
--
-- Perbaikan desain relatif terhadap model data frontend (types/index.ts),
-- berdasarkan audit alur kode aktual:
--   1. Header transaksi TIDAK lagi menyimpan angka agregat (berat_kg, harga_per_kg,
--      potongan, dll) sebagai kolom -- itu sumber bug SUM vs AVG vs "snapshot" yang
--      tercampur di kode React. Semua dihitung via view dari transaksi_item_bal.
--   2. barang.gudang_id dibuat NOT NULL + FK sungguhan ke gudang (di frontend saat
--      ini nyaris selalu kosong, cuma lokasi_gudang teks bebas yang kepakai).
--   3. Partial unique index dipakai untuk menegakkan aturan bisnis yang di frontend
--      cuma dicek longgar di UI (kupon aktif tidak boleh dobel, 1 barang tidak boleh
--      aktif di >1 batch sample / >1 pengiriman sekaligus).
--   4. ID bisnis (TRX-, PTN-, BAL-, dst) tetap dipakai sebagai primary key karena
--      dicetak di nota/label/surat jalan fisik -- tapi generasinya dipindah ke fungsi
--      next_seq() di server (atomic), bukan digenerate tersebar di berbagai
--      komponen React seperti sekarang (ditemukan pola beda-beda & 1 bug pemanggilan
--      generateBalId di TransaksiEditModal.tsx).
--   5. Ditambahkan audit_log -- di versi frontend saat ini fitur "Audit Trail" cuma
--      ada di teks deskripsi role, implementasinya sudah dikosongkan (lihat App.tsx).
--   6. role_code 'admin_utama' yang dicek di beberapa komponen FE (HargaManagement,
--      PengirimanManagement, KasirPageView) TIDAK pernah ada di 6 role resmi --
--      saat integrasi backend, ganti pengecekan itu ke 'superadmin'.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- ENUM TYPES
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('superadmin','admin_sortir','admin_timbang','admin_kasir','admin_pengiriman','kepala_gudang');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_stok_barang') THEN
    CREATE TYPE status_stok_barang AS ENUM ('di_gudang','siap_kirim','keluar','terkirim_sample');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_transaksi_enum') THEN
    CREATE TYPE status_transaksi_enum AS ENUM ('lengkap','menunggu');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_tahap_enum') THEN
    CREATE TYPE status_tahap_enum AS ENUM ('proses_sortir','menunggu_timbang','lengkap');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_pembayaran_enum') THEN
    CREATE TYPE status_pembayaran_enum AS ENUM ('lunas','belum_lunas');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metode_pembayaran_enum') THEN
    CREATE TYPE metode_pembayaran_enum AS ENUM ('cash','kredit');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_nota_enum') THEN
    CREATE TYPE status_nota_enum AS ENUM ('belum_cetak','sudah_cetak');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_timbang_enum') THEN
    CREATE TYPE status_timbang_enum AS ENUM ('menunggu_timbang','selesai_timbang');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_harga_enum') THEN
    CREATE TYPE status_harga_enum AS ENUM ('aktif','nonaktif');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_sample_enum') THEN
    CREATE TYPE status_sample_enum AS ENUM ('sample','dikirim','diterima','disetujui','ditolak','nego');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_batch_sample_enum') THEN
    CREATE TYPE status_batch_sample_enum AS ENUM ('sample','diproses','dikirim','dibatalkan','selesai');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_pengiriman_enum') THEN
    CREATE TYPE status_pengiriman_enum AS ENUM ('dimuat','dalam_perjalanan','diterima','dikirim','selesai');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action_enum') THEN
    CREATE TYPE audit_action_enum AS ENUM ('INSERT','UPDATE','DELETE');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- UTIL: auto-update kolom updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- UTIL: generator ID bisnis atomic (menggantikan generator tersebar di FE)
-- Pemakaian dari backend:  SELECT next_seq('TRX-08092026');
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sequence_counters (
  counter_key   VARCHAR(40) PRIMARY KEY,   -- contoh: 'TRX-08092026', 'PTN-2026', 'BAL-08092026'
  next_val      INT NOT NULL DEFAULT 1
);

CREATE OR REPLACE FUNCTION next_seq(p_key VARCHAR) RETURNS INT AS $$
DECLARE v INT;
BEGIN
  INSERT INTO sequence_counters(counter_key, next_val) VALUES (p_key, 2)
  ON CONFLICT (counter_key) DO UPDATE SET next_val = sequence_counters.next_val + 1
  RETURNING next_val - 1 INTO v;
  RETURN v;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RBAC: ROLES, MODULES, HAK AKSES (menggantikan hardcode di rbac.ts/Sidebar.tsx)
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
  role_code     user_role PRIMARY KEY,
  label         VARCHAR(50) NOT NULL,
  deskripsi     TEXT,
  badge_bg      VARCHAR(30),
  badge_text    VARCHAR(30),
  badge_border  VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS modules (
  module_id     VARCHAR(40) PRIMARY KEY,      -- 'modul-0-sortir', dst (id dipertahankan sama dgn FE)
  group_name    VARCHAR(40) NOT NULL,         -- 'root' | 'report' | 'master-data' | 'pembelian' | 'pengiriman'
  title         VARCHAR(80) NOT NULL,
  subtitle      VARCHAR(120),
  icon          VARCHAR(40),
  sort_order    INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_module_access (
  role_code     user_role NOT NULL REFERENCES roles(role_code) ON DELETE CASCADE,
  module_id     VARCHAR(40) NOT NULL REFERENCES modules(module_id) ON DELETE CASCADE,
  PRIMARY KEY (role_code, module_id)
);

CREATE TABLE IF NOT EXISTS role_capabilities (
  role_code               user_role PRIMARY KEY REFERENCES roles(role_code) ON DELETE CASCADE,
  can_manage_users        BOOLEAN NOT NULL DEFAULT false,
  can_view_audit_log      BOOLEAN NOT NULL DEFAULT false,
  can_manage_master_data  BOOLEAN NOT NULL DEFAULT false,
  can_create_petani       BOOLEAN NOT NULL DEFAULT false,
  can_input_transaksi     BOOLEAN NOT NULL DEFAULT false,
  can_manage_stok         BOOLEAN NOT NULL DEFAULT false,
  can_manage_qc           BOOLEAN NOT NULL DEFAULT false,
  can_manage_pengiriman   BOOLEAN NOT NULL DEFAULT false,
  can_view_analytics      BOOLEAN NOT NULL DEFAULT false
);

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  user_id         VARCHAR(20) PRIMARY KEY,       -- USR-XXXXXX
  username        VARCHAR(50) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,         -- bcrypt/argon2 -- JANGAN plaintext
  nama_lengkap    VARCHAR(120) NOT NULL,
  role_code       user_role NOT NULL REFERENCES roles(role_code),
  email           VARCHAR(120),
  no_hp           VARCHAR(20),
  unit_penugasan  VARCHAR(120),
  status_aktif    BOOLEAN NOT NULL DEFAULT true,
  terakhir_login  TIMESTAMPTZ,
  dibuat_pada     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- MASTER PETANI
-- =============================================================================
CREATE TABLE IF NOT EXISTS petani (
  petani_id       VARCHAR(20) PRIMARY KEY,      -- PTN-YYYY-XXX
  nama_petani     VARCHAR(120) NOT NULL,
  no_hp           VARCHAR(20),
  alamat          TEXT NOT NULL,
  desa_kecamatan  VARCHAR(120),
  status_aktif    BOOLEAN NOT NULL DEFAULT true,
  alasan_nonaktif TEXT,
  tanggal_daftar  DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_petani_updated') THEN
    CREATE TRIGGER trg_petani_updated BEFORE UPDATE ON petani
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_petani_status ON petani(status_aktif);
CREATE INDEX IF NOT EXISTS ix_petani_nama ON petani USING gin (to_tsvector('simple', nama_petani));

-- =============================================================================
-- MASTER GRADE & HARGA BELI (histori harga per grade, bertanggal berlaku)
-- =============================================================================
CREATE TABLE IF NOT EXISTS grade_master (
  kode_grade      VARCHAR(5) PRIMARY KEY,        -- A, B, C, A1, A+, dst
  nama_grade      VARCHAR(80) NOT NULL,
  warna_badge     VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS tabel_harga (
  harga_id                VARCHAR(30) PRIMARY KEY,   -- HRG-YYYY-GRADE-XXXX
  kode_grade              VARCHAR(5) NOT NULL REFERENCES grade_master(kode_grade),
  harga_per_kg            NUMERIC(12,2) NOT NULL,
  rate_potongan_per_bal   NUMERIC(12,2) NOT NULL DEFAULT 0,
  berat_standar_kg        NUMERIC(8,2),
  tanggal_berlaku         DATE NOT NULL,
  tanggal_berakhir        DATE,
  status                  status_harga_enum NOT NULL DEFAULT 'aktif',
  dibuat_oleh             VARCHAR(20) REFERENCES users(user_id),
  deskripsi               TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tabel_harga_aktif ON tabel_harga(kode_grade) WHERE status = 'aktif';
CREATE INDEX IF NOT EXISTS ix_tabel_harga_grade ON tabel_harga(kode_grade);

-- =============================================================================
-- MASTER HARGA JUAL (harga tawar/deal ke pabrik & buyer)
-- =============================================================================
CREATE TABLE IF NOT EXISTS master_harga_jual (
  harga_jual_id   VARCHAR(20) PRIMARY KEY,      -- HJ-XXX
  kode            VARCHAR(30) UNIQUE NOT NULL,  -- kode_harga_jual
  harga_jual      NUMERIC(12,2) NOT NULL,
  tanggal_berlaku DATE NOT NULL,
  status_aktif    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- MASTER GUDANG
-- =============================================================================
CREATE TABLE IF NOT EXISTS gudang (
  gudang_id       VARCHAR(20) PRIMARY KEY,      -- GDG-PMK-01
  kode_gudang     VARCHAR(20) UNIQUE NOT NULL,
  nama_gudang     VARCHAR(120) NOT NULL,
  alamat          TEXT,
  kapasitas_bal   INT,
  kepala_gudang   VARCHAR(120),
  kontak          VARCHAR(20),
  status_aktif    BOOLEAN NOT NULL DEFAULT true,
  deskripsi       TEXT
);

-- =============================================================================
-- TRANSAKSI PEMBELIAN -- HEADER
-- =============================================================================
CREATE TABLE IF NOT EXISTS transaksi_pembelian (
  transaksi_id            VARCHAR(30) PRIMARY KEY,   -- TRX-DDMMYYYY-XXX
  no_kupon                VARCHAR(20) NOT NULL,
  petani_id               VARCHAR(20) NOT NULL REFERENCES petani(petani_id),
  tanggal_transaksi       DATE NOT NULL DEFAULT CURRENT_DATE,
  jenis_timbang           VARCHAR(10) NOT NULL DEFAULT 'netto' CHECK (jenis_timbang IN ('bruto','netto')),
  status_transaksi        status_transaksi_enum NOT NULL DEFAULT 'menunggu',
  status_tahap            status_tahap_enum NOT NULL DEFAULT 'proses_sortir',
  status_pembayaran       status_pembayaran_enum NOT NULL DEFAULT 'belum_lunas',
  metode_pembayaran       metode_pembayaran_enum,
  status_nota             status_nota_enum NOT NULL DEFAULT 'belum_cetak',
  dicetak_pada            TIMESTAMPTZ,
  dicetak_oleh            VARCHAR(20) REFERENCES users(user_id),
  unduh_nota_count        INT NOT NULL DEFAULT 0,
  dibayar_pada            TIMESTAMPTZ,
  dibayar_oleh            VARCHAR(20) REFERENCES users(user_id),
  operator_user_id        VARCHAR(20) REFERENCES users(user_id),
  petugas_sortir_user_id  VARCHAR(20) REFERENCES users(user_id),
  petugas_timbang_user_id VARCHAR(20) REFERENCES users(user_id),
  catatan_kasir           TEXT,
  catatan_qc              TEXT,
  catatan                 TEXT,
  terakhir_diubah_oleh    VARCHAR(20) REFERENCES users(user_id),
  terakhir_diubah_pada    TIMESTAMPTZ,
  alasan_perubahan_terakhir TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_trx_updated') THEN
    CREATE TRIGGER trg_trx_updated BEFORE UPDATE ON transaksi_pembelian
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_kupon_aktif ON transaksi_pembelian(no_kupon) WHERE status_tahap <> 'lengkap';
CREATE INDEX IF NOT EXISTS ix_trx_petani ON transaksi_pembelian(petani_id);
CREATE INDEX IF NOT EXISTS ix_trx_tanggal ON transaksi_pembelian(tanggal_transaksi);
CREATE INDEX IF NOT EXISTS ix_trx_status ON transaksi_pembelian(status_tahap, status_pembayaran);

-- =============================================================================
-- TRANSAKSI ITEM BAL -- DETAIL
-- =============================================================================
CREATE TABLE IF NOT EXISTS transaksi_item_bal (
  item_id             VARCHAR(30) PRIMARY KEY,
  transaksi_id        VARCHAR(30) NOT NULL REFERENCES transaksi_pembelian(transaksi_id) ON DELETE CASCADE,
  no_bal              VARCHAR(30) NOT NULL,
  kode_bal_pembeli    VARCHAR(30),
  barcode             VARCHAR(50) UNIQUE,
  kode_grade          VARCHAR(5) NOT NULL REFERENCES grade_master(kode_grade),
  harga_per_kg        NUMERIC(12,2) NOT NULL,
  ganti_tikar         BOOLEAN NOT NULL DEFAULT false,
  berat_bruto_kg      NUMERIC(8,2),
  potongan_tara_kg    NUMERIC(8,2) NOT NULL DEFAULT 0,
  is_netto_manual     BOOLEAN NOT NULL DEFAULT false,
  berat_kg            NUMERIC(8,2) NOT NULL DEFAULT 0,
  potongan_kuli       NUMERIC(12,2) NOT NULL DEFAULT 7000,
  potongan_tali       NUMERIC(12,2) NOT NULL DEFAULT 3000,
  potongan_tikar      NUMERIC(12,2) NOT NULL DEFAULT 0,
  potongan            NUMERIC(12,2) GENERATED ALWAYS AS (potongan_kuli + potongan_tali + potongan_tikar) STORED,
  total_kotor         NUMERIC(14,2) GENERATED ALWAYS AS (berat_kg * harga_per_kg) STORED,
  subtotal_bersih     NUMERIC(14,2) GENERATED ALWAYS AS
                        (berat_kg * harga_per_kg - (potongan_kuli + potongan_tali + potongan_tikar)) STORED,
  status_timbang      status_timbang_enum NOT NULL DEFAULT 'menunggu_timbang',
  lokasi_simpan       VARCHAR(40),
  sample_label_code   VARCHAR(30),
  sample_label_printed BOOLEAN NOT NULL DEFAULT false,
  catatan             TEXT
);
-- Cap waktu (milidetik, jam perangkat) perubahan GT dan hasil timbang yang disengaja. Server hanya menerima
-- perubahan yang lebih baru, sehingga salinan kupon yang basi di perangkat lain tidak bisa menimpa balik
-- centang ganti tikar atau berat (lihat TransaksiController::fieldGantiTikar / bolehTimpaBerat).
ALTER TABLE transaksi_item_bal ADD COLUMN IF NOT EXISTS ganti_tikar_diubah_pada BIGINT;
ALTER TABLE transaksi_item_bal ADD COLUMN IF NOT EXISTS timbang_diubah_pada BIGINT;
CREATE INDEX IF NOT EXISTS ix_item_transaksi ON transaksi_item_bal(transaksi_id);
CREATE INDEX IF NOT EXISTS ix_item_grade ON transaksi_item_bal(kode_grade);
CREATE INDEX IF NOT EXISTS ix_item_status_timbang ON transaksi_item_bal(status_timbang);

-- =============================================================================
-- BARANG / INVENTARIS GUDANG
-- =============================================================================
CREATE TABLE IF NOT EXISTS barang (
  barang_id             VARCHAR(30) PRIMARY KEY,
  transaksi_item_id     VARCHAR(30) UNIQUE NOT NULL REFERENCES transaksi_item_bal(item_id),
  transaksi_id          VARCHAR(30) NOT NULL REFERENCES transaksi_pembelian(transaksi_id),
  petani_id             VARCHAR(20) NOT NULL REFERENCES petani(petani_id),
  kode_grade            VARCHAR(5) NOT NULL REFERENCES grade_master(kode_grade),
  no_bal                VARCHAR(30) NOT NULL,
  status_stok           status_stok_barang NOT NULL DEFAULT 'di_gudang',
  gudang_id             VARCHAR(20) NOT NULL REFERENCES gudang(gudang_id),
  lokasi_blok           VARCHAR(40),
  tanggal_masuk         DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_keluar        DATE,
  catatan               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_barang_updated') THEN
    CREATE TRIGGER trg_barang_updated BEFORE UPDATE ON barang
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_barang_status ON barang(status_stok);
CREATE INDEX IF NOT EXISTS ix_barang_gudang ON barang(gudang_id);
CREATE INDEX IF NOT EXISTS ix_barang_grade ON barang(kode_grade);
CREATE INDEX IF NOT EXISTS ix_barang_petani ON barang(petani_id);
CREATE INDEX IF NOT EXISTS ix_barang_no_bal ON barang(no_bal);

-- =============================================================================
-- SAMPLE BATCH
-- =============================================================================
CREATE TABLE IF NOT EXISTS sample_batch (
  batch_id            VARCHAR(20) PRIMARY KEY,
  kode_batch          VARCHAR(40) UNIQUE NOT NULL,
  tujuan_buyer        VARCHAR(120) NOT NULL,
  is_locked           BOOLEAN NOT NULL DEFAULT false,
  permintaan_buyer    TEXT,
  sumber_gudang_id    VARCHAR(20) REFERENCES gudang(gudang_id),
  tanggal_kirim       DATE NOT NULL,
  tanggal_respon      DATE,
  status              status_batch_sample_enum NOT NULL DEFAULT 'sample',
  dikirim_oleh        VARCHAR(20) REFERENCES users(user_id),
  petugas_qc_pabrik   VARCHAR(120),
  catatan             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_sample_batch_status ON sample_batch(status);

CREATE TABLE IF NOT EXISTS sample_batch_item (
  sample_item_id    VARCHAR(20) PRIMARY KEY,
  batch_id          VARCHAR(20) NOT NULL REFERENCES sample_batch(batch_id) ON DELETE CASCADE,
  barang_id         VARCHAR(30) NOT NULL REFERENCES barang(barang_id),
  kode_harga_jual   VARCHAR(30) REFERENCES master_harga_jual(kode),
  berat_sample_gram NUMERIC(8,2),
  harga_tawaran_kg  NUMERIC(12,2),
  harga_deal_kg     NUMERIC(12,2),
  status_item       status_sample_enum NOT NULL DEFAULT 'sample',
  alasan_tolak      TEXT,
  catatan_nego      TEXT,
  tanggal_evaluasi  DATE,
  sudah_dikirim_do  BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_sample_item_batch ON sample_batch_item(batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sample_barang_aktif ON sample_batch_item(barang_id) WHERE status_item <> 'ditolak';

-- Batch berstatus Draft (Reclass yang masih disesuaikan), nama pengirim teks bebas dari frontend
-- (kolom dikirim_oleh adalah akun pembuat), dan ID item {batch_id}-001 yang bisa lebih dari 20 karakter.
-- Aman dijalankan ulang di database yang sudah ada.
ALTER TYPE status_batch_sample_enum ADD VALUE IF NOT EXISTS 'draft' BEFORE 'sample';
ALTER TABLE sample_batch ADD COLUMN IF NOT EXISTS dikirim_oleh_nama VARCHAR(120);
ALTER TABLE sample_batch_item ALTER COLUMN sample_item_id TYPE VARCHAR(40);

-- =============================================================================
-- PENGIRIMAN BARANG (SURAT JALAN / DO)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pengiriman_barang (
  pengiriman_id       VARCHAR(20) PRIMARY KEY,
  no_surat_jalan      VARCHAR(30) UNIQUE NOT NULL,
  tujuan              VARCHAR(120) NOT NULL,
  jenis_pengeluaran   VARCHAR(40),
  unit_produksi       VARCHAR(80),
  mandor_produksi     VARCHAR(80),
  driver_nama         VARCHAR(80) NOT NULL,
  plat_nomor          VARCHAR(20) NOT NULL,
  tanggal_kirim       DATE NOT NULL,
  tanggal_diterima    DATE,
  status              status_pengiriman_enum NOT NULL DEFAULT 'dimuat',
  batch_sample_id_ref VARCHAR(20) REFERENCES sample_batch(batch_id),
  nomor_kontrak       VARCHAR(40),
  -- Aturan potongan bruto->netto jual (mis. rentang 1-49 kg dipotong 4 kg): beda tiap Surat Jalan,
  -- bukan master. Larik objek {min, max, potongan}; lihat src/utils/aturanNetto.ts di frontend.
  aturan_netto        JSONB,
  catatan             TEXT,
  petugas             VARCHAR(80),
  dibuat_oleh         VARCHAR(20) REFERENCES users(user_id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE pengiriman_barang ADD COLUMN IF NOT EXISTS aturan_netto JSONB;
CREATE INDEX IF NOT EXISTS ix_pengiriman_status ON pengiriman_barang(status);
CREATE INDEX IF NOT EXISTS ix_pengiriman_tanggal ON pengiriman_barang(tanggal_kirim);

CREATE TABLE IF NOT EXISTS pengiriman_barang_item (
  pengiriman_id     VARCHAR(20) NOT NULL REFERENCES pengiriman_barang(pengiriman_id) ON DELETE CASCADE,
  barang_id         VARCHAR(30) NOT NULL REFERENCES barang(barang_id),
  kode_harga_jual   VARCHAR(30) REFERENCES master_harga_jual(kode),
  harga_deal_per_kg NUMERIC(12,2),
  -- Bruto timbang ulang saat dikirim (boleh beda dari bruto bal di gudang karena susut) dan netto jual
  -- hasil potongan aturan_netto; dasar nilai Surat Jalan. Lihat PengirimanBarang.berat_kirim_map/netto_jual_map di FE.
  berat_kirim_kg    NUMERIC(8,2),
  netto_jual_kg     NUMERIC(8,2),
  PRIMARY KEY (pengiriman_id, barang_id)
);
ALTER TABLE pengiriman_barang_item ADD COLUMN IF NOT EXISTS berat_kirim_kg NUMERIC(8,2);
ALTER TABLE pengiriman_barang_item ADD COLUMN IF NOT EXISTS netto_jual_kg NUMERIC(8,2);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pengiriman_barang_aktif ON pengiriman_barang_item(barang_id);

-- =============================================================================
-- AUDIT LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id      BIGSERIAL PRIMARY KEY,
  table_name    VARCHAR(50) NOT NULL,
  record_id     VARCHAR(50) NOT NULL,
  action        audit_action_enum NOT NULL,
  changed_by    VARCHAR(20) REFERENCES users(user_id),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_values    JSONB,
  new_values    JSONB
);
CREATE INDEX IF NOT EXISTS ix_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS ix_audit_changed_at ON audit_log(changed_at);

-- =============================================================================
-- FILE ATTACHMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS file_attachments (
  file_id       BIGSERIAL PRIMARY KEY,
  related_table VARCHAR(50) NOT NULL,
  related_id    VARCHAR(50) NOT NULL,
  file_path     TEXT NOT NULL,
  file_type     VARCHAR(30),
  file_size_kb  INT,
  uploaded_by   VARCHAR(20) REFERENCES users(user_id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_attachment_related ON file_attachments(related_table, related_id);

-- =============================================================================
-- STOCK OPNAME
-- =============================================================================
CREATE TABLE IF NOT EXISTS stock_opname_session (
  opname_id           VARCHAR(30) PRIMARY KEY,
  judul_opname        VARCHAR(120) NOT NULL,
  tanggal_opname      DATE NOT NULL,
  petugas_opname      VARCHAR(20) REFERENCES users(user_id),
  gudang_id           VARCHAR(20) REFERENCES gudang(gudang_id),
  target_grade        VARCHAR(5) REFERENCES grade_master(kode_grade),
  status              VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','proses','selesai')),
  catatan             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_opname_item (
  opname_id       VARCHAR(30) NOT NULL REFERENCES stock_opname_session(opname_id) ON DELETE CASCADE,
  barang_id       VARCHAR(30) NOT NULL REFERENCES barang(barang_id),
  status_fisik    VARCHAR(20) NOT NULL CHECK (status_fisik IN ('ditemukan','tidak_ditemukan','tambahan_baru')),
  waktu_scan      TIMESTAMPTZ,
  PRIMARY KEY (opname_id, barang_id)
);

-- =============================================================================
-- VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW v_transaksi_summary AS
SELECT
  t.transaksi_id, t.petani_id, t.no_kupon, t.tanggal_transaksi,
  t.status_tahap, t.status_pembayaran, t.metode_pembayaran,
  COUNT(i.item_id)                              AS total_bal,
  COUNT(i.item_id) FILTER (WHERE i.status_timbang = 'selesai_timbang') AS bal_selesai_timbang,
  COALESCE(SUM(i.berat_kg), 0)                  AS berat_kg,
  COALESCE(SUM(i.total_kotor), 0)               AS total_harga_beli,
  COALESCE(SUM(i.potongan), 0)                  AS total_potongan,
  COALESCE(SUM(i.subtotal_bersih), 0)           AS harga_final
FROM transaksi_pembelian t
LEFT JOIN transaksi_item_bal i ON i.transaksi_id = t.transaksi_id
GROUP BY t.transaksi_id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_petani_statistik') THEN
    CREATE MATERIALIZED VIEW mv_petani_statistik AS
    SELECT
      p.petani_id,
      COUNT(DISTINCT b.barang_id)             AS total_setoran_bal,
      COALESCE(SUM(i.berat_kg), 0)            AS total_berat_kg,
      MAX(t.tanggal_transaksi)                AS kunjungan_terakhir,
      MODE() WITHIN GROUP (ORDER BY b.kode_grade) AS grade_dominan
    FROM petani p
    LEFT JOIN barang b ON b.petani_id = p.petani_id
    LEFT JOIN transaksi_item_bal i ON i.item_id = b.transaksi_item_id
    LEFT JOIN transaksi_pembelian t ON t.transaksi_id = b.transaksi_id
    GROUP BY p.petani_id;
    
    CREATE UNIQUE INDEX uq_mv_petani_statistik ON mv_petani_statistik(petani_id);
  END IF;
END $$;

CREATE OR REPLACE VIEW v_pengiriman_summary AS
SELECT
  pb.pengiriman_id,
  COUNT(pbi.barang_id)                                     AS total_bal,
  COALESCE(SUM(i.berat_kg), 0)                             AS total_berat_kg,
  COALESCE(SUM(COALESCE(pbi.harga_deal_per_kg,0) * i.berat_kg), 0) AS total_nilai_deal
FROM pengiriman_barang pb
LEFT JOIN pengiriman_barang_item pbi ON pbi.pengiriman_id = pb.pengiriman_id
LEFT JOIN barang b ON b.barang_id = pbi.barang_id
LEFT JOIN transaksi_item_bal i ON i.item_id = b.transaksi_item_id
GROUP BY pb.pengiriman_id;

CREATE OR REPLACE VIEW v_pengiriman_rincian_grade AS
SELECT
  pb.pengiriman_id, b.kode_grade,
  COUNT(*)                     AS bal,
  COALESCE(SUM(i.berat_kg), 0) AS kg
FROM pengiriman_barang pb
JOIN pengiriman_barang_item pbi ON pbi.pengiriman_id = pb.pengiriman_id
JOIN barang b                    ON b.barang_id = pbi.barang_id
JOIN transaksi_item_bal i        ON i.item_id = b.transaksi_item_id
GROUP BY pb.pengiriman_id, b.kode_grade;

CREATE OR REPLACE VIEW v_stok_valuasi_grade AS
SELECT
  b.gudang_id, b.kode_grade,
  COUNT(*) FILTER (WHERE b.status_stok = 'di_gudang')               AS bal_di_gudang,
  COALESCE(SUM(i.berat_kg) FILTER (WHERE b.status_stok = 'di_gudang'), 0) AS kg_di_gudang,
  COALESCE(SUM(i.total_kotor) FILTER (WHERE b.status_stok = 'di_gudang'), 0) AS valuasi_beli
FROM barang b
JOIN transaksi_item_bal i ON i.item_id = b.transaksi_item_id
GROUP BY b.gudang_id, b.kode_grade;

-- -----------------------------------------------------------------------------
-- LARAVEL SANCTUM (API Personal Access Tokens)
-- tokenable_id dibuat VARCHAR(255) karena primary key users adalah string (user_id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id BIGSERIAL PRIMARY KEY,
  tokenable_type VARCHAR(255) NOT NULL,
  tokenable_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  abilities TEXT NULL,
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS personal_access_tokens_tokenable_type_tokenable_id_index
  ON personal_access_tokens (tokenable_type, tokenable_id);

-- =============================================================================
-- SINKRON LINTAS PERANGKAT (GET /api/v1/sync/perubahan)
-- =============================================================================
-- Setiap komputer menanyakan "apa yang berubah sejak <waktu>" beberapa detik sekali. Supaya jawabannya
-- lengkap, SETIAP tabel yang tampil di layar punya updated_at yang selalu ikut berubah (juga saat baris
-- anaknya berubah), dan setiap baris yang dihapus tercatat di sync_hapus. Semuanya lewat trigger, jadi
-- tidak ada jalur kode (Eloquent, DB::table, psql manual) yang bisa lolos. Aman dijalankan ulang.

ALTER TABLE tabel_harga       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE master_harga_jual ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE sample_batch      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE pengiriman_barang ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users             ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_tabel_harga_updated ON tabel_harga;
CREATE TRIGGER trg_tabel_harga_updated BEFORE UPDATE ON tabel_harga FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_harga_jual_updated ON master_harga_jual;
CREATE TRIGGER trg_harga_jual_updated BEFORE UPDATE ON master_harga_jual FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_sample_batch_updated ON sample_batch;
CREATE TRIGGER trg_sample_batch_updated BEFORE UPDATE ON sample_batch FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_pengiriman_updated ON pengiriman_barang;
CREATE TRIGGER trg_pengiriman_updated BEFORE UPDATE ON pengiriman_barang FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Rincian bal berubah (tambah/ubah/hapus bal, timbang, ganti tikar) -> kupon & stok bal ikut "berubah"
CREATE OR REPLACE FUNCTION sentuh_induk_item_bal() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE transaksi_pembelian SET updated_at = now() WHERE transaksi_id = OLD.transaksi_id;
    RETURN OLD;
  END IF;
  UPDATE transaksi_pembelian SET updated_at = now() WHERE transaksi_id = NEW.transaksi_id;
  IF TG_OP = 'UPDATE' THEN
    UPDATE barang SET updated_at = now() WHERE transaksi_item_id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_item_bal_sentuh_induk ON transaksi_item_bal;
CREATE TRIGGER trg_item_bal_sentuh_induk AFTER INSERT OR UPDATE OR DELETE ON transaksi_item_bal
  FOR EACH ROW EXECUTE FUNCTION sentuh_induk_item_bal();

CREATE OR REPLACE FUNCTION sentuh_induk_sample_item() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE sample_batch SET updated_at = now() WHERE batch_id = OLD.batch_id;
    RETURN OLD;
  END IF;
  UPDATE sample_batch SET updated_at = now() WHERE batch_id = NEW.batch_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_sample_item_sentuh_induk ON sample_batch_item;
CREATE TRIGGER trg_sample_item_sentuh_induk AFTER INSERT OR UPDATE OR DELETE ON sample_batch_item
  FOR EACH ROW EXECUTE FUNCTION sentuh_induk_sample_item();

CREATE OR REPLACE FUNCTION sentuh_induk_pengiriman_item() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE pengiriman_barang SET updated_at = now() WHERE pengiriman_id = OLD.pengiriman_id;
    RETURN OLD;
  END IF;
  UPDATE pengiriman_barang SET updated_at = now() WHERE pengiriman_id = NEW.pengiriman_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_pengiriman_item_sentuh_induk ON pengiriman_barang_item;
CREATE TRIGGER trg_pengiriman_item_sentuh_induk AFTER INSERT OR UPDATE OR DELETE ON pengiriman_barang_item
  FOR EACH ROW EXECUTE FUNCTION sentuh_induk_pengiriman_item();

-- Catatan baris yang dihapus: komputer lain membuangnya dari layar pada sinkron berikutnya
CREATE TABLE IF NOT EXISTS sync_hapus (
  entitas       VARCHAR(40) NOT NULL,
  record_id     VARCHAR(60) NOT NULL,
  dihapus_pada  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entitas, record_id)
);
CREATE INDEX IF NOT EXISTS ix_sync_hapus_waktu ON sync_hapus(dihapus_pada);

CREATE OR REPLACE FUNCTION catat_sync_hapus() RETURNS TRIGGER AS $$
DECLARE nilai TEXT;
BEGIN
  EXECUTE format('SELECT ($1).%I::text', TG_ARGV[0]) INTO nilai USING OLD;
  INSERT INTO sync_hapus(entitas, record_id, dihapus_pada) VALUES (TG_TABLE_NAME, nilai, now())
  ON CONFLICT (entitas, record_id) DO UPDATE SET dihapus_pada = EXCLUDED.dihapus_pada;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION batal_sync_hapus() RETURNS TRIGGER AS $$
DECLARE nilai TEXT;
BEGIN
  EXECUTE format('SELECT ($1).%I::text', TG_ARGV[0]) INTO nilai USING NEW;
  DELETE FROM sync_hapus WHERE entitas = TG_TABLE_NAME AND record_id = nilai;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('petani', 'petani_id'),
    ('transaksi_pembelian', 'transaksi_id'),
    ('barang', 'barang_id'),
    ('tabel_harga', 'harga_id'),
    ('master_harga_jual', 'harga_jual_id'),
    ('sample_batch', 'batch_id'),
    ('pengiriman_barang', 'pengiriman_id'),
    ('users', 'user_id')
  ) AS t(tabel, kolom) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_sync_hapus ON %I', r.tabel, r.tabel);
    EXECUTE format('CREATE TRIGGER trg_%s_sync_hapus AFTER DELETE ON %I FOR EACH ROW EXECUTE FUNCTION catat_sync_hapus(%L)', r.tabel, r.tabel, r.kolom);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_sync_batal_hapus ON %I', r.tabel, r.tabel);
    EXECUTE format('CREATE TRIGGER trg_%s_sync_batal_hapus AFTER INSERT ON %I FOR EACH ROW EXECUTE FUNCTION batal_sync_hapus(%L)', r.tabel, r.tabel, r.kolom);
    -- updated_at baris baru selalu jam database. Laravel menulis created_at/updated_at dalam UTC tanpa zona waktu
    -- sedangkan zona waktu sesi database bisa lain (mis. Asia/Bangkok), sehingga baris baru tampak berjam-jam
    -- lebih tua dan terlewat oleh sinkron.
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_waktu_buat ON %I', r.tabel, r.tabel);
    EXECUTE format('CREATE TRIGGER trg_%s_waktu_buat BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', r.tabel, r.tabel);
    EXECUTE format('CREATE INDEX IF NOT EXISTS ix_%s_updated_at ON %I(updated_at)', r.tabel, r.tabel);
  END LOOP;
END $$;

COMMIT;


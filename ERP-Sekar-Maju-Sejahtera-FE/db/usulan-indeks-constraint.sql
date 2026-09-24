-- =====================================================================
-- Usulan indeks, constraint, dan kolom tambahan (PostgreSQL 12+)
-- Acuan: DOKUMENTASI_DATABASE.md bagian 4, 6, 7, dan 8
-- Nama tabel mengikuti "ERD Sekar Maju Sejahtera ERP.txt" (skema target).
-- Cocokkan dulu dengan nama tabel produksi yang sebenarnya sebelum menjalankan.
--
-- Aturan pakai:
--   * SEMUANYA ADITIF: tidak ada DROP/ALTER yang mengubah data. Aman diulang (IF NOT EXISTS).
--   * Cadangkan database sebelum menjalankan (pg_dump).
--   * JANGAN dibungkus BEGIN/COMMIT: CREATE INDEX CONCURRENTLY tidak boleh di dalam transaksi.
--     Jalankan per bagian, di luar jam ramai. Constraint memakai NOT VALID lalu VALIDATE
--     terpisah agar tidak mengunci tabel lama.
--   * Setelah selesai jalankan seluruh pemeriksaan di DOKUMENTASI_DATABASE.md bagian 9.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Ekstensi
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ---------------------------------------------------------------------
-- 1. Kolom tambahan
-- ---------------------------------------------------------------------

-- 1a. Kunci kiriman ulang yang idempoten dan versi untuk deteksi tabrakan antar komputer
ALTER TABLE sortir_bal ADD COLUMN IF NOT EXISTS client_item_id varchar(60);
ALTER TABLE sortir     ADD COLUMN IF NOT EXISTS kode_transaksi varchar(30);
ALTER TABLE sortir     ADD COLUMN IF NOT EXISTS versi integer NOT NULL DEFAULT 1;
ALTER TABLE sortir_bal ADD COLUMN IF NOT EXISTS versi integer NOT NULL DEFAULT 1;

-- 1b. Kode bal (awalan huruf: SB, HF, TS, T) sebagai kolom turunan untuk rekap dan filter
ALTER TABLE sortir_bal ADD COLUMN IF NOT EXISTS kode_bal varchar(10)
  GENERATED ALWAYS AS (upper(substring(no_bal from '^[A-Za-z]+'))) STORED;

-- 1c. Salinan harga dan potongan sejak bal disortir (kini baru tersalin saat nota dibuat)
ALTER TABLE sortir_bal ADD COLUMN IF NOT EXISTS harga_beli_per_kg numeric(15,2);
ALTER TABLE sortir_bal ADD COLUMN IF NOT EXISTS potongan_kuli     numeric(15,2) NOT NULL DEFAULT 7000;
ALTER TABLE sortir_bal ADD COLUMN IF NOT EXISTS potongan_tali     numeric(15,2) NOT NULL DEFAULT 3000;
ALTER TABLE sortir_bal ADD COLUMN IF NOT EXISTS potongan_tikar    numeric(15,2) NOT NULL DEFAULT 0;

-- Isi awal (jalankan sekali; sesuaikan bila sudah terisi)
-- UPDATE sortir_bal sb SET harga_beli_per_kg = mh.harga_per_kg
--   FROM master_harga_beli mh
--  WHERE mh.master_harga_beli_id = sb.master_harga_beli_id AND sb.harga_beli_per_kg IS NULL;
-- UPDATE sortir_bal SET potongan_tikar = 75000 WHERE ganti_tikar AND potongan_tikar = 0;
-- UPDATE sortir_bal sb SET client_item_id = 'SRV-' || sb.sortir_bal_id WHERE client_item_id IS NULL;
-- UPDATE sortir s SET kode_transaksi = 'TRX-' || to_char(s.tanggal_sortir, 'DDMMYYYY') || '-' || lpad(s.sortir_id::text, 3, '0')
--  WHERE kode_transaksi IS NULL;   -- hanya bila kode lama tidak tersimpan; lebih baik salin dari sumber aslinya


-- ---------------------------------------------------------------------
-- 2. Tarif potongan berlaku per tanggal (menggantikan konstanta di kode)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS master_tarif_potongan (
  master_tarif_potongan_id serial PRIMARY KEY,
  jenis            varchar(10)   NOT NULL CHECK (jenis IN ('kuli', 'tali', 'tikar')),
  nominal          numeric(15,2) NOT NULL CHECK (nominal >= 0),
  tanggal_berlaku  date          NOT NULL,
  status_aktif     boolean       NOT NULL DEFAULT true,
  created_at       timestamp     NOT NULL DEFAULT now(),
  UNIQUE (jenis, tanggal_berlaku)
);
INSERT INTO master_tarif_potongan (jenis, nominal, tanggal_berlaku) VALUES
  ('kuli', 7000, DATE '2026-01-01'), ('tali', 3000, DATE '2026-01-01'), ('tikar', 75000, DATE '2026-01-01')
ON CONFLICT (jenis, tanggal_berlaku) DO NOTHING;


-- ---------------------------------------------------------------------
-- 3. Indeks (jalankan satu per satu, di luar transaksi)
-- ---------------------------------------------------------------------

-- Nomor bal: seragam huruf besar dan unik global
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_sortir_bal_no_bal_upper ON sortir_bal (upper(no_bal));
-- Autocomplete "SB00": awalan nomor bal
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sortir_bal_no_bal_prefix ON sortir_bal (no_bal text_pattern_ops);
-- Kiriman ulang idempoten (unik hanya bila terisi)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_sortir_bal_client_item_id ON sortir_bal (client_item_id) WHERE client_item_id IS NOT NULL;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_sortir_kode_transaksi ON sortir (kode_transaksi) WHERE kode_transaksi IS NOT NULL;

-- Rekap per kode bal dan per kupon
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sortir_bal_sortir_kode ON sortir_bal (sortir_id, kode_bal);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sortir_bal_kode ON sortir_bal (kode_bal);

-- Laporan per hari dan per petani
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sortir_tanggal_petani ON sortir (tanggal_sortir, master_petani_id);
-- Kupon yang belum tuntas (Sortir dan Timbangan)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sortir_belum_lengkap ON sortir (tanggal_sortir DESC, no_kupon DESC) WHERE status_tahap <> 'lengkap';

-- Bal terakhir ditimbang
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_timbangan_ditimbang_pada ON timbangan (ditimbang_pada DESC);

-- Kredit / belum lunas dan riwayat pembayaran
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_kasir_belum_lunas ON kasir (sortir_id) WHERE status_pembayaran = 'belum_lunas';

-- Stok aktif
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sortir_bal_stok_aktif ON sortir_bal (status_stok) WHERE status_stok <> 'keluar';

-- Pencarian petani (nama)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_master_petani_nama_trgm ON master_petani USING gin (lower(nama_petani) gin_trgm_ops);


-- ---------------------------------------------------------------------
-- 4. Constraint (NOT VALID dulu, lalu VALIDATE setelah data lama dibersihkan)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_sortir_bal_no_bal_baku') THEN
    ALTER TABLE sortir_bal ADD CONSTRAINT ck_sortir_bal_no_bal_baku
      CHECK (no_bal = upper(btrim(no_bal)) AND no_bal ~ '^[A-Z]+[0-9]+$') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_timbangan_berat_wajar') THEN
    ALTER TABLE timbangan ADD CONSTRAINT ck_timbangan_berat_wajar
      CHECK (berat_bruto_kg > 0 AND potongan_tara_kg >= 0 AND berat_netto_kg >= 0 AND berat_netto_kg <= berat_bruto_kg) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_sortir_bal_potongan_tikar') THEN
    ALTER TABLE sortir_bal ADD CONSTRAINT ck_sortir_bal_potongan_tikar
      CHECK ((ganti_tikar AND potongan_tikar > 0) OR (NOT ganti_tikar AND potongan_tikar = 0)) NOT VALID;
  END IF;
END $$;

-- Setelah pemeriksaan bagian 9 bersih:
-- ALTER TABLE sortir_bal VALIDATE CONSTRAINT ck_sortir_bal_no_bal_baku;
-- ALTER TABLE timbangan  VALIDATE CONSTRAINT ck_timbangan_berat_wajar;
-- ALTER TABLE sortir_bal VALIDATE CONSTRAINT ck_sortir_bal_potongan_tikar;


-- ---------------------------------------------------------------------
-- 5. Versi otomatis + updated_at pada setiap perubahan (deteksi tabrakan antar komputer)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION naikkan_versi() RETURNS trigger AS $$
BEGIN
  NEW.versi := COALESCE(OLD.versi, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sortir_versi ON sortir;
CREATE TRIGGER trg_sortir_versi BEFORE UPDATE ON sortir
  FOR EACH ROW EXECUTE FUNCTION naikkan_versi();

DROP TRIGGER IF EXISTS trg_sortir_bal_versi ON sortir_bal;
CREATE TRIGGER trg_sortir_bal_versi BEFORE UPDATE ON sortir_bal
  FOR EACH ROW EXECUTE FUNCTION naikkan_versi();


-- ---------------------------------------------------------------------
-- 6. View satu sumber untuk laporan (bal + kupon + petani + timbang + status bayar)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_bal_lengkap AS
SELECT
  sb.sortir_bal_id,
  sb.no_bal,
  sb.kode_bal,
  mh.kode_grade                                            AS kode_beli,
  s.sortir_id,
  s.no_kupon,
  s.tanggal_sortir,
  s.status_tahap,
  mp.master_petani_id,
  mp.kode_petani,
  mp.nama_petani,
  sb.ganti_tikar,
  sb.status_stok,
  t.timbangan_id,
  t.berat_bruto_kg,
  t.potongan_tara_kg,
  t.berat_netto_kg,
  t.ditimbang_pada,
  coalesce(sb.harga_beli_per_kg, mh.harga_per_kg)          AS harga_beli_per_kg,
  coalesce(t.berat_netto_kg, 0) * coalesce(sb.harga_beli_per_kg, mh.harga_per_kg) AS nilai_beli,
  sb.potongan_kuli,
  sb.potongan_tali,
  sb.potongan_tikar,
  coalesce(k.status_pembayaran, 'belum_lunas')             AS status_pembayaran,
  (t.timbangan_id IS NULL)                                 AS belum_ditimbang
FROM sortir_bal sb
JOIN sortir s              ON s.sortir_id = sb.sortir_id
JOIN master_petani mp      ON mp.master_petani_id = s.master_petani_id
JOIN master_harga_beli mh  ON mh.master_harga_beli_id = sb.master_harga_beli_id
LEFT JOIN timbangan t      ON t.sortir_bal_id = sb.sortir_bal_id
LEFT JOIN kasir k          ON k.sortir_id = s.sortir_id;

COMMENT ON VIEW v_bal_lengkap IS
  'Satu baris per bal untuk Laporan Bal / Pembelian. Semua bal ikut, termasuk belum ditimbang dan belum lunas; saring status_pembayaran = ''lunas'' untuk nilai aset.';

-- Contoh pemakaian view: rekap per kode bal untuk satu hari
-- SELECT kode_bal, count(*) total, count(*) FILTER (WHERE belum_ditimbang) belum_ditimbang
--   FROM v_bal_lengkap WHERE tanggal_sortir = CURRENT_DATE GROUP BY kode_bal ORDER BY kode_bal;

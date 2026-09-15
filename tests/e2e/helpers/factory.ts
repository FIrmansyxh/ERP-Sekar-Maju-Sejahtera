/**
 * Factory data uji deterministik yang mengikuti struktur src/types/index.ts
 * dan aturan bisnis aplikasi (tara, potongan kuli/tali/tikar).
 */
export interface BalSpec {
  no_bal: string;
  grade: string; // kode Master Harga Beli, mis. '45'
  harga: number; // Rp/kg snapshot
  bruto: number; // kg (0 = belum ditimbang)
  gantiTikar?: boolean;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function ddmmyyyy(dateISO: string): string {
  const [y, m, d] = dateISO.split('-');
  return `${d}${m}${y}`;
}

/** Aturan tara: SB = 2kg; selain SB: <=49 -> 3kg, 50-59 -> 5kg, >=60 -> 6kg. */
export function hitungTara(bruto: number, noBal: string): number {
  if (/^SB/i.test(noBal.trim())) return 2;
  if (bruto <= 0) return 0;
  if (bruto >= 60) return 6;
  if (bruto >= 50) return 5;
  return 3;
}

export const POT_KULI = 7000;
export const POT_TALI = 3000;
export const POT_TIKAR = 75000;

export interface PetaniSpec {
  petani_id: string;
  nama_petani: string;
  no_hp?: string;
  alamat?: string;
  desa_kecamatan?: string;
}

export function buildTransaksi(opts: {
  txId: string;
  kupon: string;
  petani: PetaniSpec;
  tanggal?: string;
  bals: BalSpec[];
  lunas?: boolean;
  operator?: string;
}) {
  const tanggal = opts.tanggal || todayISO();
  const items = opts.bals.map((b, idx) => {
    const tara = b.bruto > 0 ? hitungTara(b.bruto, b.no_bal) : 0;
    const netto = b.bruto > 0 ? Math.round((b.bruto - tara) * 1000) / 1000 : 0;
    const potTikar = b.gantiTikar ? POT_TIKAR : 0;
    const potongan = POT_KULI + POT_TALI + potTikar;
    const kotor = Math.round(netto * b.harga);
    const bersih = b.bruto > 0 ? Math.max(0, kotor - potongan) : 0;
    const barangId = `BAL-${opts.txId.replace('TRX-', '')}-${String(idx + 1).padStart(2, '0')}`;
    return {
      item_id: `BAL-ITEM-${opts.txId}-${idx + 1}`,
      no_bal: b.no_bal,
      barcode: b.no_bal,
      kode_grade: b.grade,
      harga_per_kg: b.harga,
      ganti_tikar: Boolean(b.gantiTikar),
      berat_bruto_kg: b.bruto,
      potongan_tara_kg: tara,
      is_netto_manual: false,
      berat_kg: netto,
      potongan_kuli: POT_KULI,
      potongan_tali: POT_TALI,
      potongan_tikar: potTikar,
      potongan,
      total_kotor: kotor,
      subtotal_bersih: bersih,
      status_timbang: b.bruto > 0 ? 'selesai_timbang' : 'menunggu_timbang',
      lokasi_simpan: 'Blok A',
      barang_id: barangId,
    };
  });

  const allWeighed = items.every((it) => it.berat_kg > 0);
  const totalNetto = Math.round(items.reduce((a, it) => a + it.berat_kg, 0) * 1000) / 1000;
  const totalBruto = Math.round(items.reduce((a, it) => a + (it.berat_bruto_kg || 0), 0) * 1000) / 1000;
  const totalKotor = items.reduce((a, it) => a + it.total_kotor, 0);
  const totalPotongan = items.reduce((a, it) => a + it.potongan, 0);
  const hargaFinal = items.reduce((a, it) => a + it.subtotal_bersih, 0);
  const grades = Array.from(new Set(items.map((i) => i.kode_grade)));

  const barangs = items.map((it) => ({
    barang_id: it.barang_id,
    barcode: it.no_bal,
    kode_grade: it.kode_grade,
    no_bal: it.no_bal,
    berat_kg: it.berat_kg,
    harga_per_kg: it.harga_per_kg,
    total_harga: it.berat_kg * it.harga_per_kg,
    berat_bruto_kg: it.berat_bruto_kg,
    potongan_tara_kg: it.potongan_tara_kg,
    status_stok: 'di_gudang',
    tanggal_masuk: tanggal,
    petani_id: opts.petani.petani_id,
    nama_petani: opts.petani.nama_petani,
    desa_kecamatan: opts.petani.desa_kecamatan,
    transaksi_pembelian_id: opts.txId,
    catatan: `Seed QA - Kupon ${opts.kupon}`,
  }));

  const tx: any = {
    transaksi_id: opts.txId,
    no_kupon: opts.kupon,
    petani_id: opts.petani.petani_id,
    nama_petani: opts.petani.nama_petani,
    no_hp: opts.petani.no_hp || '-',
    desa_kecamatan: opts.petani.desa_kecamatan || opts.petani.alamat || 'Pamekasan',
    no_bal: items.map((i) => i.no_bal).join(', '),
    kode_grade: grades.length === 1 ? grades[0] : `Multi (${grades.join(', ')})`,
    total_bal: items.length,
    bal_selesai_timbang: items.filter((i) => i.berat_kg > 0).length,
    items,
    barang_ids: barangs.map((b) => b.barang_id),
    jenis_timbang: 'bruto',
    berat_terukur_kg: totalBruto,
    potongan_tara_kg: items.reduce((a, it) => a + it.potongan_tara_kg, 0),
    berat_kg: totalNetto,
    harga_per_kg: totalNetto > 0 ? Math.round(totalKotor / totalNetto) : items[0]?.harga_per_kg || 0,
    total_kotor: totalKotor,
    potongan_kuli: items.length * POT_KULI,
    potongan_tali: items.length * POT_TALI,
    potongan_tikar: items.reduce((a, it) => a + it.potongan_tikar, 0),
    total_potongan: totalPotongan,
    total_harga_beli: totalKotor,
    harga_final: hargaFinal,
    status_transaksi: allWeighed ? 'lengkap' : 'menunggu',
    status_tahap: allWeighed ? 'lengkap' : 'menunggu_timbang',
    status_pembayaran: opts.lunas ? 'lunas' : 'belum_lunas',
    metode_pembayaran: opts.lunas ? 'cash' : undefined,
    dibayar_pada: opts.lunas ? new Date().toISOString() : undefined,
    dibayar_oleh: opts.lunas ? 'Dewi Lestari, S.E.' : undefined,
    status_nota: 'belum_cetak',
    unduh_nota_count: 0,
    tanggal_transaksi: tanggal,
    operator_nama: opts.operator || 'Ahmad Fauzi, S.P. (Sortir A)',
    petugas_sortir: opts.operator || 'Ahmad Fauzi, S.P. (Sortir A)',
    petugas_timbang: allWeighed ? 'Siti Rahayu' : undefined,
  };

  return { tx, barangs, totals: { totalNetto, totalKotor, totalPotongan, hargaFinal } };
}

export function buildPengiriman(opts: {
  id: string;
  noSuratJalan: string;
  tujuan: string;
  barangs: Array<{ barang_id: string; berat_kg: number }>;
  hargaJualPerKg: number;
  kodeHargaJual: string;
  status?: 'dimuat' | 'dalam_perjalanan' | 'diterima' | 'dikirim' | 'selesai';
  tanggal?: string;
}) {
  const totalBerat = Math.round(opts.barangs.reduce((a, b) => a + b.berat_kg, 0) * 1000) / 1000;
  const hargaMap: Record<string, number> = {};
  const kodeMap: Record<string, string> = {};
  opts.barangs.forEach((b) => {
    hargaMap[b.barang_id] = opts.hargaJualPerKg;
    kodeMap[b.barang_id] = opts.kodeHargaJual;
  });
  return {
    pengiriman_id: opts.id,
    no_surat_jalan: opts.noSuratJalan,
    tujuan: opts.tujuan,
    driver_nama: 'Sopir QA',
    plat_nomor: 'M 1234 QA',
    tanggal_kirim: opts.tanggal || todayISO(),
    barang_ids: opts.barangs.map((b) => b.barang_id),
    total_bal: opts.barangs.length,
    total_berat_kg: totalBerat,
    status: opts.status || 'dikirim',
    total_nilai_deal: Math.round(totalBerat * opts.hargaJualPerKg),
    harga_deal_map: hargaMap,
    kode_harga_jual_map: kodeMap,
    dibuat_oleh: 'Dedi Setiawan',
  };
}

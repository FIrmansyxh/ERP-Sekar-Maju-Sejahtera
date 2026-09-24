import { Barang, BatchPengirimanSample, PengirimanBarang, SampleItemDetail, TransaksiItemBal, TransaksiPembelian } from '../types';

/**
 * Pembangun data uji. Hanya isi yang relevan untuk tes yang diisi; sisanya sengaja dibiarkan kosong
 * (tipe dipersempit dengan `as unknown as`), supaya tes tetap singkat dan fokus pada perilaku.
 */

export const buatBal = (id: string, extra: Partial<Barang> = {}): Barang =>
  ({
    barang_id: id,
    no_bal: id,
    kode_grade: '57',
    berat_kg: 40,
    berat_bruto_kg: 44,
    potongan_tara_kg: 4,
    harga_per_kg: 30000,
    status_stok: 'di_gudang',
    petani_id: 'P1',
    tanggal_masuk: '2026-09-01',
    ...extra,
  }) as Barang;

export const buatSuratJalan = (id: string, status: PengirimanBarang['status'], extra: Partial<PengirimanBarang> = {}): PengirimanBarang =>
  ({
    pengiriman_id: id,
    no_surat_jalan: `SJ-${id}`,
    tanggal_kirim: '2026-09-17',
    tujuan: 'Pabrik A',
    status,
    total_bal: 2,
    total_berat_kg: 88,
    driver_nama: 'Sopir',
    plat_nomor: 'M 1234 AB',
    petugas: 'Operator',
    barang_ids: ['B1', 'B2'],
    harga_deal_map: { B1: 45000, B2: 46000 },
    berat_kirim_map: { B1: 44, B2: 44 },
    total_nilai_deal: 44 * 45000 + 44 * 46000,
    ...extra,
  }) as unknown as PengirimanBarang;

export const buatItemSample = (id: string, extra: Partial<SampleItemDetail> = {}): SampleItemDetail =>
  ({
    sample_item_id: `SI-${id}`,
    barang_id: id,
    no_bal: id,
    kode_bal_pembeli: `J-${id}`,
    kode_grade: '57',
    kode_harga_jual: 'HJ-45',
    berat_bal_kg: 40,
    berat_bruto_kg: 44,
    potongan_tara_kg: 4,
    harga_beli_kg: 30000,
    harga_tawaran_kg: 45000,
    status_item: 'dikirim',
    sudah_dikirim_do: false,
    ...extra,
  }) as SampleItemDetail;

export const buatBatch = (id: string, status: BatchPengirimanSample['status'], extra: Partial<BatchPengirimanSample> = {}): BatchPengirimanSample =>
  ({
    batch_id: id,
    kode_batch: `SAMPLE-${id}`,
    tujuan_buyer: 'Buyer A',
    permintaan_buyer: '',
    sumber_gudang: 'Gudang Utama',
    tanggal_kirim: '2026-09-10',
    status,
    dikirim_oleh: 'QC',
    catatan: '',
    items: [buatItemSample('B1'), buatItemSample('B2')],
    total_sample_bal: 2,
    total_bal_disetujui: 0,
    total_bal_ditolak: 0,
    total_bal_nego: 0,
    total_estimasi_nilai: 2 * 44 * 45000,
    total_nilai_deal: 0,
    ...extra,
  }) as unknown as BatchPengirimanSample;

export const buatKupon = (id: string, extra: Partial<TransaksiPembelian> = {}): TransaksiPembelian =>
  ({
    transaksi_id: id,
    no_kupon: `KUP${id}`,
    petani_id: 'P1',
    nama_petani: 'Petani Satu',
    tanggal_transaksi: '2026-09-19',
    items: [],
    total_bal: 0,
    berat_kg: 0,
    harga_final: 0,
    ...extra,
  }) as unknown as TransaksiPembelian;

/** Satu bal di dalam kupon (rincian Sortir/Timbangan). */
export const buatItemBal = (noBal: string, extra: Partial<TransaksiItemBal> = {}): TransaksiItemBal =>
  ({
    item_id: `ITEM-${noBal}`,
    no_bal: noBal,
    barcode: noBal,
    kode_grade: '40',
    harga_per_kg: 40000,
    ganti_tikar: false,
    berat_bruto_kg: 0,
    potongan_tara_kg: 0,
    berat_kg: 0,
    potongan_kuli: 7000,
    potongan_tali: 3000,
    potongan_tikar: 0,
    potongan: 10000,
    total_kotor: 0,
    subtotal_bersih: 0,
    status_timbang: 'menunggu_timbang',
    ...extra,
  }) as TransaksiItemBal;

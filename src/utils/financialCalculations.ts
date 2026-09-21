import {
  Barang,
  TransaksiPembelian,
  PengirimanBarang,
  MasterHargaJual,
  TabelHarga,
} from '../types';
import { beratKirimBal, nettoJualBal } from './beratKirim';
import { isPenjualanMasuk } from './kunciHapus';

/**
 * Interface hasil kalkulasi metrik barang terkirim dan keuntungan bersih
 */
export interface ShippedBalMetrics {
  totalBalTerkirim: number;
  totalBeratTerkirimKg: number;
  totalKgTerkirim: number;
  totalPenjualan: number;
  totalHargaBeliTerkirim: number;
  keuntunganBersih: number;
  profitMarginPct: number;
  roiPct: number;
  validShippedDO: PengirimanBarang[];
}

/**
 * Interface hasil valuasi stok aktif gudang
 */
export interface ValuasiStokGudangResult {
  count: number;
  totalKg: number;
  totalValuasi: number;
  items: Barang[];
}

/**
 * Menghitung nilai murni bal tembakau:
 * Nilai = Berat Netto (kg) * Harga Beli (Rp/kg)
 * Mengabaikan biaya potongan kuli, tali, atau tikar.
 */
export function hitungNilaiBal(
  bal: Partial<Barang>,
  fallbackHargaBeli: number = 0
): number {
  const netto = Number(bal.berat_kg || 0);
  const hargaBeli = Number(bal.harga_per_kg !== undefined && bal.harga_per_kg !== null ? bal.harga_per_kg : fallbackHargaBeli);
  return netto * hargaBeli;
}

/**
 * Jumlah bayar satu bal = Nilai Beli - (kuli + tali + tikar), sama dengan subtotal_bersih yang dipakai Kasir dan Nota.
 * Bal yang belum ditimbang belum bernilai sehingga jumlah bayarnya 0, dan jumlah bayar tidak pernah negatif.
 */
export function hitungJumlahBayarBal(nilaiBeli: number, netto: number, potongan: number): number {
  return netto > 0 ? Math.max(0, nilaiBeli - potongan) : 0;
}

/**
 * Menghitung total modal murni satu transaksi pembelian:
 * Total Modal = Total Berat Netto Bal * Harga Beli masing-masing bal
 * Murni mengabaikan potongan kuli, tali, atau tikar (bukan harga_final).
 */
export function hitungModalTransaksi(transaksi: Partial<TransaksiPembelian>): number {
  if (transaksi.items && transaksi.items.length > 0) {
    return transaksi.items.reduce((sum, item) => {
      const netto = Number(item.berat_kg || 0);
      const hrg = Number(item.harga_per_kg || 0);
      return sum + (netto * hrg);
    }, 0);
  }

  if (transaksi.total_harga_beli !== undefined && transaksi.total_harga_beli > 0) {
    return Number(transaksi.total_harga_beli);
  }

  const netto = Number(transaksi.berat_kg || 0);
  const hrg = Number(transaksi.harga_per_kg || 0);
  return netto * hrg;
}

/**
 * Menghitung akumulasi total modal murni seluruh transaksi pembelian:
 * Total Modal = Nilai semua bal yang sudah dibeli (Netto * Harga Beli)
 */
export function hitungTotalModalPembelian(transaksiList: TransaksiPembelian[]): number {
  return transaksiList.reduce((sum, tx) => sum + hitungModalTransaksi(tx), 0);
}

/**
 * Menghitung valuasi aset stok tembakau yang FISIKNYA MASIH ADA DI GUDANG:
 * Valuasi (Stok Gudang) = Sisa bal di gudang * Berat Netto * Harga Beli
 * Hanya mencakup status 'di_gudang', 'siap_kirim', atau 'terkirim_sample'.
 */
export function hitungValuasiStokGudang(
  barangList: Barang[],
  hargaBeliList: TabelHarga[] = []
): ValuasiStokGudangResult {
  const hargaMap = new Map<string, number>();
  hargaBeliList.forEach((h) => {
    if (h.kode_grade && h.harga_per_kg) {
      hargaMap.set(h.kode_grade.toUpperCase(), h.harga_per_kg);
    }
  });

  const physicalItems = barangList.filter((b) => {
    return (
      b.status_stok === 'di_gudang' ||
      b.status_stok === 'siap_kirim' ||
      b.status_stok === 'terkirim_sample'
    );
  });

  let totalKg = 0;
  let totalValuasi = 0;

  physicalItems.forEach((bal) => {
    const netto = Number(bal.berat_kg || 0);
    const gradePrice = hargaMap.get((bal.kode_grade || '').toUpperCase()) || 0;
    const hargaBeli = bal.harga_per_kg !== undefined && bal.harga_per_kg > 0 ? bal.harga_per_kg : gradePrice;
    const nilai = netto * hargaBeli;

    totalKg += netto;
    totalValuasi += nilai;
  });

  return {
    count: physicalItems.length,
    totalKg,
    totalValuasi,
    items: physicalItems,
  };
}

/**
 * Helper terpusat untuk menghitung metrik penjualan dan keuntungan bersih
 * berdasarkan riwayat pengiriman barang ke pabrik:
 * - Total Penjualan = Berat Bruto Bal Terkirim * Harga Jual Deal
 * - Total Modal Bal Terkirim = Berat Netto Bal Terkirim * Harga Beli Bal
 * - Keuntungan Bersih = Total Penjualan - Total Modal Bal Terkirim
 * Sesuai aturan: nilai penjualan baru masuk setelah Surat Jalan berstatus Selesai;
 * DO yang masih dimuat / dikirim / dalam perjalanan / tiba di pabrik belum dihitung.
 */
export function hitungProfitPengiriman(
  pengirimanList: PengirimanBarang[],
  barangList: Barang[],
  masterHargaJualList: MasterHargaJual[] = [],
  hargaBeliList: TabelHarga[] = []
): ShippedBalMetrics {
  const barangMap = new Map<string, Barang>();
  barangList.forEach((b) => barangMap.set(b.barang_id, b));

  const hargaBeliMap = new Map<string, number>();
  hargaBeliList.forEach((h) => {
    if (h.kode_grade && h.harga_per_kg) {
      hargaBeliMap.set(h.kode_grade.toUpperCase(), h.harga_per_kg);
    }
  });

  const masterHargaJualByKode = new Map<string, number>();
  masterHargaJualList.forEach((hj) => {
    if (hj.kode) masterHargaJualByKode.set(hj.kode.toUpperCase(), hj.harga_jual);
    if (hj.harga_jual_id) masterHargaJualByKode.set(hj.harga_jual_id, hj.harga_jual);
  });

  const validShippedDO = pengirimanList.filter(isPenjualanMasuk);

  let totalBalTerkirim = 0;
  let totalBeratTerkirimKg = 0;
  let totalPenjualan = 0;
  let totalHargaBeliTerkirim = 0;

  validShippedDO.forEach((p) => {
    if (!p.barang_ids || p.barang_ids.length === 0) return;

    // Kumpulkan bal untuk pengiriman ini
    const doBals: Barang[] = [];
    p.barang_ids.forEach((balId) => {
      const bal = barangMap.get(balId);
      if (bal) doBals.push(bal);
    });

    // Penjualan memakai berat bruto saat dikirim (bisa susut); modal tetap memakai berat netto saat dibeli
    const beratKirim = (b: Barang) => Number(beratKirimBal(p, b.barang_id, b));
    // Nilai penjualan dihitung dari netto jual (bruto timbang ulang dikurangi potongan aturan netto)
    const nettoKirim = (b: Barang) => Number(nettoJualBal(p, b.barang_id, b));
    const doTotalNettoKg = doBals.reduce((sum, b) => sum + nettoKirim(b), 0);

    // Cek apakah ada total_nilai_deal langsung di DO
    const hasDoTotalDeal = p.total_nilai_deal !== undefined && p.total_nilai_deal > 0;

    let doPenjualan = 0;
    let doModalBeli = 0;

    doBals.forEach((bal) => {
      const netto = Number(bal.berat_kg || 0);
      const brutoKirim = beratKirim(bal);
      const gradeBuyPrice = hargaBeliMap.get((bal.kode_grade || '').toUpperCase()) || 0;
      const hargaBeli = bal.harga_per_kg !== undefined && bal.harga_per_kg > 0 ? bal.harga_per_kg : gradeBuyPrice;
      const modalBal = netto * hargaBeli;

      doModalBeli += modalBal;
      totalBalTerkirim += 1;
      totalBeratTerkirimKg += brutoKirim;

      if (hasDoTotalDeal) {
        // Jika ada nilai deal total pada DO, distribusikan secara proporsional sesuai netto jual
        const proporsiBerat = doTotalNettoKg > 0 ? nettoKirim(bal) / doTotalNettoKg : 1 / doBals.length;
        doPenjualan += (p.total_nilai_deal || 0) * proporsiBerat;
      } else {
        // Cari harga jual per bal
        let hargaJualBal = 0;
        if (p.harga_deal_map && p.harga_deal_map[bal.barang_id]) {
          hargaJualBal = p.harga_deal_map[bal.barang_id];
        } else if (p.kode_harga_jual_map && p.kode_harga_jual_map[bal.barang_id]) {
          const kodeHj = p.kode_harga_jual_map[bal.barang_id];
          hargaJualBal = masterHargaJualByKode.get(kodeHj.toUpperCase()) || 0;
        } else {
          // Cari berdasarkan kode grade bal pada master harga jual
          const hjMatch = masterHargaJualList.find((hj) =>
            hj.kode.toUpperCase().includes((bal.kode_grade || '').toUpperCase())
          );
          hargaJualBal = hjMatch ? hjMatch.harga_jual : 0;
        }

        doPenjualan += nettoKirim(bal) * hargaJualBal;
      }
    });

    totalHargaBeliTerkirim += doModalBeli;
    totalPenjualan += doPenjualan;
  });

  const keuntunganBersih = totalPenjualan - totalHargaBeliTerkirim;
  const profitMarginPct = totalPenjualan > 0 ? (keuntunganBersih / totalPenjualan) * 100 : 0;
  const roiPct = totalHargaBeliTerkirim > 0 ? (keuntunganBersih / totalHargaBeliTerkirim) * 100 : 0;

  return {
    totalBalTerkirim,
    totalBeratTerkirimKg,
    totalKgTerkirim: totalBeratTerkirimKg,
    totalPenjualan: Math.round(totalPenjualan),
    totalHargaBeliTerkirim: Math.round(totalHargaBeliTerkirim),
    keuntunganBersih: Math.round(keuntunganBersih),
    profitMarginPct,
    roiPct,
    validShippedDO,
  };
}

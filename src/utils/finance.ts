import {
  Barang,
  TransaksiPembelian,
  PengirimanBarang,
  MasterHargaJual,
  TabelHarga,
} from '../types';
import {
  hitungJumlahBayarBal,
  hitungNilaiBal as hitungNilaiBalOriginal,
  hitungModalTransaksi as hitungModalTransaksiOriginal,
  hitungTotalModalPembelian as hitungTotalModalPembelianOriginal,
  hitungValuasiStokGudang as hitungValuasiStokGudangOriginal,
  hitungProfitPengiriman as hitungProfitPengirimanOriginal,
  ShippedBalMetrics,
  ValuasiStokGudangResult,
} from './financialCalculations';

// Re-export types for consumers
export type { ShippedBalMetrics, ValuasiStokGudangResult };
export { hitungJumlahBayarBal };

/**
 * Interface input fleksibel untuk kalkulasi modal bal
 */
export interface BalModalInput {
  berat_kg?: number;
  harga_per_kg?: number;
  total_harga_beli?: number;
  items?: Array<{ berat_kg?: number; harga_per_kg?: number }>;
}

/**
 * Interface input fleksibel untuk kalkulasi penjualan
 */
export interface PenjualanInput {
  berat_kg?: number;
  total_berat_kg?: number;
  harga_jual?: number;
  harga_deal?: number;
  harga_per_kg?: number;
  total_nilai_deal?: number;
  total_nilai?: number;
}

/**
 * Interface input fleksibel untuk kalkulasi keuntungan/profit bersih
 */
export interface ProfitInput {
  berat_kg?: number;
  total_berat_kg?: number;
  harga_jual?: number;
  harga_deal?: number;
  harga_beli?: number;
  harga_per_kg?: number;
  total_penjualan?: number;
  total_modal?: number;
  total_nilai_deal?: number;
}

/**
 * Menghitung nilai murni per bal tembakau:
 * Nilai = Berat Netto (kg) * Harga Beli (Rp/kg)
 * Murni mengabaikan potongan kuli, tali, atau tikar.
 */
export function hitungNilaiBal(
  bal: Partial<Barang> | { berat_kg?: number; harga_per_kg?: number },
  fallbackHargaBeli: number = 0
): number {
  return hitungNilaiBalOriginal(bal, fallbackHargaBeli);
}

/**
 * Menghitung total modal murni satu transaksi pembelian:
 * Total Modal = Total Berat Netto Bal * Harga Beli masing-masing bal
 * Murni mengabaikan potongan kuli, tali, atau tikar (bukan harga_final).
 */
export function hitungModalTransaksi(transaksi: Partial<TransaksiPembelian>): number {
  return hitungModalTransaksiOriginal(transaksi);
}

/**
 * Re-export helper hitungTotalModalPembelian
 */
export function hitungTotalModalPembelian(transaksiList: TransaksiPembelian[]): number {
  return hitungTotalModalPembelianOriginal(transaksiList);
}

/**
 * Re-export helper hitungValuasiStokGudang
 */
export function hitungValuasiStokGudang(
  barangList: Barang[],
  hargaBeliList: TabelHarga[] = []
): ValuasiStokGudangResult {
  return hitungValuasiStokGudangOriginal(barangList, hargaBeliList);
}

/**
 * Re-export helper hitungProfitPengiriman
 */
export function hitungProfitPengiriman(
  pengirimanList: PengirimanBarang[],
  barangList: Barang[],
  masterHargaJualList: MasterHargaJual[] = [],
  hargaBeliList: TabelHarga[] = []
): ShippedBalMetrics {
  return hitungProfitPengirimanOriginal(
    pengirimanList,
    barangList,
    masterHargaJualList,
    hargaBeliList
  );
}

/**
 * Menghitung total modal murni dari daftar bal atau transaksi:
 * Rumus: Berat Netto * Harga Beli
 * Murni tanpa tambahan biaya potongan kuli, tali, atau tikar.
 *
 * @param balList Daftar bal atau transaksi pembelian
 * @returns Total nominal modal pembelian murni (Rp)
 */
export function hitungTotalModal(
  balList: Array<BalModalInput | Partial<Barang> | Partial<TransaksiPembelian>>
): number {
  if (!Array.isArray(balList) || balList.length === 0) return 0;

  return balList.reduce<number>((sum, item) => {
    if (!item) return sum;

    // Jika item adalah transaksi yang memiliki rincian sub-items bal
    if ('items' in item && Array.isArray(item.items) && item.items.length > 0) {
      let subtotalItems = 0;
      for (const subItem of item.items) {
        const berat = Number(subItem?.berat_kg || 0);
        const harga = Number(subItem?.harga_per_kg || 0);
        subtotalItems += berat * harga;
      }
      return sum + subtotalItems;
    }

    // Jika objek transaksi memiliki total_harga_beli murni
    if ('total_harga_beli' in item && typeof item.total_harga_beli === 'number' && item.total_harga_beli > 0) {
      return sum + item.total_harga_beli;
    }

    // Item bal tunggal: Netto * Harga Beli
    const berat = Number(item.berat_kg || 0);
    const harga = Number(item.harga_per_kg || 0);
    return sum + (berat * harga);
  }, 0);
}

/**
 * Menghitung total nilai penjualan murni dari daftar item atau pengiriman:
 * Rumus: Berat Netto * Harga Jual
 * Murni tanpa biaya tambahan lainnya.
 *
 * @param list Daftar item penjualan atau pengiriman
 * @returns Total nilai penjualan murni (Rp)
 */
export function hitungTotalPenjualan(
  list: Array<PenjualanInput | Partial<PengirimanBarang>>
): number {
  if (!Array.isArray(list) || list.length === 0) return 0;

  return list.reduce<number>((sum, rawItem) => {
    if (!rawItem) return sum;

    const item = rawItem as PenjualanInput & Partial<PengirimanBarang>;

    // Jika terdapat total nilai deal eksplisit pada pengiriman
    if (
      typeof item.total_nilai_deal === 'number' &&
      item.total_nilai_deal > 0
    ) {
      return sum + item.total_nilai_deal;
    }

    if (
      typeof item.total_nilai === 'number' &&
      item.total_nilai > 0
    ) {
      return sum + item.total_nilai;
    }

    // Rumus murni: Netto * Harga Jual
    const berat = Number(item.berat_kg !== undefined ? item.berat_kg : (item.total_berat_kg || 0));
    const hargaJual = Number(
      item.harga_jual !== undefined
        ? item.harga_jual
        : item.harga_deal !== undefined
        ? item.harga_deal
        : item.harga_per_kg !== undefined
        ? item.harga_per_kg
        : 0
    );

    return sum + (berat * hargaJual);
  }, 0);
}

/**
 * Menghitung valuasi persediaan stok fisik tembakau di gudang:
 * Rumus: Berat Netto * Harga Beli
 * Hanya menghitung stok yang statusnya masih berada di gudang ('di_gudang', 'siap_kirim', 'terkirim_sample').
 * Murni tanpa biaya tambahan.
 *
 * @param barangList Daftar barang / bal tembakau
 * @param fallbackHargaMap Peta harga fallback per grade atau array TabelHarga
 * @returns Total nominal valuasi persediaan stok gudang (Rp)
 */
export function hitungValuasiGudang(
  barangList: Partial<Barang>[],
  fallbackHargaMap?: Record<string, number> | Map<string, number> | TabelHarga[]
): number {
  if (!Array.isArray(barangList) || barangList.length === 0) return 0;

  let lookupMap = new Map<string, number>();
  if (Array.isArray(fallbackHargaMap)) {
    fallbackHargaMap.forEach((h) => {
      if (h.kode_grade && h.harga_per_kg) {
        lookupMap.set(h.kode_grade.toUpperCase(), h.harga_per_kg);
      }
    });
  } else if (fallbackHargaMap instanceof Map) {
    lookupMap = fallbackHargaMap;
  } else if (fallbackHargaMap) {
    Object.entries(fallbackHargaMap).forEach(([k, v]) => {
      lookupMap.set(k.toUpperCase(), v);
    });
  }

  return barangList.reduce<number>((sum, b) => {
    if (!b) return sum;

    // Filter status stok fisik di gudang
    if (
      b.status_stok &&
      !['di_gudang', 'siap_kirim', 'terkirim_sample'].includes(b.status_stok)
    ) {
      return sum;
    }

    const netto = Number(b.berat_kg || 0);
    let harga = Number(b.harga_per_kg || 0);

    if (harga <= 0 && b.kode_grade) {
      const gradeKey = b.kode_grade.toUpperCase();
      harga = lookupMap.get(gradeKey) || 0;
    }

    // Rumus murni: Netto * Harga Beli
    return sum + (netto * harga);
  }, 0);
}

/**
 * Menghitung keuntungan (profit) bersih tembakau:
 * Rumus: Total Penjualan (Netto * Harga Jual) - Total Modal (Netto * Harga Beli)
 * Murni dari selisih harga per kg dikali netto tanpa biaya potongan tambahan.
 *
 * @param list Daftar item penjualan dan pembelian atau objek profit
 * @returns Keuntungan bersih murni (Rp)
 */
export function hitungProfitBersih(list: Array<ProfitInput>): number {
  if (!Array.isArray(list) || list.length === 0) return 0;

  return list.reduce<number>((sum, item) => {
    if (!item) return sum;

    // Jika item sudah memiliki total penjualan dan modal langsung
    if (
      typeof item.total_penjualan === 'number' &&
      typeof item.total_modal === 'number'
    ) {
      return sum + (item.total_penjualan - item.total_modal);
    }

    const berat = Number(item.berat_kg !== undefined ? item.berat_kg : (item.total_berat_kg || 0));
    const hargaJual = Number(
      item.harga_jual !== undefined
        ? item.harga_jual
        : item.harga_deal !== undefined
        ? item.harga_deal
        : 0
    );
    const hargaBeli = Number(
      item.harga_beli !== undefined
        ? item.harga_beli
        : item.harga_per_kg !== undefined
        ? item.harga_per_kg
        : 0
    );

    const penjualan = berat * hargaJual;
    const modal = berat * hargaBeli;
    return sum + (penjualan - modal);
  }, 0);
}

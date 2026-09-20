import { extractKodeBalPrefix } from './formatters';

/**
 * Rekap jumlah bal per kode bal (HF, SB, TS, dst.) dan per petani.
 * Semua bal dihitung, termasuk yang baru masuk sortir, belum ditimbang, dan belum dibayar,
 * karena pertanyaan yang dijawab adalah "berapa bal yang masuk", bukan nilai pembelian.
 */
export interface BalRekapInput {
  no_bal?: string;
  kode_bal_prefix?: string;
  berat_kg?: number;
  /** 'lunas' bila kuponnya sudah dibayar di Kasir; selain itu dianggap belum lunas (kredit). */
  status_bayar?: string;
  petani_id?: string;
  nama_petani?: string;
}

export type StatusRekapBal = 'belum_timbang' | 'kredit' | 'lunas';

export const statusRekapBal = (b: BalRekapInput): StatusRekapBal => {
  if ((b.berat_kg || 0) <= 0) return 'belum_timbang';
  return b.status_bayar === 'lunas' ? 'lunas' : 'kredit';
};

export const kodeBalRekap = (b: BalRekapInput): string =>
  (b.kode_bal_prefix || extractKodeBalPrefix(b.no_bal) || '').toUpperCase() || '-';

export interface RekapKode {
  kode: string;
  total: number;
  /** Sudah discan di Sortir tetapi belum ditimbang */
  belumTimbang: number;
  /** Sudah ditimbang, kupon belum dibayar */
  kredit: number;
  /** Sudah ditimbang dan kupon lunas */
  lunas: number;
  /** Berat netto bal yang sudah ditimbang (kg), apa pun status bayarnya */
  netto: number;
}

const bandingKode = (a: string, b: string): number => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export function rekapPerKode(rows: BalRekapInput[]): RekapKode[] {
  const peta = new Map<string, RekapKode>();
  for (const r of rows) {
    const kode = kodeBalRekap(r);
    let item = peta.get(kode);
    if (!item) {
      item = { kode, total: 0, belumTimbang: 0, kredit: 0, lunas: 0, netto: 0 };
      peta.set(kode, item);
    }
    item.total += 1;
    const st = statusRekapBal(r);
    if (st === 'belum_timbang') item.belumTimbang += 1;
    else if (st === 'kredit') item.kredit += 1;
    else item.lunas += 1;
    item.netto += r.berat_kg || 0;
  }
  return Array.from(peta.values()).sort((a, b) => bandingKode(a.kode, b.kode));
}

export function totalRekapKode(daftar: RekapKode[]): RekapKode {
  return daftar.reduce<RekapKode>(
    (acc, r) => ({
      kode: 'TOTAL',
      total: acc.total + r.total,
      belumTimbang: acc.belumTimbang + r.belumTimbang,
      kredit: acc.kredit + r.kredit,
      lunas: acc.lunas + r.lunas,
      netto: acc.netto + r.netto,
    }),
    { kode: 'TOTAL', total: 0, belumTimbang: 0, kredit: 0, lunas: 0, netto: 0 }
  );
}

export interface RekapPetani {
  petaniId: string;
  nama: string;
  /** Jumlah bal per kode bal */
  perKode: Record<string, number>;
  total: number;
  belumTimbang: number;
}

export function rekapPerPetani(rows: BalRekapInput[]): { kodeList: string[]; baris: RekapPetani[] } {
  const kodeSet = new Set<string>();
  const peta = new Map<string, RekapPetani>();
  for (const r of rows) {
    const kode = kodeBalRekap(r);
    kodeSet.add(kode);
    const kunci = r.petani_id || r.nama_petani || '-';
    let item = peta.get(kunci);
    if (!item) {
      item = { petaniId: r.petani_id || '', nama: r.nama_petani || '-', perKode: {}, total: 0, belumTimbang: 0 };
      peta.set(kunci, item);
    }
    item.perKode[kode] = (item.perKode[kode] || 0) + 1;
    item.total += 1;
    if (statusRekapBal(r) === 'belum_timbang') item.belumTimbang += 1;
  }
  return {
    kodeList: Array.from(kodeSet).sort(bandingKode),
    baris: Array.from(peta.values()).sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama)),
  };
}

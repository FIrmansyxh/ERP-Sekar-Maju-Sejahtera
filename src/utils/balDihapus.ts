/**
 * Penanda bal yang dihapus dari kupon di perangkat ini.
 *
 * Kupon disimpan dengan menggabungkan salinan layar dengan versi server (lihat mergeKuponParalel), supaya bal
 * yang ditambah perangkat lain tidak hilang. Tanpa penanda ini, bal yang baru dihapus operator ikut terbawa
 * balik dari versi server: penghapusannya tidak pernah sampai ke server dan bal muncul lagi di layar.
 *
 * Penanda dihapus begitu server sudah tidak memuat bal itu lagi (penghapusan terkonfirmasi), saat No Bal yang
 * sama ditambahkan lagi ke kupon yang sama, atau setelah kedaluwarsa.
 */

const KUNCI = 'sms_bal_dihapus_v1';
const MASA_BERLAKU_MS = 3 * 24 * 60 * 60 * 1000;

type Peta = Record<string, number>;

const kunciBal = (transaksiId: string, noBal: string): string => `${transaksiId}|${String(noBal).trim().toUpperCase()}`;

function baca(): Peta {
  try {
    const mentah = localStorage.getItem(KUNCI);
    const peta = mentah ? (JSON.parse(mentah) as Peta) : {};
    return peta && typeof peta === 'object' ? peta : {};
  } catch {
    return {};
  }
}

function tulis(peta: Peta): void {
  try {
    const sekarang = Date.now();
    for (const [k, pada] of Object.entries(peta)) {
      if (sekarang - pada > MASA_BERLAKU_MS) delete peta[k];
    }
    if (Object.keys(peta).length === 0) localStorage.removeItem(KUNCI);
    else localStorage.setItem(KUNCI, JSON.stringify(peta));
  } catch {
    // penyimpanan penuh / tidak tersedia: penanda hanya pelindung tambahan
  }
}

export function catatBalDihapus(transaksiId: string, noBal: string): void {
  if (!transaksiId || !noBal) return;
  const peta = baca();
  peta[kunciBal(transaksiId, noBal)] = Date.now();
  tulis(peta);
}

export function batalkanBalDihapus(transaksiId: string, noBal: string): void {
  if (!transaksiId || !noBal) return;
  const peta = baca();
  const k = kunciBal(transaksiId, noBal);
  if (!(k in peta)) return;
  delete peta[k];
  tulis(peta);
}

/** No Bal (huruf besar) yang dihapus dari kupon ini dan penghapusannya belum terkonfirmasi server. */
export function balDihapusDariKupon(transaksiId: string | undefined): Set<string> {
  const hasil = new Set<string>();
  if (!transaksiId) return hasil;
  const awalan = `${transaksiId}|`;
  const sekarang = Date.now();
  for (const [k, pada] of Object.entries(baca())) {
    if (k.startsWith(awalan) && sekarang - pada <= MASA_BERLAKU_MS) hasil.add(k.slice(awalan.length));
  }
  return hasil;
}

/** Server sudah tidak memuat bal-bal ini: penghapusan terkonfirmasi, penanda tidak dibutuhkan lagi. */
export function konfirmasiBalDihapus(transaksiId: string, noBalDiServer: Iterable<string>): void {
  const tanda = balDihapusDariKupon(transaksiId);
  if (tanda.size === 0) return;
  const diServer = new Set(Array.from(noBalDiServer, (n) => String(n).trim().toUpperCase()));
  const peta = baca();
  let berubah = false;
  for (const no of tanda) {
    if (!diServer.has(no)) {
      delete peta[kunciBal(transaksiId, no)];
      berubah = true;
    }
  }
  if (berubah) tulis(peta);
}

/** Pindahkan penanda ke ID kupon dari server (kupon lokal ternyata tersimpan dengan ID lain). */
export function pindahkanBalDihapus(idLama: string, idBaru: string): void {
  if (!idLama || !idBaru || idLama === idBaru) return;
  const peta = baca();
  const awalan = `${idLama}|`;
  let berubah = false;
  for (const [k, pada] of Object.entries(peta)) {
    if (k.startsWith(awalan)) {
      peta[`${idBaru}|${k.slice(awalan.length)}`] = pada;
      delete peta[k];
      berubah = true;
    }
  }
  if (berubah) tulis(peta);
}

/** ID bal buatan server ("TRX-...-BAL-01"): bal ini pernah tersimpan di server. */
export const isIdBalServer = (itemId?: string): boolean => /-BAL-\d+$/i.test(String(itemId || ''));

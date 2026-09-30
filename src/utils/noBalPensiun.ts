import type { RiwayatNoBal } from '../types';

/**
 * Daftar No Bal yang sudah diganti (dipensiunkan), diisi App dari riwayat Koreksi No Bal.
 *
 * Dipakai di tempat yang tidak memegang daftar riwayat sendiri:
 *  - Sortir menolak scan nomor yang pernah dipakai lalu diganti (No Bal tidak boleh dipakai dua kali).
 *  - mergeKuponParalel tidak membawa balik nomor lama dari salinan kupon yang basi di perangkat lain.
 */

const kunci = (noBal: string): string => String(noBal || '').trim().toUpperCase();

/** nomor lama -> nomor pengganti */
let penggantiLama = new Map<string, string>();
/** nomor lama yang juga sudah hilang dari kupon (kupon belum lunas saat diganti) */
let lamaDiKupon = new Set<string>();

export function aturRiwayatNoBal(riwayat: RiwayatNoBal[]): void {
  const peta = new Map<string, string>();
  const kupon = new Set<string>();
  // Urut dari yang terlama agar pengganti terakhir yang tercatat
  const urut = [...riwayat].sort((a, b) => String(a.diganti_pada).localeCompare(String(b.diganti_pada)));
  for (const r of urut) {
    const lama = kunci(r.no_bal_lama);
    if (!lama) continue;
    peta.set(lama, kunci(r.no_bal_baru));
    if (r.ubah_nota) kupon.add(lama);
  }
  penggantiLama = peta;
  lamaDiKupon = kupon;
}

/** Nomor pengganti bila No Bal ini sudah pernah diganti; null bila belum. */
export function penggantiNoBal(noBal: string): string | null {
  return penggantiLama.get(kunci(noBal)) ?? null;
}

/** No Bal ini sudah diganti ketika kuponnya belum lunas, jadi nomor ini tidak boleh ada lagi di kupon mana pun. */
export function noBalPensiunDiKupon(noBal: string): boolean {
  return lamaDiKupon.has(kunci(noBal));
}

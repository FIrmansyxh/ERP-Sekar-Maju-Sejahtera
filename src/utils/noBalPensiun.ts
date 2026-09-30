import type { RiwayatNoBal } from '../types';

/**
 * Daftar No Bal yang sudah diganti (dipensiunkan), diisi App dari riwayat Koreksi No Bal.
 *
 * Dipakai di tempat yang tidak memegang daftar riwayat sendiri:
 *  - Sortir menolak scan nomor yang pernah dipakai lalu diganti (No Bal tidak boleh dipakai dua kali).
 *  - Bal gudang yang dibentuk dari kupon (buildBarangDariItem) memakai nomor terbarunya, dan Timbangan menemukan bal
 *    lewat nomor baru walau kupon tetap menyimpan nomor saat disortir.
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

/**
 * Nomor yang berlaku sekarang untuk bal yang di kuponnya tercatat `noBal` (mengikuti rantai penggantian). Kupon dan
 * nota selalu menyimpan nomor saat disortir; bal di gudang, sample, dan Surat Jalan memakai nomor ini.
 */
export function noBalTerkini(noBal: string): string {
  let hasil = kunci(noBal);
  const dilihat = new Set<string>([hasil]);
  for (let i = 0; i < 50; i++) {
    const berikut = penggantiLama.get(hasil);
    if (!berikut || dilihat.has(berikut)) break;
    dilihat.add(berikut);
    hasil = berikut;
  }
  return hasil === kunci(noBal) ? noBal : hasil;
}

/**
 * No Bal ini diganti pada versi awal Koreksi No Bal yang masih mengubah kupon belum lunas, jadi nomor ini tidak boleh
 * dibawa balik dari salinan kupon yang basi. Penggantian sekarang tidak pernah mengubah kupon.
 */
export function noBalPensiunDiKupon(noBal: string): boolean {
  return lamaDiKupon.has(kunci(noBal));
}

/**
 * Akhiran acak pendek untuk ID internal yang dibuat di perangkat (kupon, batch sample, Surat Jalan).
 *
 * Nomor urut dihitung dari daftar di perangkat masing-masing, jadi dua komputer yang bekerja bersamaan bisa
 * menghasilkan nomor yang sama (mis. dua PC Sortir sama-sama membuat TRX-23092026-005). Akhiran ini membuat ID
 * praktis tidak mungkin kembar, sehingga server bisa memakai ID dari perangkat apa adanya. ID internal tidak
 * ditampilkan ke pengguna.
 */
const HURUF = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function akhiranUnik(panjang = 4): string {
  const angka = new Uint32Array(panjang);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(angka);
  } else {
    for (let i = 0; i < panjang; i++) angka[i] = Math.floor(Math.random() * 2 ** 32);
  }
  return Array.from(angka, (n) => HURUF[n % HURUF.length]).join('');
}

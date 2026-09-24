/**
 * ID kupon lokal yang ternyata tersimpan di server dengan ID lain (kupon yang sama sudah dibuka dari komputer
 * lain, lalu server menggabungkan bal ke kupon itu). Layar yang masih memegang ID lama (mis. kupon terbuka di
 * Sortir) memakai ini untuk berpindah ke ID server tanpa membuat kupon baru.
 */
const KUNCI = 'sms_alias_kupon_v1';

function baca(): Record<string, string> {
  try {
    const mentah = localStorage.getItem(KUNCI);
    const peta = mentah ? JSON.parse(mentah) : {};
    return peta && typeof peta === 'object' ? peta : {};
  } catch {
    return {};
  }
}

export function catatAliasKupon(idLama: string, idBaru: string): void {
  if (!idLama || !idBaru || idLama === idBaru) return;
  try {
    const peta = baca();
    peta[idLama] = idBaru;
    // Cukup ingat alias terbaru; data lama tidak perlu menumpuk
    const kunci = Object.keys(peta);
    if (kunci.length > 200) kunci.slice(0, kunci.length - 200).forEach((k) => delete peta[k]);
    localStorage.setItem(KUNCI, JSON.stringify(peta));
  } catch {
    // penyimpanan tidak tersedia: layar tetap bisa memilih ulang kupon secara manual
  }
}

/** ID kupon terkini untuk ID yang mungkin sudah diganti server (mengikuti rantai alias). */
export function idKuponTerkini(id: string): string {
  if (!id) return id;
  const peta = baca();
  let hasil = id;
  for (let i = 0; i < 5 && peta[hasil]; i++) hasil = peta[hasil];
  return hasil;
}

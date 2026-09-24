/**
 * Nomor dokumen yang diisi manual (Surat Jalan, Surat Pengiriman Sample).
 * Nomor tidak boleh kembar; bila kembar, pengguna diberi tahu nomor terakhir
 * dan saran nomor berikutnya.
 */

/** Bentuk baku nomor dokumen: tanpa spasi tepi, huruf besar. */
export const normalisasiNomor = (nomor: string): string => nomor.trim().toUpperCase();

const POLA_NOMOR = /^(.*?)(\d+)(\D*)$/;

/** Menaikkan angka terakhir dengan jumlah digit tetap (SAMPLE-PJM0001 -> SAMPLE-PJM0002). */
export function nomorBerikutnya(nomor: string): string | null {
  const m = normalisasiNomor(nomor).match(POLA_NOMOR);
  if (!m) return null;
  const [, depan, angka, belakang] = m;
  return `${depan}${String(Number(angka) + 1).padStart(angka.length, '0')}${belakang}`;
}

export interface HasilCekNomor {
  kosong: boolean;
  kembar: boolean;
  /** Nomor terakhir dengan awalan yang sama; bila tidak ada, nomor yang paling akhir dibuat. */
  terakhir: string | null;
  /** Saran nomor berikutnya dari nomor terakhir. */
  saran: string | null;
}

/**
 * @param nomor nomor yang sedang diketik
 * @param daftarNomor nomor yang sudah terpakai, urut dari yang paling lama dibuat
 */
export function cekNomorDokumen(nomor: string, daftarNomor: string[]): HasilCekNomor {
  const baku = normalisasiNomor(nomor);
  const terpakai = daftarNomor.map(normalisasiNomor).filter(Boolean);

  let terakhir: string | null = null;
  const m = baku.match(POLA_NOMOR);
  if (m) {
    const [, depan, , belakang] = m;
    let angkaTerbesar = -1;
    for (const n of terpakai) {
      const cocok = n.match(POLA_NOMOR);
      if (cocok && cocok[1] === depan && cocok[3] === belakang && Number(cocok[2]) > angkaTerbesar) {
        angkaTerbesar = Number(cocok[2]);
        terakhir = n;
      }
    }
  }
  if (!terakhir && terpakai.length > 0) {
    terakhir = terpakai[terpakai.length - 1];
  }

  return {
    kosong: baku === '',
    kembar: baku !== '' && terpakai.includes(baku),
    terakhir,
    saran: terakhir ? nomorBerikutnya(terakhir) : null,
  };
}

/** Pesan penolakan nomor kembar yang sama di semua form. */
export function pesanNomorKembar(jenis: string, nomor: string, hasil: HasilCekNomor): string {
  const info = hasil.terakhir
    ? ` Nomor terakhir adalah ${hasil.terakhir}${hasil.saran ? `, gunakan ${hasil.saran}` : ''}.`
    : '';
  return `No. ${jenis} ${normalisasiNomor(nomor)} sudah dipakai.${info}`;
}

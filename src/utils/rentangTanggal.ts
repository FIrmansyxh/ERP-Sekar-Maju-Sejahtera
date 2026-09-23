export type PresetTanggal = 'hari_ini' | 'kemarin' | 'tujuh_hari' | 'bulan_ini' | 'tahun_ini' | 'semua';

const dua = (n: number) => String(n).padStart(2, '0');

/** Tanggal lokal (bukan UTC) dalam format YYYY-MM-DD, sama dengan format tanggal transaksi. */
export const formatTanggalLokal = (d: Date): string => `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;

/**
 * Tanggal hari ini menurut jam komputer (WIB), YYYY-MM-DD. Jangan memakai toISOString() untuk ini: hasilnya UTC,
 * sehingga antara pukul 00.00 dan 06.59 WIB tanggal yang tercatat adalah tanggal kemarin.
 */
export const hariIniLokal = (): string => formatTanggalLokal(new Date());

/** Rentang tanggal untuk pilihan cepat; 'semua' berarti tanpa batas tanggal (sepanjang masa). */
export function rentangPreset(preset: PresetTanggal, sekarang: Date = new Date()): { start: string; end: string } {
  const hariIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  switch (preset) {
    case 'hari_ini':
      return { start: formatTanggalLokal(hariIni), end: formatTanggalLokal(hariIni) };
    case 'kemarin': {
      const k = new Date(hariIni);
      k.setDate(k.getDate() - 1);
      return { start: formatTanggalLokal(k), end: formatTanggalLokal(k) };
    }
    case 'tujuh_hari': {
      const awal = new Date(hariIni);
      awal.setDate(awal.getDate() - 6);
      return { start: formatTanggalLokal(awal), end: formatTanggalLokal(hariIni) };
    }
    case 'bulan_ini':
      return { start: formatTanggalLokal(new Date(hariIni.getFullYear(), hariIni.getMonth(), 1)), end: formatTanggalLokal(hariIni) };
    case 'tahun_ini':
      return { start: formatTanggalLokal(new Date(hariIni.getFullYear(), 0, 1)), end: formatTanggalLokal(hariIni) };
    case 'semua':
    default:
      return { start: '', end: '' };
  }
}

/** Pilihan cepat yang cocok dengan rentang yang sedang dipakai, atau null bila rentang bebas. */
export function presetAktif(start: string, end: string, sekarang: Date = new Date()): PresetTanggal | null {
  const daftar: PresetTanggal[] = ['semua', 'hari_ini', 'kemarin', 'tujuh_hari', 'bulan_ini', 'tahun_ini'];
  return daftar.find((p) => {
    const r = rentangPreset(p, sekarang);
    return r.start === start && r.end === end;
  }) ?? null;
}

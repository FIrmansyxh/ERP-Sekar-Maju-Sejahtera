import { useCallback, useEffect, useState } from 'react';

/**
 * Pilihan tampilan halaman laporan: panel Filter dan panel Ringkasan (kartu/dashboard) bisa
 * disembunyikan agar tabel mendapat ruang sebesar mungkin. Pilihan diingat per laporan di
 * peramban ini, jadi staf yang bekerja fokus di tabel tidak perlu menyembunyikannya lagi
 * setiap kali membuka laporan.
 */
interface TampilanLaporan {
  filter: boolean;
  ringkasan: boolean;
}

/** Bagian yang memang ada di sebuah laporan; laporan tanpa panel filter cukup mengisi filter: false. */
export interface BagianLaporan {
  filter?: boolean;
  ringkasan?: boolean;
}

// Awalan sms_ (bukan erp_tembakau_) agar tidak ikut terhapus oleh pembersihan data lama di utils/storage.ts
const kunciPenyimpanan = (kunci: string) => `sms_laporan_tampilan_${kunci}`;

function bacaTampilan(kunci: string): TampilanLaporan {
  try {
    const mentah = localStorage.getItem(kunciPenyimpanan(kunci));
    if (mentah) {
      const data = JSON.parse(mentah);
      return { filter: data?.filter !== false, ringkasan: data?.ringkasan !== false };
    }
  } catch {
    // Penyimpanan diblokir atau rusak: pakai tampilan lengkap
  }
  return { filter: true, ringkasan: true };
}

export function useLaporanTampilan(kunci: string, bagian: BagianLaporan = {}) {
  const adaFilter = bagian.filter !== false;
  const adaRingkasan = bagian.ringkasan !== false;
  const [tampilan, setTampilan] = useState<TampilanLaporan>(() => bacaTampilan(kunci));

  useEffect(() => {
    try {
      localStorage.setItem(kunciPenyimpanan(kunci), JSON.stringify(tampilan));
    } catch {
      // Abaikan: tampilan tetap berfungsi walau tidak bisa diingat
    }
  }, [kunci, tampilan]);

  const toggleFilter = useCallback(() => setTampilan((t) => ({ ...t, filter: !t.filter })), []);
  const toggleRingkasan = useCallback(() => setTampilan((t) => ({ ...t, ringkasan: !t.ringkasan })), []);

  // Semua bagian yang ada di laporan ini sedang tersembunyi
  const fokusTabel = (!adaFilter || !tampilan.filter) && (!adaRingkasan || !tampilan.ringkasan);

  // Fokus tabel: sembunyikan semua bagian; bila sudah fokus, tampilkan kembali semuanya
  const toggleFokus = useCallback(
    () =>
      setTampilan((t) => {
        const sudahFokus = (!adaFilter || !t.filter) && (!adaRingkasan || !t.ringkasan);
        return sudahFokus ? { filter: true, ringkasan: true } : { filter: !adaFilter && t.filter, ringkasan: !adaRingkasan && t.ringkasan };
      }),
    [adaFilter, adaRingkasan]
  );

  return {
    adaFilter,
    adaRingkasan,
    // Bagian yang tidak ada di laporan dianggap tidak menyembunyikan apa pun
    tampilFilter: tampilan.filter,
    tampilRingkasan: tampilan.ringkasan,
    fokusTabel,
    toggleFilter,
    toggleRingkasan,
    toggleFokus,
  };
}

export type LaporanTampilan = ReturnType<typeof useLaporanTampilan>;

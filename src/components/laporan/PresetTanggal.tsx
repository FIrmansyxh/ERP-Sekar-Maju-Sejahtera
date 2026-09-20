import React from 'react';
import { PresetTanggal as JenisPreset, presetAktif, rentangPreset } from '../../utils/rentangTanggal';

interface PresetTanggalProps {
  /** Rentang yang sedang dipakai di form, untuk menandai pilihan yang aktif. */
  startDate: string;
  endDate: string;
  /** Dipanggil saat sebuah pilihan diklik; pemanggil menerapkan rentang itu langsung. */
  onPilih: (start: string, end: string) => void;
  className?: string;
}

const DAFTAR: Array<{ id: JenisPreset; label: string; judul: string }> = [
  { id: 'hari_ini', label: 'Hari Ini', judul: 'Hanya data tanggal hari ini' },
  { id: 'kemarin', label: 'Kemarin', judul: 'Hanya data tanggal kemarin' },
  { id: 'tujuh_hari', label: '7 Hari', judul: '7 hari terakhir termasuk hari ini' },
  { id: 'bulan_ini', label: 'Bulan Ini', judul: 'Dari tanggal 1 bulan ini sampai hari ini' },
  { id: 'semua', label: 'Sepanjang Masa', judul: 'Tanpa batas tanggal' },
];

/** Pilihan rentang tanggal cepat (Hari Ini, Kemarin, 7 Hari, Bulan Ini, Sepanjang Masa). */
export const PresetTanggal: React.FC<PresetTanggalProps> = ({ startDate, endDate, onPilih, className = '' }) => {
  const aktif = presetAktif(startDate, endDate);

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="group" aria-label="Rentang tanggal cepat">
      <span className="text-[11px] font-semibold text-gray-500 mr-0.5">Rentang cepat:</span>
      {DAFTAR.map((p) => (
        <button
          key={p.id}
          type="button"
          title={p.judul}
          aria-pressed={aktif === p.id}
          onClick={() => {
            const r = rentangPreset(p.id);
            onPilih(r.start, r.end);
          }}
          className={`px-2.5 py-1 text-[11px] font-semibold border rounded-sm transition cursor-pointer ${
            aktif === p.id
              ? 'bg-[#b81d24] text-white border-[#b81d24]'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};

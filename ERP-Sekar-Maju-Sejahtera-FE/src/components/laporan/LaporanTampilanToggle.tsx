import React from 'react';
import { SlidersHorizontal, LayoutDashboard, Maximize2, Minimize2 } from 'lucide-react';
import type { LaporanTampilan } from '../../hooks/useLaporanTampilan';

interface LaporanTampilanToggleProps {
  tampilan: LaporanTampilan;
  /** Jumlah filter yang sedang aktif; ditampilkan sebagai lencana saat panel Filter disembunyikan. */
  jumlahFilterAktif?: number;
  className?: string;
}

const tombolDasar =
  'px-2.5 py-1.5 border text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer whitespace-nowrap';
const tombolTampil = 'bg-slate-100 text-slate-900 border-slate-300';
const tombolSembunyi = 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-800';

/**
 * Toolbar seragam semua laporan: sembunyikan / tampilkan panel Filter dan Ringkasan, atau
 * pakai "Fokus Tabel" untuk menyembunyikan keduanya sekaligus.
 */
export const LaporanTampilanToggle: React.FC<LaporanTampilanToggleProps> = ({
  tampilan,
  jumlahFilterAktif = 0,
  className = '',
}) => {
  const { adaFilter, adaRingkasan, tampilFilter, tampilRingkasan, fokusTabel, toggleFilter, toggleRingkasan, toggleFokus } = tampilan;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="group" aria-label="Tampilan laporan">
      {adaFilter && (
      <button
        type="button"
        onClick={toggleFilter}
        aria-pressed={tampilFilter}
        title={tampilFilter ? 'Sembunyikan panel filter' : 'Tampilkan panel filter'}
        className={`${tombolDasar} rounded-sm ${tampilFilter ? tombolTampil : tombolSembunyi}`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Filter</span>
        {!tampilFilter && jumlahFilterAktif > 0 && (
          <span
            className="min-w-[16px] h-4 px-1 bg-[#b81d24] text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            title={`${jumlahFilterAktif} filter masih aktif`}
          >
            {jumlahFilterAktif}
          </span>
        )}
      </button>
      )}

      {adaRingkasan && (
      <button
        type="button"
        onClick={toggleRingkasan}
        aria-pressed={tampilRingkasan}
        title={tampilRingkasan ? 'Sembunyikan ringkasan' : 'Tampilkan ringkasan'}
        className={`${tombolDasar} rounded-sm ${tampilRingkasan ? tombolTampil : tombolSembunyi}`}
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        <span>Ringkasan</span>
      </button>
      )}

      {adaFilter && adaRingkasan && (
      <button
        type="button"
        onClick={toggleFokus}
        aria-pressed={fokusTabel}
        title={fokusTabel ? 'Tampilkan kembali filter dan ringkasan' : 'Sembunyikan filter dan ringkasan agar tabel lebih luas'}
        className={`${tombolDasar} rounded-sm ${
          fokusTabel ? 'bg-[#b81d24] text-white border-[#b81d24] hover:bg-[#a0181e]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        {fokusTabel ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        <span>{fokusTabel ? 'Keluar Fokus' : 'Fokus Tabel'}</span>
      </button>
      )}
    </div>
  );
};

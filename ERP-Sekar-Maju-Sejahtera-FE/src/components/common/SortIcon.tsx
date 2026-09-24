import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

interface SortIconProps {
  /** Kolom ini yang sedang dipakai untuk mengurutkan. */
  aktif: boolean;
  arah: 'asc' | 'desc';
  /** Nomor prioritas bila tabel mendukung urutan banyak kolom. */
  urutan?: number;
}

/**
 * Penanda urutan kolom tabel yang seragam: abu-abu (⇅) saat tidak aktif,
 * merah ↑ untuk terkecil ke terbesar (A-Z) dan merah ↓ untuk sebaliknya.
 */
export const SortIcon: React.FC<SortIconProps> = ({ aktif, arah, urutan }) => {
  if (!aktif) {
    return <ArrowUpDown className="w-3 h-3 text-gray-400 ml-1 inline shrink-0" aria-hidden="true" />;
  }
  const Ikon = arah === 'asc' ? ArrowUp : ArrowDown;
  return (
    <span
      className="inline-flex items-center ml-1 shrink-0 text-[#b81d24]"
      title={arah === 'asc' ? 'Urut terkecil ke terbesar (A-Z)' : 'Urut terbesar ke terkecil (Z-A)'}
    >
      <Ikon className="w-3.5 h-3.5" />
      {urutan !== undefined && <span className="text-[10px] font-bold leading-none">{urutan}</span>}
    </span>
  );
};

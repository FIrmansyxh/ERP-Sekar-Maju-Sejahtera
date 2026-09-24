import React from 'react';
import { COMPANY_ADDRESS, COMPANY_NAME } from '../../config/appInfo';

interface KopSuratProps {
  /** Judul dokumen, mis. "Surat Jalan Pengiriman (DO)". */
  judul: string;
  className?: string;
}

/** Kop surat resmi yang sama untuk semua dokumen cetak & PDF (acuan: Nota Pembelian). */
export const KopSurat: React.FC<KopSuratProps> = ({ judul, className = '' }) => (
  <div className={`text-center border-b-2 border-gray-800 pb-3 space-y-1 font-sans ${className}`}>
    <h1 className="text-2xl font-black tracking-widest text-gray-900 uppercase">
      {COMPANY_NAME}
    </h1>
    <h2 className="text-sm font-bold tracking-tight text-gray-800 uppercase mt-1">
      {judul}
    </h2>
    <p className="text-[10.5px] text-gray-600">
      {COMPANY_ADDRESS}
    </p>
  </div>
);

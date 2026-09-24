import React from 'react';
import { Tag } from 'lucide-react';
import { RekapHargaKode, totalRekapHargaKode } from '../../utils/rekapKodeBal';

interface LaporanPembelianRekapHargaProps {
  data: RekapHargaKode[];
  /** Ringkasan filter yang dipakai, mis. "Periode: 20/09/2026 s.d. 20/09/2026". */
  konteks: string;
}

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

/**
 * Rekap jumlah bal dan rata-rata harga beli per kode bal (HF, SB, TS, dst.). Bal dihitung begitu sudah
 * disortir dan diberi harga, tanpa menunggu ditimbang atau dibayar.
 */
export const LaporanPembelianRekapHarga: React.FC<LaporanPembelianRekapHargaProps> = ({ data, konteks }) => {
  const total = totalRekapHargaKode(data);

  return (
    <section className="bg-white border border-gray-200 shadow-xs">
      <div className="px-4 py-3 bg-[#f8f9fa] border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Tag className="w-4 h-4 text-[#b81d24] shrink-0" />
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Rekap Bal &amp; Rata-rata Harga per Kode</h2>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {konteks}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full max-w-md text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2 px-3 text-left">Kode Bal</th>
              <th className="py-2 px-3 text-right">Jumlah Bal</th>
              <th className="py-2 px-3 text-right">Rata-rata Harga (Rp/Kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {data.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 px-3 text-center text-gray-400">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              data.map((r) => (
                <tr key={r.kode} className="hover:bg-slate-50/70">
                  <td className="py-1.5 px-3 font-mono font-bold text-gray-900">{r.kode}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{r.jumlahBal.toLocaleString('id-ID')}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{rp(r.avgHarga)}</td>
                </tr>
              ))
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-red-50/60 border-t-2 border-gray-300">
                <td className="py-1.5 px-3 font-bold text-[#b81d24] uppercase tracking-wide text-[11px]">Total Keseluruhan</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900">{total.jumlahBal.toLocaleString('id-ID')}</td>
                <td className="py-1.5 px-3 text-right font-mono font-black text-[#b81d24] text-sm">{rp(total.avgHarga)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
};

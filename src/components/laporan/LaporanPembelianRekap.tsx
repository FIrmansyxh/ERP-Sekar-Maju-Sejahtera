import React from 'react';
import { Calculator } from 'lucide-react';

/** Angka rekap upah jasa (potongan) dan nilai kotor untuk satu cakupan data. */
export interface RekapJasa {
  kupon: number;
  bal: number;
  /** Jumlah bal yang ganti tikar */
  balTikar: number;
  tikar: number;
  tali: number;
  kuli: number;
  nilaiBeli: number;
}

/** Total jasa = tali + kuli + tikar. */
export const totalJasa = (r: RekapJasa): number => r.tali + r.kuli + r.tikar;

/** Nilai kotor menurut rumus pemilik: Nilai Beli + Tali + Kuli + Tikar (upah jasa per bal ikut dijumlahkan). */
export const nilaiKotor = (r: RekapJasa): number => r.nilaiBeli + totalJasa(r);

interface LaporanPembelianRekapProps {
  sesuaiFilter: RekapJasa;
  sepanjangMasa: RekapJasa;
  /** Filter tanggal sedang dipakai; bila tidak, kedua kolom sama sehingga cukup satu. */
  adaFilterTanggal: boolean;
  /** Ringkasan filter yang dipakai, mis. "Periode: 20/09/2026 s.d. 20/09/2026". */
  konteks: string;
}

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const angka = (n: number) => n.toLocaleString('id-ID');

/**
 * Rekap upah jasa dan nilai kotor: berapa bal ganti tikar serta total
 * Nilai Beli + Tali + Kuli + Tikar, untuk hasil filter dan sepanjang masa.
 */
export const LaporanPembelianRekap: React.FC<LaporanPembelianRekapProps> = ({
  sesuaiFilter,
  sepanjangMasa,
  adaFilterTanggal,
  konteks,
}) => {
  const kolom = adaFilterTanggal
    ? [
        { judul: 'Sesuai Filter', data: sesuaiFilter },
        { judul: 'Sepanjang Masa', data: sepanjangMasa },
      ]
    : [{ judul: 'Sepanjang Masa (tanpa batas tanggal)', data: sesuaiFilter }];

  const baris: Array<{ label: string; nilai: (r: RekapJasa) => string; tebal?: boolean; sorot?: boolean }> = [
    { label: 'Jumlah Kupon', nilai: (r) => angka(r.kupon) },
    { label: 'Jumlah Bal', nilai: (r) => angka(r.bal) },
    { label: 'Bal Ganti Tikar', nilai: (r) => `${angka(r.balTikar)} bal`, tebal: true },
    { label: 'Potongan Tikar', nilai: (r) => rp(r.tikar) },
    { label: 'Potongan Tali', nilai: (r) => rp(r.tali) },
    { label: 'Potongan Kuli', nilai: (r) => rp(r.kuli) },
    { label: 'Total Jasa (Tali + Kuli + Tikar)', nilai: (r) => rp(totalJasa(r)), tebal: true },
    { label: 'Nilai Beli', nilai: (r) => rp(r.nilaiBeli) },
    { label: 'Total Nilai Kotor (Nilai Beli + Tali + Kuli + Tikar)', nilai: (r) => rp(nilaiKotor(r)), tebal: true, sorot: true },
  ];

  return (
    <section className="bg-white border border-gray-200 shadow-xs">
      <div className="px-4 py-3 bg-[#f8f9fa] border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Calculator className="w-4 h-4 text-[#b81d24] shrink-0" />
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Rekap Ganti Tikar, Jasa &amp; Nilai Kotor</h2>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {konteks} · Seluruh kupon dihitung, termasuk yang belum dibayar.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full max-w-3xl text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2 px-3 text-left">Keterangan</th>
              {kolom.map((k) => (
                <th key={k.judul} className="py-2 px-3">{k.judul}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {baris.map((b) => (
              <tr key={b.label} className={b.sorot ? 'bg-red-50/60 border-t-2 border-gray-300' : 'hover:bg-slate-50/70'}>
                <td className={`py-1.5 px-3 ${b.tebal ? 'font-bold text-gray-900' : 'text-gray-700'} ${b.sorot ? 'text-[#b81d24] uppercase tracking-wide text-[11px]' : ''}`}>
                  {b.label}
                </td>
                {kolom.map((k) => (
                  <td
                    key={k.judul}
                    className={`py-1.5 px-3 text-right font-mono whitespace-nowrap ${b.tebal ? 'font-bold text-gray-900' : ''} ${b.sorot ? 'text-[#b81d24] text-sm font-black' : ''}`}
                  >
                    {b.nilai(k.data)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

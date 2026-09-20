import React, { useMemo, useState } from 'react';
import { ListChecks } from 'lucide-react';
import {
  BalRekapInput,
  RekapKode,
  rekapPerKode,
  rekapPerPetani,
  totalRekapKode,
} from '../../utils/rekapKodeBal';
import { formatNumber } from '../../utils/formatters';

interface LaporanBalRekapProps {
  /** Bal yang lolos semua filter yang sedang diterapkan. */
  rows: BalRekapInput[];
  /** Bal dengan filter yang sama tetapi tanpa batas tanggal (sepanjang masa). */
  rowsSepanjangMasa: BalRekapInput[];
  /** Ada batas tanggal pada filter; bila tidak, hasil filter sudah sepanjang masa. */
  adaFilterTanggal: boolean;
  /** Ringkasan filter yang dipakai, mis. "Hari ini · Petani UMAM". */
  konteks: string;
}

type Mode = 'kode' | 'petani';

const sel = 'py-1.5 px-2.5 text-right font-mono whitespace-nowrap';
const kg = (n: number) => formatNumber(Math.round(n * 10) / 10);

/**
 * Rekap jumlah bal per kode bal (HF, SB, dst.) atau per petani. Semua bal dihitung, termasuk
 * yang baru masuk sortir dan belum ditimbang atau dibayar.
 */
export const LaporanBalRekap: React.FC<LaporanBalRekapProps> = ({ rows, rowsSepanjangMasa, adaFilterTanggal, konteks }) => {
  const [mode, setMode] = useState<Mode>('kode');

  const perKode = useMemo(() => rekapPerKode(rows), [rows]);
  const perKodeSemua = useMemo(() => rekapPerKode(rowsSepanjangMasa), [rowsSepanjangMasa]);
  const perPetani = useMemo(() => rekapPerPetani(rows), [rows]);

  // Baris tabel: gabungan kode pada periode filter dan sepanjang masa, agar kode yang hari itu nol tetap tampil
  const baris = useMemo(() => {
    const dariFilter = new Map<string, RekapKode>(perKode.map((r) => [r.kode, r]));
    const semua = new Map<string, RekapKode>(perKodeSemua.map((r) => [r.kode, r]));
    const kodeList = adaFilterTanggal
      ? Array.from(new Set<string>([...dariFilter.keys(), ...semua.keys()])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      : perKode.map((r) => r.kode);
    const kosong = (kode: string): RekapKode => ({ kode, total: 0, belumTimbang: 0, kredit: 0, lunas: 0, netto: 0 });
    return kodeList.map((kode) => ({
      kode,
      periode: dariFilter.get(kode) ?? kosong(kode),
      semua: semua.get(kode) ?? kosong(kode),
    }));
  }, [perKode, perKodeSemua, adaFilterTanggal]);

  const totalPeriode = useMemo(() => totalRekapKode(perKode), [perKode]);
  const totalSemua = useMemo(() => totalRekapKode(perKodeSemua), [perKodeSemua]);

  return (
    <section className="bg-white border border-gray-200 shadow-xs">
      <div className="px-4 py-3 bg-[#f8f9fa] border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <ListChecks className="w-4 h-4 text-[#b81d24] shrink-0" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Rekap Jumlah Bal per Kode</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-gray-700 border border-gray-300 rounded-xs whitespace-nowrap">
              {totalPeriode.total} Bal
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {konteks} · Termasuk bal yang baru masuk sortir, belum ditimbang, dan belum dibayar.
          </p>
        </div>

        <div className="flex bg-gray-100 p-0.5 rounded-sm border border-gray-300 shrink-0" role="tablist" aria-label="Cara pengelompokan rekap">
          {([
            ['kode', 'Per Kode Bal'],
            ['petani', 'Per Petani × Kode'],
          ] as Array<[Mode, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xs transition cursor-pointer ${
                mode === id ? 'bg-[#b81d24] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-500">
          <p className="font-semibold text-gray-700">Tidak ada bal pada filter ini.</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Ubah tanggal, petani, atau kode bal lalu terapkan filter.</p>
        </div>
      ) : mode === 'kode' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2 px-2.5" rowSpan={adaFilterTanggal ? 2 : 1}>Kode Bal</th>
                <th className="py-2 px-2.5" colSpan={5}>{adaFilterTanggal ? 'Sesuai Filter' : 'Hasil'}</th>
                {adaFilterTanggal && <th className="py-2 px-2.5" colSpan={2}>Sepanjang Masa</th>}
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-1.5 px-2.5">Total Bal</th>
                <th className="py-1.5 px-2.5">Belum Ditimbang</th>
                <th className="py-1.5 px-2.5">Ditimbang, Belum Lunas</th>
                <th className="py-1.5 px-2.5">Lunas</th>
                <th className="py-1.5 px-2.5">Netto (kg)</th>
                {adaFilterTanggal && (
                  <>
                    <th className="py-1.5 px-2.5">Total Bal</th>
                    <th className="py-1.5 px-2.5">Netto (kg)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {baris.map(({ kode, periode, semua }) => (
                <tr key={kode} className="hover:bg-slate-50/70">
                  <td className="py-1.5 px-2.5 text-center font-mono font-bold text-gray-900">{kode}</td>
                  <td className={`${sel} font-bold text-gray-900`}>{formatNumber(periode.total)}</td>
                  <td className={`${sel} ${periode.belumTimbang > 0 ? 'text-amber-700 font-semibold' : 'text-gray-400'}`}>{formatNumber(periode.belumTimbang)}</td>
                  <td className={`${sel} ${periode.kredit > 0 ? 'text-[#b81d24] font-semibold' : 'text-gray-400'}`}>{formatNumber(periode.kredit)}</td>
                  <td className={`${sel} ${periode.lunas > 0 ? 'text-emerald-700 font-semibold' : 'text-gray-400'}`}>{formatNumber(periode.lunas)}</td>
                  <td className={sel}>{kg(periode.netto)}</td>
                  {adaFilterTanggal && (
                    <>
                      <td className={`${sel} font-bold text-gray-900 bg-slate-50/60`}>{formatNumber(semua.total)}</td>
                      <td className={`${sel} bg-slate-50/60`}>{kg(semua.netto)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900">
                <td className="py-2 px-2.5 text-center uppercase tracking-wide text-[11px]">Total</td>
                <td className={sel}>{formatNumber(totalPeriode.total)}</td>
                <td className={sel}>{formatNumber(totalPeriode.belumTimbang)}</td>
                <td className={sel}>{formatNumber(totalPeriode.kredit)}</td>
                <td className={sel}>{formatNumber(totalPeriode.lunas)}</td>
                <td className={sel}>{kg(totalPeriode.netto)}</td>
                {adaFilterTanggal && (
                  <>
                    <td className={`${sel} bg-slate-100`}>{formatNumber(totalSemua.total)}</td>
                    <td className={`${sel} bg-slate-100`}>{kg(totalSemua.netto)}</td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2 px-2.5 text-left">Petani</th>
                {perPetani.kodeList.map((k) => (
                  <th key={k} className="py-2 px-2.5 font-mono">{k}</th>
                ))}
                <th className="py-2 px-2.5">Total Bal</th>
                <th className="py-2 px-2.5">Belum Ditimbang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {perPetani.baris.map((p) => (
                <tr key={p.petaniId || p.nama} className="hover:bg-slate-50/70">
                  <td className="py-1.5 px-2.5 font-semibold text-gray-900 whitespace-nowrap">
                    {p.nama}
                    {p.petaniId && <span className="ml-1.5 font-mono text-[10px] font-normal text-gray-400">({p.petaniId})</span>}
                  </td>
                  {perPetani.kodeList.map((k) => (
                    <td key={k} className={`${sel} ${p.perKode[k] ? '' : 'text-gray-300'}`}>{p.perKode[k] ? formatNumber(p.perKode[k]) : '-'}</td>
                  ))}
                  <td className={`${sel} font-bold text-gray-900`}>{formatNumber(p.total)}</td>
                  <td className={`${sel} ${p.belumTimbang > 0 ? 'text-amber-700 font-semibold' : 'text-gray-400'}`}>{formatNumber(p.belumTimbang)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0">
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900">
                <td className="py-2 px-2.5 uppercase tracking-wide text-[11px]">Total ({perPetani.baris.length} petani)</td>
                {perPetani.kodeList.map((k) => (
                  <td key={k} className={sel}>{formatNumber(perKode.find((r) => r.kode === k)?.total || 0)}</td>
                ))}
                <td className={sel}>{formatNumber(totalPeriode.total)}</td>
                <td className={sel}>{formatNumber(totalPeriode.belumTimbang)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
};

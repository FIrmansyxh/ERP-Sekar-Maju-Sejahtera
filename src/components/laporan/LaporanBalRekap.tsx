import React, { useMemo, useState } from 'react';
import { ListChecks, Search, X } from 'lucide-react';
import {
  BalRekapInput,
  RekapKode,
  rataHargaRekap,
  rekapPerKode,
  rekapPerPetani,
  totalRekapKode,
} from '../../utils/rekapKodeBal';
import { formatNumber, formatRupiah } from '../../utils/formatters';
import { SortIcon } from '../common/SortIcon';

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

interface BarisKode {
  kode_bal: string;
  jumlah_bal: number;
  belum_timbang: number;
  kredit: number;
  berat_bruto: number;
  berat_netto: number;
  avg_harga: number;
  total_nilai: number;
  sepanjang_masa: number;
}

type KolomUrut = Exclude<keyof BarisKode, 'belum_timbang' | 'kredit'>;

const sel = 'py-1.5 px-2.5 text-right font-mono whitespace-nowrap';

const kosong = (kode: string): RekapKode => ({
  kode, total: 0, belumTimbang: 0, kredit: 0, lunas: 0, netto: 0, bruto: 0, nettoLunas: 0, brutoLunas: 0, nilaiLunas: 0, nilaiKredit: 0,
});

/**
 * Rekap per kode bal (HF, SB, dst.) atau per petani. Tabel per kode memakai tampilan Laporan Kode Bal yang lama:
 * baris besar, kolom bergaris, bisa diurutkan dan dicari. Jumlah bal mencakup semua bal (termasuk yang baru
 * disortir, belum ditimbang, dan belum dibayar); berat dan nilai hanya dari bal yang sudah ditimbang dan lunas.
 * Mengikuti semua filter Laporan Bal (rentang tanggal dan pilihan cepat).
 */
export const LaporanBalRekap: React.FC<LaporanBalRekapProps> = ({ rows, rowsSepanjangMasa, adaFilterTanggal, konteks }) => {
  const [mode, setMode] = useState<Mode>('kode');
  const [cari, setCari] = useState('');
  const [urutKolom, setUrutKolom] = useState<KolomUrut>('kode_bal');
  const [urutArah, setUrutArah] = useState<'asc' | 'desc'>('asc');

  const perKode = useMemo(() => rekapPerKode(rows), [rows]);
  const perKodeSemua = useMemo(() => rekapPerKode(rowsSepanjangMasa), [rowsSepanjangMasa]);
  const perPetani = useMemo(() => rekapPerPetani(rows), [rows]);

  // Gabungan kode pada periode filter dan sepanjang masa, agar kode yang pada periode itu nol tetap tampil
  const dataKode = useMemo<BarisKode[]>(() => {
    const dariFilter = new Map<string, RekapKode>(perKode.map((r) => [r.kode, r]));
    const semua = new Map<string, RekapKode>(perKodeSemua.map((r) => [r.kode, r]));
    const kodeList = adaFilterTanggal
      ? Array.from(new Set<string>([...dariFilter.keys(), ...semua.keys()]))
      : perKode.map((r) => r.kode);
    return kodeList.map((kode) => {
      const p = dariFilter.get(kode) ?? kosong(kode);
      return {
        kode_bal: kode,
        jumlah_bal: p.total,
        belum_timbang: p.belumTimbang,
        kredit: p.kredit,
        berat_bruto: p.brutoLunas,
        berat_netto: p.nettoLunas,
        avg_harga: rataHargaRekap(p),
        total_nilai: p.nilaiLunas,
        sepanjang_masa: semua.get(kode)?.total ?? p.total,
      };
    });
  }, [perKode, perKodeSemua, adaFilterTanggal]);

  const dataTampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const hasil = q ? dataKode.filter((r) => r.kode_bal.toLowerCase().includes(q)) : [...dataKode];
    hasil.sort((a, b) => {
      const x = a[urutKolom];
      const y = b[urutKolom];
      const banding =
        typeof x === 'string' && typeof y === 'string'
          ? x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' })
          : (x as number) - (y as number);
      return urutArah === 'asc' ? banding : -banding;
    });
    return hasil;
  }, [dataKode, cari, urutKolom, urutArah]);

  const total = useMemo(() => {
    const t = dataTampil.reduce(
      (acc, r) => ({
        jumlah_bal: acc.jumlah_bal + r.jumlah_bal,
        belum_timbang: acc.belum_timbang + r.belum_timbang,
        kredit: acc.kredit + r.kredit,
        berat_bruto: acc.berat_bruto + r.berat_bruto,
        berat_netto: acc.berat_netto + r.berat_netto,
        total_nilai: acc.total_nilai + r.total_nilai,
        sepanjang_masa: acc.sepanjang_masa + r.sepanjang_masa,
      }),
      { jumlah_bal: 0, belum_timbang: 0, kredit: 0, berat_bruto: 0, berat_netto: 0, total_nilai: 0, sepanjang_masa: 0 }
    );
    return { ...t, avg_harga: t.berat_netto > 0 ? t.total_nilai / t.berat_netto : 0 };
  }, [dataTampil]);

  const totalPeriode = useMemo(() => totalRekapKode(perKode), [perKode]);

  const urut = (kolom: KolomUrut) => {
    if (urutKolom === kolom) setUrutArah(urutArah === 'asc' ? 'desc' : 'asc');
    else {
      setUrutKolom(kolom);
      setUrutArah('asc');
    }
  };

  const kepala = (kolom: KolomUrut, label: string, opsi: { kanan?: boolean; lebar?: string; terakhir?: boolean } = {}) => (
    <th
      className={`sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 ${opsi.terakhir ? '' : 'border-r border-gray-200'} cursor-pointer hover:bg-gray-200/80 select-none transition-colors ${opsi.kanan ? 'text-right' : ''} ${opsi.lebar || ''}`}
      onClick={() => urut(kolom)}
      aria-sort={urutKolom === kolom ? (urutArah === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className={`flex items-center ${opsi.kanan ? 'justify-end' : 'justify-between'}`}>
        <span>{label}</span>
        <SortIcon aktif={urutKolom === kolom} arah={urutArah} />
      </div>
    </th>
  );

  const jumlahKolom = adaFilterTanggal ? 7 : 6;

  return (
    <section className="bg-white border border-gray-200 shadow-xs">
      <div className="px-4 py-3 bg-[#f8f9fa] border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <ListChecks className="w-4 h-4 text-[#b81d24] shrink-0" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Rekap per Kode Bal</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-gray-700 border border-gray-300 rounded-xs whitespace-nowrap">
              {totalPeriode.total} Bal
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {konteks} · Jumlah bal termasuk yang baru disortir; berat dan nilai hanya dari bal yang sudah ditimbang dan lunas, bal yang belum dibayar masih kredit.
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
        <>
          <div className="p-3 border-b border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-gray-500 font-medium">
              <span>
                Total: <strong className="text-gray-900">{dataTampil.length}</strong> Kode Bal
              </span>
              {cari.trim() && <span className="text-[11px] text-gray-500 font-medium">(Hasil pencarian)</span>}
            </div>
            <div className="w-full sm:w-72 md:w-80">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Cari Kode Bal..."
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
                />
                {cari && (
                  <button
                    type="button"
                    onClick={() => setCari('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-210px)]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f8f9fa] border-b border-gray-300 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <tr className="text-xs font-bold text-gray-700">
                  {kepala('kode_bal', 'Kode Bal', { lebar: 'w-32' })}
                  {kepala('jumlah_bal', 'Jumlah Bal', { kanan: true })}
                  {kepala('berat_bruto', 'Berat Bruto', { kanan: true, lebar: 'w-40' })}
                  {kepala('berat_netto', 'Berat Netto', { kanan: true, lebar: 'w-40' })}
                  {kepala('avg_harga', 'AVG Harga', { kanan: true })}
                  {kepala('total_nilai', 'Total Nilai', { kanan: true, terakhir: !adaFilterTanggal })}
                  {adaFilterTanggal && kepala('sepanjang_masa', 'Bal Sepanjang Masa', { kanan: true, terakhir: true })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {dataTampil.length === 0 ? (
                  <tr>
                    <td colSpan={jumlahKolom} className="py-8 text-center text-gray-500">
                      Tidak ada data yang sesuai.
                    </td>
                  </tr>
                ) : (
                  dataTampil.map((r, idx) => (
                    <tr key={r.kode_bal} className={`hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="py-2.5 px-4 border-r border-gray-200 font-bold text-gray-900 bg-slate-50/50">{r.kode_bal}</td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-medium">
                        {formatNumber(r.jumlah_bal)} <span className="text-gray-400 text-xs font-normal">Bal</span>
                        {(r.belum_timbang > 0 || r.kredit > 0) && (
                          <div className="text-[11px] font-normal text-gray-500 leading-tight">
                            {[
                              r.belum_timbang > 0 ? `${formatNumber(r.belum_timbang)} belum ditimbang` : '',
                              r.kredit > 0 ? `${formatNumber(r.kredit)} belum lunas` : '',
                            ].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-medium">
                        {formatNumber(r.berat_bruto)} <span className="text-gray-400 text-xs font-normal">Kg</span>
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-medium text-blue-700">
                        {formatNumber(r.berat_netto)} <span className="text-gray-400 text-xs font-normal">Kg</span>
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-mono text-gray-700">{formatRupiah(r.avg_harga)}</td>
                      <td className={`py-2.5 px-4 text-right font-bold text-emerald-700 font-mono ${adaFilterTanggal ? 'border-r border-gray-200' : ''}`}>
                        {formatRupiah(r.total_nilai)}
                      </td>
                      {adaFilterTanggal && (
                        <td className="py-2.5 px-4 text-right font-medium bg-slate-50/50">
                          {formatNumber(r.sepanjang_masa)} <span className="text-gray-400 text-xs font-normal">Bal</span>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {dataTampil.length > 0 && (
                <tfoot className="bg-slate-100 border-t-2 border-gray-300 font-bold text-gray-900">
                  <tr>
                    <td className="py-3 px-4 border-r border-gray-200">TOTAL</td>
                    <td className="py-3 px-4 border-r border-gray-200 text-right">{formatNumber(total.jumlah_bal)} Bal</td>
                    <td className="py-3 px-4 border-r border-gray-200 text-right">{formatNumber(total.berat_bruto)} Kg</td>
                    <td className="py-3 px-4 border-r border-gray-200 text-right text-blue-800">{formatNumber(total.berat_netto)} Kg</td>
                    <td className="py-3 px-4 border-r border-gray-200 text-right font-mono">{formatRupiah(total.avg_harga)}</td>
                    <td className={`py-3 px-4 text-right font-mono text-emerald-800 ${adaFilterTanggal ? 'border-r border-gray-200' : ''}`}>
                      {formatRupiah(total.total_nilai)}
                    </td>
                    {adaFilterTanggal && <td className="py-3 px-4 text-right">{formatNumber(total.sepanjang_masa)} Bal</td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
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

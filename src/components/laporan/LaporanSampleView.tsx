import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, FlaskConical, Layers, List, RotateCcw, Search } from 'lucide-react';
import type { Barang, BatchPengirimanSample, UserRole } from '../../types';
import {
  BarisLaporanSample,
  LABEL_STATUS_BAL_SAMPLE,
  LABEL_STATUS_BATCH_SAMPLE,
  rekapPerBatch,
  ringkasSample,
  StatusBalSample,
  susunBarisSample,
} from '../../utils/laporanSample';
import { formatNumber, formatRupiah } from '../../utils/formatters';
import { downloadExcelReport, periodeInfo, todayStamp } from '../../utils/excelExport';
import { useLaporanTampilan } from '../../hooks/useLaporanTampilan';
import { LaporanTampilanToggle } from './LaporanTampilanToggle';
import { PresetTanggal } from './PresetTanggal';
import { Pagination } from '../common/Pagination';

interface LaporanSampleViewProps {
  batchSampleList: BatchPengirimanSample[];
  barangList?: Barang[];
  userRole?: UserRole;
}

type Tab = 'bal' | 'batch';

const PER_HALAMAN = 20;
const TH = 'py-2.5 px-3 text-center border-r border-gray-200 whitespace-nowrap';
const TD = 'py-2 px-3 border-r border-gray-100 whitespace-nowrap';
const INPUT = 'w-full px-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800';

const rp = (n: number | null): string => (n === null ? '-' : formatRupiah(n));
/** Selisih bertanda: + naik / untung, - turun / rugi */
const rpSelisih = (n: number | null): string => (n === null ? '-' : `${n > 0 ? '+' : ''}${formatRupiah(n)}`);
const warnaSelisih = (n: number | null): string => (n === null || n === 0 ? 'text-gray-700' : n > 0 ? 'text-emerald-700' : 'text-[#b81d24]');
const persen = (n: number | null): string => (n === null ? '-' : `${formatNumber(n, 1)}%`);

const BADGE_STATUS: Record<StatusBalSample, string> = {
  disetujui: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  nego: 'bg-amber-50 text-amber-800 border-amber-200',
  ditolak: 'bg-red-50 text-red-800 border-red-200',
  menunggu: 'bg-slate-50 text-slate-700 border-slate-200',
};

export const LaporanSampleView: React.FC<LaporanSampleViewProps> = ({ batchSampleList, barangList = [] }) => {
  const [tab, setTab] = useState<Tab>('bal');
  const [tglDari, setTglDari] = useState('');
  const [tglSampai, setTglSampai] = useState('');
  const [pembeli, setPembeli] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | StatusBalSample>('ALL');
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const tampilan = useLaporanTampilan('sample');

  const semuaBaris = useMemo(() => susunBarisSample(batchSampleList, barangList), [batchSampleList, barangList]);
  const daftarPembeli = useMemo(() => Array.from(new Set(semuaBaris.map((r) => r.tujuan).filter(Boolean))).sort(), [semuaBaris]);

  const baris = useMemo(() => {
    const q = cari.trim().toUpperCase();
    return semuaBaris
      .filter((r) => {
        if (tglDari && r.tanggal_kirim && r.tanggal_kirim < tglDari) return false;
        if (tglSampai && r.tanggal_kirim && r.tanggal_kirim > tglSampai) return false;
        if (pembeli !== 'ALL' && r.tujuan !== pembeli) return false;
        if (status !== 'ALL' && r.status !== status) return false;
        if (q && ![r.no_bal, r.kode_batch, r.kode_grade, r.kode_harga_jual].some((v) => v.toUpperCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => b.tanggal_kirim.localeCompare(a.tanggal_kirim) || a.no_bal.localeCompare(b.no_bal, undefined, { numeric: true }));
  }, [semuaBaris, tglDari, tglSampai, pembeli, status, cari]);

  const ringkasan = useMemo(() => ringkasSample(baris), [baris]);
  const perBatch = useMemo(() => rekapPerBatch(baris), [baris]);

  const jumlahFilterAktif = [tglDari, tglSampai, pembeli !== 'ALL' ? pembeli : '', status !== 'ALL' ? status : '', cari.trim()].filter(Boolean).length;
  const daftarTab = tab === 'bal' ? baris : perBatch;
  const totalHalaman = Math.max(1, Math.ceil(daftarTab.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const barisHalaman = baris.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);
  const batchHalaman = perBatch.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  const ubahFilter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setHalaman(1);
  };

  const resetFilter = () => {
    setTglDari('');
    setTglSampai('');
    setPembeli('ALL');
    setStatus('ALL');
    setCari('');
    setHalaman(1);
  };

  const handleExcel = () => {
    const info = [
      periodeInfo(tglDari, tglSampai),
      [
        `Pembeli: ${pembeli !== 'ALL' ? pembeli : 'Semua'}`,
        `Status: ${status !== 'ALL' ? LABEL_STATUS_BAL_SAMPLE[status] : 'Semua'}`,
        cari.trim() ? `Pencarian: ${cari.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      'Harga deal & selisih hanya untuk bal Disetujui. Nilai dihitung dari netto gudang.',
    ];
    const kosong = (n: number | null) => (n === null ? '-' : n);
    void downloadExcelReport(`Laporan_Pengiriman_Sample_${todayStamp()}`, [
      {
        name: 'Per Bal',
        title: 'Laporan Pengiriman Sample per Bal',
        info,
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Tanggal Kirim', type: 'date' },
          { header: 'Kode Batch', align: 'center' },
          { header: 'Pembeli' },
          { header: 'No Bal', align: 'center' },
          { header: 'Grade', align: 'center' },
          { header: 'Kode Harga Jual', align: 'center' },
          { header: 'Status', align: 'center' },
          { header: 'Netto (Kg)', type: 'kg' },
          { header: 'Harga Beli (Rp/Kg)', type: 'rupiah' },
          { header: 'Harga Tawaran (Rp/Kg)', type: 'rupiah' },
          { header: 'Harga Deal (Rp/Kg)', type: 'rupiah' },
          { header: 'Selisih Deal - Tawaran (Rp/Kg)', type: 'rupiah' },
          { header: 'Selisih Jual - Beli (Rp/Kg)', type: 'rupiah' },
          { header: 'Nilai Beli (Rp)', type: 'rupiah' },
          { header: 'Nilai Tawaran (Rp)', type: 'rupiah' },
          { header: 'Nilai Deal (Rp)', type: 'rupiah' },
          { header: 'Selisih Deal - Tawaran (Rp)', type: 'rupiah' },
          { header: 'Selisih Jual - Beli (Rp)', type: 'rupiah' },
          { header: 'No Surat Jalan', align: 'center' },
        ],
        rows: baris.map((r, i) => [
          i + 1,
          r.tanggal_kirim,
          r.kode_batch,
          r.tujuan,
          r.no_bal,
          r.kode_grade || '-',
          r.kode_harga_jual || '-',
          LABEL_STATUS_BAL_SAMPLE[r.status],
          r.netto,
          kosong(r.hargaBeli),
          kosong(r.hargaTawaran),
          kosong(r.hargaDeal),
          kosong(r.selisihTawarDealKg),
          kosong(r.selisihJualBeliKg),
          kosong(r.nilaiBeli),
          kosong(r.nilaiTawaran),
          kosong(r.nilaiDeal),
          kosong(r.selisihTawarDealNilai),
          kosong(r.selisihJualBeliNilai),
          r.no_surat_jalan || '-',
        ]),
        totalRow: [
          `TOTAL (${ringkasan.jumlahBal} bal, ${ringkasan.disetujui} disetujui)`, '', '', '', '', '', '', '',
          baris.reduce((s, r) => s + r.netto, 0),
          '', '', '',
          ringkasan.rataSelisihTawarDealKg === null ? '-' : Math.round(ringkasan.rataSelisihTawarDealKg),
          ringkasan.rataSelisihJualBeliKg === null ? '-' : Math.round(ringkasan.rataSelisihJualBeliKg),
          ringkasan.nilaiBeli,
          ringkasan.nilaiTawaran,
          ringkasan.nilaiDeal,
          ringkasan.selisihTawarDeal,
          ringkasan.selisihJualBeli,
          '',
        ],
      },
      {
        name: 'Per Batch',
        title: 'Rekap Pengiriman Sample per Batch',
        info,
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Tanggal Kirim', type: 'date' },
          { header: 'Kode Batch', align: 'center' },
          { header: 'Pembeli' },
          { header: 'Status Batch', align: 'center' },
          { header: 'Total Bal', type: 'integer' },
          { header: 'Disetujui', type: 'integer' },
          { header: 'Nego', type: 'integer' },
          { header: 'Ditolak', type: 'integer' },
          { header: 'Menunggu', type: 'integer' },
          { header: 'Netto Disetujui (Kg)', type: 'kg' },
          { header: 'Nilai Tawaran (Rp)', type: 'rupiah' },
          { header: 'Nilai Deal (Rp)', type: 'rupiah' },
          { header: 'Selisih Deal - Tawaran (Rp)', type: 'rupiah' },
          { header: 'Nilai Beli (Rp)', type: 'rupiah' },
          { header: 'Selisih Jual - Beli (Rp)', type: 'rupiah' },
        ],
        rows: perBatch.map((b, i) => [
          i + 1,
          b.tanggal_kirim,
          b.kode_batch,
          b.tujuan,
          LABEL_STATUS_BATCH_SAMPLE[b.status_batch] || b.status_batch,
          b.jumlahBal,
          b.disetujui,
          b.nego,
          b.ditolak,
          b.menunggu,
          b.nettoDisetujui,
          b.nilaiTawaran,
          b.nilaiDeal,
          b.selisihTawarDeal,
          b.nilaiBeli,
          b.selisihJualBeli,
        ]),
        totalRow: [
          `TOTAL (${ringkasan.jumlahBatch} batch)`, '', '', '', '',
          ringkasan.jumlahBal,
          ringkasan.disetujui,
          ringkasan.nego,
          ringkasan.ditolak,
          ringkasan.menunggu,
          ringkasan.nettoDisetujui,
          ringkasan.nilaiTawaran,
          ringkasan.nilaiDeal,
          ringkasan.selisihTawarDeal,
          ringkasan.nilaiBeli,
          ringkasan.selisihJualBeli,
        ],
      },
    ]);
  };

  const kartu = (judul: string, nilai: string, ket?: string, warna = 'text-gray-900') => (
    <div className="bg-white p-3 border border-gray-200 shadow-2xs">
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{judul}</div>
      <div className={`mt-1 text-lg font-bold font-mono ${warna}`}>{nilai}</div>
      {ket && <div className="text-[10px] text-gray-500 font-medium mt-0.5">{ket}</div>}
    </div>
  );

  const tombolTab = (kunci: Tab, label: string, Ikon: typeof List) => (
    <button
      type="button"
      onClick={() => {
        setTab(kunci);
        setHalaman(1);
      }}
      className={`px-4 py-2 text-xs font-bold cursor-pointer transition border-b-2 flex items-center space-x-1.5 ${
        tab === kunci ? 'border-[#b81d24] text-[#b81d24] bg-white' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <Ikon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );

  const selSelisih = (n: number | null) => <td className={`${TD} text-right font-mono font-semibold ${warnaSelisih(n)}`}>{rpSelisih(n)}</td>;

  return (
    <div className="space-y-3 font-sans text-gray-800">
      <div className="bg-white p-4 border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#b81d24] text-white rounded-sm flex items-center justify-center shadow-xs shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Laporan Pengiriman Sample</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LaporanTampilanToggle tampilan={tampilan} jumlahFilterAktif={jumlahFilterAktif} />
          <button
            type="button"
            onClick={handleExcel}
            disabled={baris.length === 0}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-bold rounded-xs transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Unduh Excel</span>
          </button>
        </div>
      </div>

      {tampilan.tampilRingkasan && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {kartu('Bal Sample', formatNumber(ringkasan.jumlahBal), `${formatNumber(ringkasan.jumlahBatch)} batch • ${formatNumber(ringkasan.sudahDO)} sudah masuk DO`)}
          {kartu(
            'Disetujui',
            formatNumber(ringkasan.disetujui),
            `Nego ${formatNumber(ringkasan.nego)} • Ditolak ${formatNumber(ringkasan.ditolak)} • Menunggu ${formatNumber(ringkasan.menunggu)}`,
            'text-emerald-700'
          )}
          {kartu('Tingkat Setuju', persen(ringkasan.persenSetuju), `Netto disetujui ${formatNumber(ringkasan.nettoDisetujui, 1)} kg`)}
          {kartu('Nilai Deal', formatRupiah(ringkasan.nilaiDeal), `Tawaran ${formatRupiah(ringkasan.nilaiTawaran)}`)}
          {kartu(
            'Selisih Deal - Tawaran',
            rpSelisih(ringkasan.selisihTawarDeal),
            ringkasan.rataSelisihTawarDealKg === null ? undefined : `Rata-rata ${rpSelisih(Math.round(ringkasan.rataSelisihTawarDealKg))}/kg`,
            warnaSelisih(ringkasan.selisihTawarDeal)
          )}
          {kartu(
            'Selisih Jual - Beli',
            rpSelisih(ringkasan.selisihJualBeli),
            [
              ringkasan.rataSelisihJualBeliKg === null ? '' : `Rata-rata ${rpSelisih(Math.round(ringkasan.rataSelisihJualBeliKg))}/kg`,
              ringkasan.tanpaHargaBeli > 0 ? `${formatNumber(ringkasan.tanpaHargaBeli)} bal tanpa harga beli` : '',
            ]
              .filter(Boolean)
              .join(' • ') || undefined,
            warnaSelisih(ringkasan.selisihJualBeli)
          )}
        </div>
      )}

      {tampilan.tampilFilter && (
        <div className="bg-white p-3.5 border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <PresetTanggal
              startDate={tglDari}
              endDate={tglSampai}
              onPilih={(a, b) => {
                setTglDari(a);
                setTglSampai(b);
                setHalaman(1);
              }}
            />
            <button
              type="button"
              onClick={resetFilter}
              className="px-3 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xs transition flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tanggal Kirim Dari</label>
              <input type="date" value={tglDari} onChange={(e) => ubahFilter(setTglDari)(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tanggal Kirim Sampai</label>
              <input type="date" value={tglSampai} onChange={(e) => ubahFilter(setTglSampai)(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Pembeli</label>
              <select value={pembeli} onChange={(e) => ubahFilter(setPembeli)(e.target.value)} className={INPUT}>
                <option value="ALL">Semua Pembeli</option>
                {daftarPembeli.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Status Bal</label>
              <select value={status} onChange={(e) => ubahFilter(setStatus)(e.target.value as 'ALL' | StatusBalSample)} className={INPUT}>
                <option value="ALL">Semua Status</option>
                {(Object.keys(LABEL_STATUS_BAL_SAMPLE) as StatusBalSample[]).map((s) => (
                  <option key={s} value={s}>
                    {LABEL_STATUS_BAL_SAMPLE[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Cari</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input value={cari} onChange={(e) => ubahFilter(setCari)(e.target.value)} placeholder="No Bal / batch / grade" className={`${INPUT} pl-7`} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-1 border-b border-gray-200">
        {tombolTab('bal', `Per Bal (${baris.length})`, List)}
        {tombolTab('batch', `Per Batch (${perBatch.length})`, Layers)}
      </div>

      <div className="bg-white border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'bal' ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f1f3f5] border-b-2 border-gray-300 text-gray-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className={TH}>No</th>
                  <th className={TH}>Tanggal</th>
                  <th className={TH}>Batch</th>
                  <th className={TH}>Pembeli</th>
                  <th className={TH}>No Bal</th>
                  <th className={TH}>Grade</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Netto (kg)</th>
                  <th className={TH}>Harga Beli</th>
                  <th className={TH}>Harga Tawaran</th>
                  <th className={TH}>Harga Deal</th>
                  <th className={TH}>Deal - Tawaran /kg</th>
                  <th className={TH}>Jual - Beli /kg</th>
                  <th className={TH}>Nilai Deal</th>
                  <th className={TH}>Deal - Tawaran</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Jual - Beli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {barisHalaman.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="py-10 text-center text-gray-500">
                      Tidak ada data sample
                    </td>
                  </tr>
                ) : (
                  barisHalaman.map((r: BarisLaporanSample, i) => (
                    <tr key={r.kunci} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className={`${TD} text-center font-mono text-gray-500`}>{(halamanAman - 1) * PER_HALAMAN + i + 1}</td>
                      <td className={`${TD} font-mono text-[11px]`}>{r.tanggal_kirim || '-'}</td>
                      <td className={`${TD} text-center font-mono`}>{r.kode_batch}</td>
                      <td className={TD}>{r.tujuan || '-'}</td>
                      <td className={`${TD} text-center font-mono font-black text-gray-950`}>{r.no_bal || '-'}</td>
                      <td className={`${TD} text-center`}>{r.kode_grade || '-'}</td>
                      <td className={`${TD} text-center`}>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-xs border ${BADGE_STATUS[r.status]}`}>{LABEL_STATUS_BAL_SAMPLE[r.status]}</span>
                      </td>
                      <td className={`${TD} text-right font-mono`}>{formatNumber(r.netto, 1)}</td>
                      <td className={`${TD} text-right font-mono`}>{rp(r.hargaBeli)}</td>
                      <td className={`${TD} text-right font-mono`}>{rp(r.hargaTawaran)}</td>
                      <td className={`${TD} text-right font-mono font-bold`}>{rp(r.hargaDeal)}</td>
                      {selSelisih(r.selisihTawarDealKg)}
                      {selSelisih(r.selisihJualBeliKg)}
                      <td className={`${TD} text-right font-mono`}>{rp(r.nilaiDeal)}</td>
                      {selSelisih(r.selisihTawarDealNilai)}
                      <td className={`py-2 px-3 whitespace-nowrap text-right font-mono font-semibold ${warnaSelisih(r.selisihJualBeliNilai)}`}>{rpSelisih(r.selisihJualBeliNilai)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {baris.length > 0 && (
                <tfoot className="bg-slate-200/95 text-gray-950 font-extrabold text-xs border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={7} className="py-2.5 px-3 text-right uppercase tracking-wider border-r border-gray-300">
                      Total ({formatNumber(ringkasan.disetujui)} bal disetujui)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-gray-300">{formatNumber(ringkasan.nettoDisetujui, 1)}</td>
                    <td colSpan={3} className="border-r border-gray-300" />
                    <td className={`py-2.5 px-3 text-right font-mono border-r border-gray-300 ${warnaSelisih(ringkasan.rataSelisihTawarDealKg)}`}>
                      {ringkasan.rataSelisihTawarDealKg === null ? '-' : rpSelisih(Math.round(ringkasan.rataSelisihTawarDealKg))}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono border-r border-gray-300 ${warnaSelisih(ringkasan.rataSelisihJualBeliKg)}`}>
                      {ringkasan.rataSelisihJualBeliKg === null ? '-' : rpSelisih(Math.round(ringkasan.rataSelisihJualBeliKg))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-gray-300">{formatRupiah(ringkasan.nilaiDeal)}</td>
                    <td className={`py-2.5 px-3 text-right font-mono border-r border-gray-300 ${warnaSelisih(ringkasan.selisihTawarDeal)}`}>{rpSelisih(ringkasan.selisihTawarDeal)}</td>
                    <td className={`py-2.5 px-3 text-right font-mono ${warnaSelisih(ringkasan.selisihJualBeli)}`}>{rpSelisih(ringkasan.selisihJualBeli)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f1f3f5] border-b-2 border-gray-300 text-gray-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className={TH}>No</th>
                  <th className={TH}>Tanggal</th>
                  <th className={TH}>Batch</th>
                  <th className={TH}>Pembeli</th>
                  <th className={TH}>Status Batch</th>
                  <th className={TH}>Bal</th>
                  <th className={TH}>Disetujui</th>
                  <th className={TH}>Nego</th>
                  <th className={TH}>Ditolak</th>
                  <th className={TH}>Menunggu</th>
                  <th className={TH}>Nilai Tawaran</th>
                  <th className={TH}>Nilai Deal</th>
                  <th className={TH}>Deal - Tawaran</th>
                  <th className={TH}>Nilai Beli</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Jual - Beli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {batchHalaman.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-10 text-center text-gray-500">
                      Tidak ada data sample
                    </td>
                  </tr>
                ) : (
                  batchHalaman.map((b, i) => (
                    <tr key={b.batch_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className={`${TD} text-center font-mono text-gray-500`}>{(halamanAman - 1) * PER_HALAMAN + i + 1}</td>
                      <td className={`${TD} font-mono text-[11px]`}>{b.tanggal_kirim || '-'}</td>
                      <td className={`${TD} text-center font-mono font-bold`}>{b.kode_batch}</td>
                      <td className={TD}>{b.tujuan || '-'}</td>
                      <td className={`${TD} text-center`}>{LABEL_STATUS_BATCH_SAMPLE[b.status_batch] || b.status_batch}</td>
                      <td className={`${TD} text-center font-mono`}>{formatNumber(b.jumlahBal)}</td>
                      <td className={`${TD} text-center font-mono text-emerald-700 font-bold`}>{formatNumber(b.disetujui)}</td>
                      <td className={`${TD} text-center font-mono`}>{formatNumber(b.nego)}</td>
                      <td className={`${TD} text-center font-mono`}>{formatNumber(b.ditolak)}</td>
                      <td className={`${TD} text-center font-mono`}>{formatNumber(b.menunggu)}</td>
                      <td className={`${TD} text-right font-mono`}>{formatRupiah(b.nilaiTawaran)}</td>
                      <td className={`${TD} text-right font-mono font-bold`}>{formatRupiah(b.nilaiDeal)}</td>
                      {selSelisih(b.selisihTawarDeal)}
                      <td className={`${TD} text-right font-mono`}>{formatRupiah(b.nilaiBeli)}</td>
                      <td className={`py-2 px-3 whitespace-nowrap text-right font-mono font-semibold ${warnaSelisih(b.selisihJualBeli)}`}>{rpSelisih(b.selisihJualBeli)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {totalHalaman > 1 && (
          <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex justify-end">
            <Pagination
              currentPage={halamanAman}
              totalPages={totalHalaman}
              totalItems={daftarTab.length}
              itemsPerPage={PER_HALAMAN}
              onPageChange={setHalaman}
            />
          </div>
        )}
      </div>
    </div>
  );
};

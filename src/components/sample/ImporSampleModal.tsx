import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, FileUp, Download, AlertTriangle } from 'lucide-react';
import type { Barang } from '../../types';
import {
  BarisImpor,
  KonteksImpor,
  PetaKolom,
  TabImpor,
  bacaBerkasImpor,
  kenaliKolom,
  periksaBarisImpor,
  unduhTemplateImporSample,
} from '../../utils/imporSample';
import { beratBrutoBal } from '../../utils/beratKirim';
import { formatNumber, formatRupiah } from '../../utils/formatters';
import { downloadExcelReport, todayStamp } from '../../utils/excelExport';

interface ImporSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  konteks: KonteksImpor;
  hargaBeli: (bal: Barang) => number;
  /** Baris siap dan berperingatan (sudah lolos pemeriksaan) dimasukkan ke tabel batch */
  onMasukkan: (baris: BarisImpor[], info: { namaFile: string; namaTab: string; ditolak: number }) => void;
}

const hurufKolom = (i: number): string =>
  i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));

const PILIH =
  'w-full px-2 py-1.5 text-xs border border-gray-300 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#b81d24] focus:border-[#b81d24]';
const TOMBOL =
  'px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer';

export const ImporSampleModal: React.FC<ImporSampleModalProps> = ({ isOpen, onClose, konteks, hargaBeli, onMasukkan }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [namaFile, setNamaFile] = useState('');
  const [tabs, setTabs] = useState<TabImpor[]>([]);
  const [idxTab, setIdxTab] = useState(0);
  const [peta, setPeta] = useState<PetaKolom | null>(null);
  const [membaca, setMembaca] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [hanyaBermasalah, setHanyaBermasalah] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    setNamaFile('');
    setTabs([]);
    setIdxTab(0);
    setPeta(null);
    setGalat(null);
    setHanyaBermasalah(false);
  }, [isOpen]);

  const tab = tabs[idxTab];

  const pilihTab = (i: number, daftar = tabs) => {
    setIdxTab(i);
    // Kolom dikenali dari judul; bila tidak dikenali, user memilih sendiri (baris 1 dianggap judul)
    setPeta(kenaliKolom(daftar[i]?.baris || []) ?? { barisJudul: 0, noBal: -1, kode: null, harga: null, gulungan: null, noJadi: null });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMembaca(true);
    setGalat(null);
    try {
      const hasil = await bacaBerkasImpor(file);
      const berisi = hasil.filter((t) => t.baris.some((b) => b.some((s) => s !== '')));
      if (berisi.length === 0) throw new Error('File tidak berisi data.');
      setNamaFile(file.name);
      setTabs(berisi);
      pilihTab(0, berisi);
    } catch (err: any) {
      setGalat(err?.message || 'File tidak dapat dibaca.');
    } finally {
      setMembaca(false);
    }
  };

  // No Bal wajib; harga dari kolom Kode Harga Jual dan/atau Harga Jual
  const kolomLengkap = Boolean(peta && peta.noBal >= 0 && (peta.kode !== null || peta.harga !== null));
  const hasil = useMemo<BarisImpor[]>(
    // konteks berubah tiap render (daftar bal di tabel batch ikut diperiksa); pemeriksaan murah untuk ratusan baris
    () => (tab && peta && kolomLengkap ? periksaBarisImpor(tab, peta, konteks) : []),
    [tab, peta, kolomLengkap, konteks]
  );
  const jumlah = {
    siap: hasil.filter((b) => b.status === 'siap').length,
    peringatan: hasil.filter((b) => b.status === 'peringatan').length,
    tolak: hasil.filter((b) => b.status === 'tolak').length,
  };
  const masuk = hasil.filter((b) => b.status !== 'tolak');
  const tampil = hanyaBermasalah ? hasil.filter((b) => b.status !== 'siap') : hasil;

  if (!isOpen) return null;

  const judulKolom = tab && peta ? tab.baris[peta.barisJudul] || [] : [];
  const jumlahKolom = Math.max(0, ...(tab?.baris.slice(0, 10).map((b) => b.length) || [0]));
  const opsiKolom = Array.from({ length: jumlahKolom }, (_, i) => ({
    i,
    label: `${hurufKolom(i)}${judulKolom[i] ? ` · ${judulKolom[i]}` : ''}`,
  }));
  const ubahPeta = (kunci: keyof PetaKolom, nilai: string) => {
    if (!peta) return;
    const angka = Number(nilai);
    setPeta({ ...peta, [kunci]: kunci !== 'noBal' && kunci !== 'barisJudul' && nilai === '' ? null : angka });
  };

  const unduhBermasalah = () =>
    void downloadExcelReport(`Impor_Sample_Bermasalah_${todayStamp()}`, [
      {
        name: 'Tidak Dimasukkan',
        title: 'Baris Impor Batch Sample yang Tidak Dimasukkan',
        info: [`File: ${namaFile}`, `Tab: ${tab?.nama || '-'}`],
        columns: [
          { header: 'Baris', type: 'integer', align: 'center' },
          { header: 'Gulungan', align: 'center' },
          { header: 'No Bal', type: 'text' },
          { header: 'Kode di File', type: 'text' },
          { header: 'Harga di File', type: 'text' },
          { header: 'Keterangan' },
        ],
        rows: hasil
          .filter((b) => b.status === 'tolak')
          .map((b) => [b.barisExcel, b.gulungan || '-', b.noBalFile || '-', b.kodeFile || '-', b.hargaFile || '-', b.pesan.join('; ')]),
      },
    ]);

  const handleMasukkan = () => {
    onMasukkan(masuk, { namaFile, namaTab: tab?.nama || '', ditolak: jumlah.tolak });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-label="Impor Batch Sample"
        className="bg-white rounded-md shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <FileUp className="w-4 h-4 text-[#b81d24]" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
              Impor Batch Sample{namaFile ? ` · ${namaFile}` : ''}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-sm transition cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-gray-800 overflow-y-auto">
          <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFile} aria-label="Pilih file" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={membaca} className={TOMBOL}>
              <FileUp className="w-3.5 h-3.5 text-[#b81d24]" />
              <span>{membaca ? 'Membaca...' : namaFile ? 'Ganti File' : 'Pilih File (.xlsx / .csv)'}</span>
            </button>
            <button type="button" onClick={() => void unduhTemplateImporSample()} className={TOMBOL}>
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Unduh Template</span>
            </button>
          </div>

          {galat && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{galat}</span>
            </div>
          )}

          {tab && peta && (
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-sm">
              {tabs.length > 1 && (
                <label className="space-y-1 col-span-2 md:col-span-1">
                  <span className="block font-semibold text-gray-700">Tab</span>
                  <select value={idxTab} onChange={(e) => pilihTab(Number(e.target.value))} className={PILIH}>
                    {tabs.map((t, i) => (
                      <option key={t.nama + i} value={i}>
                        {t.nama}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="space-y-1">
                <span className="block font-semibold text-gray-700">Baris Judul</span>
                <select value={peta.barisJudul} onChange={(e) => ubahPeta('barisJudul', e.target.value)} className={PILIH}>
                  {Array.from({ length: Math.min(10, tab.baris.length) }, (_, i) => (
                    <option key={i} value={i}>
                      Baris {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              {(
                [
                  ['noBal', 'No Bal', true],
                  ['kode', 'Kode Harga Jual', false],
                  ['harga', 'Harga Jual (Rp/Kg)', false],
                  ['gulungan', 'Gulungan', false],
                  ['noJadi', 'No Jadi', false],
                ] as const
              ).map(([kunci, label, wajib]) => (
                <label key={kunci} className="space-y-1">
                  <span className="block font-semibold text-gray-700">
                    {label}
                    {wajib && <span className="text-red-500"> *</span>}
                  </span>
                  <select
                    value={peta[kunci] === null || peta[kunci] === -1 ? '' : String(peta[kunci])}
                    onChange={(e) => ubahPeta(kunci, e.target.value === '' && wajib ? '-1' : e.target.value)}
                    className={PILIH}
                  >
                    <option value="">{wajib ? 'Pilih kolom' : 'Tidak ada'}</option>
                    {opsiKolom.map((o) => (
                      <option key={o.i} value={o.i}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}

          {tab && !kolomLengkap && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Pilih kolom No Bal, dan kolom Kode Harga Jual dan/atau Harga Jual.</span>
            </div>
          )}

          {kolomLengkap && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 font-semibold">
                  <span className="px-2 py-1 rounded-xs border border-emerald-200 bg-emerald-50 text-emerald-800">Siap {jumlah.siap}</span>
                  <span className="px-2 py-1 rounded-xs border border-amber-200 bg-amber-50 text-amber-800">Peringatan {jumlah.peringatan}</span>
                  <span className="px-2 py-1 rounded-xs border border-red-200 bg-red-50 text-red-800">Tidak Dimasukkan {jumlah.tolak}</span>
                  <span className="text-gray-500 font-normal">dari {hasil.length} baris</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHanyaBermasalah((v) => !v)}
                    className={TOMBOL}
                  >
                    <span>{hanyaBermasalah ? 'Tampilkan Semua' : 'Hanya Bermasalah'}</span>
                  </button>
                  {jumlah.tolak > 0 && (
                    <button type="button" onClick={unduhBermasalah} className={TOMBOL}>
                      <Download className="w-3.5 h-3.5 text-[#b81d24]" />
                      <span>Unduh Daftar Bermasalah</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-sm">
                <table className="w-full min-w-[1080px] text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      {['Baris', 'Gulungan', 'No Bal', 'Kode di File', 'Harga di File', 'Kode Harga Jual', 'Harga Jual/Kg', 'Berat Bruto', 'Harga Beli/Kg', 'Keterangan'].map((h) => (
                        <th key={h} className="px-2.5 py-2 border border-gray-200 text-center font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tampil.map((b) => (
                      <tr
                        key={b.barisExcel}
                        className={b.status === 'tolak' ? 'bg-red-50/60' : b.status === 'peringatan' ? 'bg-amber-50/60' : ''}
                      >
                        <td className="px-2.5 py-1.5 border border-gray-200 text-center font-mono text-gray-500">{b.barisExcel}</td>
                        <td className="px-2.5 py-1.5 border border-gray-200 text-center">{b.gulungan || '-'}</td>
                        <td className="px-2.5 py-1.5 border border-gray-200 font-mono font-semibold">
                          {b.bal?.no_bal && b.bal.no_bal !== b.noBalFile ? `${b.noBalFile} → ${b.bal.no_bal}` : b.noBalFile || '-'}
                        </td>
                        <td className="px-2.5 py-1.5 border border-gray-200 font-mono text-gray-500">{b.kodeFile || '-'}</td>
                        <td className="px-2.5 py-1.5 border border-gray-200 font-mono text-gray-500">{b.hargaFile || '-'}</td>
                        <td className="px-2.5 py-1.5 border border-gray-200 text-center font-mono font-semibold">{b.hargaJual?.kode || '-'}</td>
                        <td className="px-2.5 py-1.5 border border-gray-200 text-right font-mono">
                          {b.hargaJual ? formatRupiah(Number(b.hargaJual.harga_jual)) : '-'}
                        </td>
                        <td className="px-2.5 py-1.5 border border-gray-200 text-right font-mono">
                          {b.bal ? `${formatNumber(beratBrutoBal(b.bal), 1)} kg` : '-'}
                        </td>
                        <td className="px-2.5 py-1.5 border border-gray-200 text-right font-mono">
                          {b.bal ? formatRupiah(hargaBeli(b.bal)) : '-'}
                        </td>
                        <td
                          className={`px-2.5 py-1.5 border border-gray-200 ${
                            b.status === 'tolak' ? 'text-red-700 font-semibold' : b.status === 'peringatan' ? 'text-amber-800' : 'text-emerald-700'
                          }`}
                        >
                          {b.pesan.length > 0 ? b.pesan.join('; ') : 'Siap'}
                        </td>
                      </tr>
                    ))}
                    {tampil.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-2.5 py-6 border border-gray-200 text-center text-gray-500">
                          {hasil.length === 0 ? 'Tidak ada baris data di bawah baris judul.' : 'Tidak ada baris bermasalah.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-sm cursor-pointer transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleMasukkan}
            disabled={masuk.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#b81d24] hover:bg-[#9a181e] rounded-sm cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Masukkan {masuk.length} Bal ke Batch
          </button>
        </div>
      </div>
    </div>
  );
};

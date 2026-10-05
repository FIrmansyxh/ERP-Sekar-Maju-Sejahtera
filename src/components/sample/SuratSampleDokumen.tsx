import React from 'react';
import { BatchPengirimanSample } from '../../types';
import { formatNumber, formatRupiah } from '../../utils/formatters';
import { COMPANY_NAME } from '../../config/appInfo';
import { DokumenBerlembar } from '../common/DokumenBerlembar';
import { UKURAN_SURAT_SAMPLE, UkuranDokumen } from '../../utils/paginasiDokumen';
import { beratBrutoItemSample } from '../../utils/beratKirim';
import {
  kodeHargaJualSample,
  KunciKolomSample,
  kolomSuratSample,
  nilaiHargaJualSample,
  noJadiSample,
  OPSI_CETAK_SAMPLE_BAWAAN,
  OpsiCetakSample,
} from '../../utils/suratSample';

export interface SuratSampleDokumenProps {
  batch: BatchPengirimanSample;
  /** Kolom nomor (asal & jadi / jadi saja) dan harga jual (kode / nilai / keduanya); bruto selalu tampil */
  opsi?: OpsiCetakSample;
}

/**
 * Isi Surat Pengantar Sample & Penawaran Batch untuk pratinjau dan cetak. Aturan halaman sama
 * dengan Nota Pembelian dan Surat Jalan: satu lembar per halaman, baris tidak terpotong, judul kolom
 * berulang. Data pemasok (petani) sengaja tidak ditampilkan.
 */
export const SuratSampleDokumen: React.FC<SuratSampleDokumenProps> = ({ batch, opsi = OPSI_CETAK_SAMPLE_BAWAAN }) => {
  const items = batch.items || [];
  const totalBal = items.length;
  // Dokumen untuk buyer memakai berat bruto; netto hanya untuk pembelian internal
  const totalBruto = items.reduce((sum, it) => sum + beratBrutoItemSample(it), 0);

  const U: UkuranDokumen = { ...UKURAN_SURAT_SAMPLE, totalBaris: 44 };

  const printDateStr = (() => {
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  })();

  const daftarKolom = kolomSuratSample(opsi);
  // Lebar kolom dalam persen; jumlahnya selalu 100
  const totalBobot = daftarKolom.reduce((s, k) => s + k.bobot, 0);
  const kolom = (
    <colgroup>
      {daftarKolom.map((k) => (
        <col key={k.kunci} style={{ width: `${(k.bobot / totalBobot) * 100}%` }} />
      ))}
    </colgroup>
  );

  const RATA: Record<KunciKolomSample, string> = {
    no: 'text-center',
    asal: 'text-left',
    jadi: 'text-left',
    bruto: 'text-right',
    kode: 'text-center',
    nilai: 'text-right',
  };
  const garis = (i: number, warna: string) => (i < daftarKolom.length - 1 ? `border-r ${warna}` : '');

  const kepalaTabel = (
    <tr
      className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-[11px] uppercase tracking-wide whitespace-nowrap"
      style={{ height: U.thead - 2 }}
    >
      {daftarKolom.map((k, i) => (
        <th key={k.kunci} className={`px-3 ${RATA[k.kunci]} ${garis(i, 'border-slate-300')}`}>
          {k.judul}
        </th>
      ))}
    </tr>
  );

  const isiSel = (kunci: KunciKolomSample, it: (typeof items)[number], idx: number): React.ReactNode => {
    switch (kunci) {
      case 'no':
        return idx + 1;
      case 'asal':
        return it.no_bal || '-';
      case 'jadi':
        return noJadiSample(it);
      case 'bruto':
        return `${formatNumber(beratBrutoItemSample(it), 1)} kg`;
      case 'kode':
        return kodeHargaJualSample(it);
      case 'nilai': {
        const nilai = nilaiHargaJualSample(it);
        return nilai > 0 ? formatRupiah(nilai) : '-';
      }
    }
  };
  const GAYA_SEL: Record<KunciKolomSample, string> = {
    no: 'font-mono font-medium text-slate-500 text-xs',
    asal: 'font-mono font-bold text-slate-950 text-xs sm:text-sm truncate',
    jadi: 'font-mono font-bold text-slate-950 text-xs sm:text-sm truncate',
    bruto: 'font-mono font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap',
    kode: 'font-mono font-bold text-slate-950 text-xs sm:text-sm whitespace-nowrap',
    nilai: 'font-mono font-bold text-slate-950 text-xs sm:text-sm whitespace-nowrap',
  };

  const baris = items.map((it, idx) => (
    <tr key={it.sample_item_id || `${it.barang_id}-${idx}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} style={{ height: U.baris }}>
      {daftarKolom.map((k, i) => (
        <td key={k.kunci} className={`px-3 ${RATA[k.kunci]} ${GAYA_SEL[k.kunci]} ${garis(i, 'border-slate-200')}`}>
          {isiSel(k.kunci, it, idx)}
        </td>
      ))}
    </tr>
  ));

  // Kolom sebelum "Bruto" menjadi label total; kolom sesudahnya kosong
  const posisiBruto = daftarKolom.findIndex((k) => k.kunci === 'bruto');
  const kolomSesudah = daftarKolom.length - posisiBruto - 1;
  const barisTotal = (
    <>
      <tr
        className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs sm:text-sm"
        style={{ height: 42 }}
      >
        <td colSpan={posisiBruto} className="px-3 text-right uppercase tracking-wider text-xs text-slate-700 font-bold border-r border-slate-300">
          TOTAL ({totalBal} BAL SAMPLE):
        </td>
        <td className={`px-3 text-right font-mono font-medium text-slate-700 whitespace-nowrap ${kolomSesudah > 0 ? 'border-r border-slate-300' : ''}`}>
          {formatNumber(totalBruto, 1)} kg
        </td>
        {kolomSesudah > 0 && <td colSpan={kolomSesudah} className="px-3" />}
      </tr>
    </>
  );

  const meta = (
    <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50/70 border border-slate-300 rounded-sm text-xs">
      <div className="space-y-1.5 pr-2">
        <div className="flex justify-between items-center gap-3">
          <span className="text-slate-500 font-medium">NO. SURAT SAMPLE:</span>
          <span className="font-mono font-bold text-slate-950 text-xs sm:text-sm">{batch.kode_batch}</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="text-slate-500 font-medium">TANGGAL KIRIM:</span>
          <span className="font-mono text-slate-800">{batch.tanggal_kirim || '-'}</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="text-slate-500 font-medium">PENGIRIM:</span>
          <span className="font-semibold text-slate-900 truncate max-w-[220px]">{batch.dikirim_oleh || '-'}</span>
        </div>
      </div>
      <div className="space-y-1.5 border-l border-slate-300 pl-4">
        <div className="flex justify-between items-start gap-3">
          <span className="text-slate-500 font-medium shrink-0">TUJUAN / BUYER:</span>
          <span className="font-bold text-slate-900 text-right line-clamp-2">{batch.tujuan_buyer || '-'}</span>
        </div>
        {batch.permintaan_buyer && (
          <div className="flex justify-between items-start gap-3">
            <span className="text-slate-500 font-medium shrink-0">SPESIFIKASI:</span>
            <span className="text-slate-800 text-right line-clamp-2">{batch.permintaan_buyer}</span>
          </div>
        )}
      </div>
    </div>
  );

  const ekor = (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <p className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Dibuat & Dikirim Oleh</p>
          <div className="h-20 flex items-end justify-center">
            <span className="font-bold border-b border-slate-800 pb-0.5 min-w-[130px] inline-block text-slate-900">
              {batch.dikirim_oleh || <>&nbsp;</>}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">QC & Logistik {COMPANY_NAME}</p>
        </div>
        <div>
          <p className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Mengetahui</p>
          <div className="h-20 flex items-end justify-center">
            <span className="font-bold border-b border-slate-800 pb-0.5 min-w-[130px] inline-block text-slate-900">&nbsp;</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Kepala Gudang & Pembelian</p>
        </div>
        <div>
          <p className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Diterima & Diuji Oleh</p>
          <div className="h-20 flex items-end justify-center">
            <span className="font-bold border-b border-slate-800 pb-0.5 min-w-[130px] inline-block text-slate-900">
              {batch.petugas_qc_pabrik || <>&nbsp;</>}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Tim QC / Lab Pabrik Buyer</p>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2 text-center leading-snug">
        Dokumen ini merupakan bukti sah pengiriman sample tembakau rajangan Madura dan lampiran kesepakatan spesifikasi mutu &
        harga sebelum penerbitan Delivery Order (Surat Jalan).
      </div>
    </div>
  );

  return (
    <DokumenBerlembar
      ukuran={U}
      judul="Surat Pengantar Sample & Penawaran Batch"
      lanjutanKiri={`${COMPANY_NAME} • Surat Sample ${batch.kode_batch}`}
      lanjutanKanan={batch.tujuan_buyer}
      meta={meta}
      kolom={kolom}
      kepalaTabel={kepalaTabel}
      baris={baris}
      barisTotal={barisTotal}
      ekor={ekor}
      footerKiri={`Dicetak ${printDateStr} oleh ${batch.dikirim_oleh || 'Sistem ERP'}`}
      footerKanan="Dokumen Resmi Pengiriman Sample"
    />
  );
};

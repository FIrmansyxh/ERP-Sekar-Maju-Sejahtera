import React from 'react';
import { BatchPengirimanSample } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { COMPANY_NAME } from '../../config/appInfo';
import { DokumenBerlembar } from '../common/DokumenBerlembar';
import { UKURAN_SURAT_SAMPLE, UkuranDokumen } from '../../utils/paginasiDokumen';
import { beratBrutoItemSample } from '../../utils/beratKirim';
import { kodeBalPembeliBerbeda, kodeHargaJualSample } from '../../utils/suratSample';

export interface SuratSampleDokumenProps {
  batch: BatchPengirimanSample;
}

/**
 * Isi Surat Pengantar Sample & Penawaran Batch untuk pratinjau dan cetak. Aturan halaman sama
 * dengan Nota Pembelian dan Surat Jalan: satu lembar per halaman, baris tidak terpotong, judul kolom
 * berulang. Data pemasok (petani) sengaja tidak ditampilkan, dan harga jual hanya tampil sebagai
 * KODE harga jual, bukan nilai rupiahnya.
 */
export const SuratSampleDokumen: React.FC<SuratSampleDokumenProps> = ({ batch }) => {
  const items = batch.items || [];
  const totalBal = items.length;
  // Dokumen untuk buyer memakai berat bruto; netto hanya untuk pembelian internal
  const totalBruto = items.reduce((sum, it) => sum + beratBrutoItemSample(it), 0);

  // Kolom hanya muncul bila ada isinya, supaya tiap sel tetap satu baris dan tinggi baris pasti
  const adaKodeBuyer = items.some((it) => kodeBalPembeliBerbeda(it) !== '');

  const U: UkuranDokumen = { ...UKURAN_SURAT_SAMPLE, totalBaris: 44 };

  const printDateStr = (() => {
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  })();

  // Lebar kolom dalam persen; jumlahnya selalu 100
  const lebar: number[] = [6, adaKodeBuyer ? 24 : 34, ...(adaKodeBuyer ? [22] : [])];
  const sisa = 100 - lebar.reduce((a, b) => a + b, 0);
  const lebarBruto = Math.floor(sisa / 2);
  lebar.push(lebarBruto, sisa - lebarBruto);

  const kolom = (
    <colgroup>
      {lebar.map((w, i) => (
        <col key={i} style={{ width: `${w}%` }} />
      ))}
    </colgroup>
  );

  const kepalaTabel = (
    <tr
      className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-[11px] uppercase tracking-wide whitespace-nowrap"
      style={{ height: U.thead - 2 }}
    >
      <th className="px-3 text-center border-r border-slate-300">No</th>
      <th className="px-3 text-left border-r border-slate-300">No Bal</th>
      {adaKodeBuyer && <th className="px-3 text-left border-r border-slate-300">Kode Buyer</th>}
      <th className="px-3 text-right border-r border-slate-300">Bruto (kg)</th>
      <th className="px-3 text-center">Kode Harga Jual</th>
    </tr>
  );

  const baris = items.map((it, idx) => {
    const bruto = beratBrutoItemSample(it);
    const kodeBuyer = kodeBalPembeliBerbeda(it);
    return (
      <tr key={it.sample_item_id || `${it.barang_id}-${idx}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} style={{ height: U.baris }}>
        <td className="px-3 text-center font-mono font-medium text-slate-500 border-r border-slate-200 text-xs">{idx + 1}</td>
        <td className="px-3 text-left font-mono font-bold text-slate-950 border-r border-slate-200 text-xs sm:text-sm truncate" title={it.no_bal}>
          {it.no_bal}
        </td>
        {adaKodeBuyer && (
          <td className="px-3 text-left font-mono text-slate-700 border-r border-slate-200 text-xs truncate">
            {kodeBuyer}
          </td>
        )}
        <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 text-xs sm:text-sm whitespace-nowrap">
          {formatNumber(bruto, 1)} kg
        </td>
        <td className="px-3 text-center font-mono font-bold text-slate-950 text-xs sm:text-sm whitespace-nowrap">
          {kodeHargaJualSample(it)}
        </td>
      </tr>
    );
  });

  // Kolom sebelum "Bruto": No, No Bal, (Kode Buyer)
  const kolomLabel = 2 + (adaKodeBuyer ? 1 : 0);
  const barisTotal = (
    <>
      <tr
        className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs sm:text-sm"
        style={{ height: 42 }}
      >
        <td colSpan={kolomLabel} className="px-3 text-right uppercase tracking-wider text-xs text-slate-700 font-bold border-r border-slate-300">
          TOTAL ({totalBal} BAL SAMPLE):
        </td>
        <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-300 whitespace-nowrap">
          {formatNumber(totalBruto, 1)} kg
        </td>
        <td className="px-3" />
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

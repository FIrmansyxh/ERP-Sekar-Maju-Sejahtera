import React from 'react';
import { BatchPengirimanSample } from '../../types';
import { formatNumber, formatRupiah } from '../../utils/formatters';
import { COMPANY_NAME } from '../../config/appInfo';
import { DokumenBerlembar } from '../common/DokumenBerlembar';
import { UKURAN_SURAT_SAMPLE, UkuranDokumen } from '../../utils/paginasiDokumen';
import { beratBrutoItemSample } from '../../utils/beratKirim';

export interface SuratSampleDokumenProps {
  batch: BatchPengirimanSample;
}

/**
 * Isi Surat Pengantar Sample & Penawaran Batch untuk pratinjau, cetak, dan PDF. Aturan halaman sama
 * dengan Nota Pembelian dan Surat Jalan: satu lembar per halaman, baris tidak terpotong, judul kolom
 * berulang. Data pemasok (petani) sengaja tidak ditampilkan.
 */
export const SuratSampleDokumen: React.FC<SuratSampleDokumenProps> = ({ batch }) => {
  const items = batch.items || [];
  const totalBal = items.length;
  // Dokumen untuk buyer memakai berat bruto; netto hanya untuk pembelian internal
  const totalBruto = items.reduce((sum, it) => sum + beratBrutoItemSample(it), 0);
  const totalNilaiTawaran = items.reduce((sum, it) => sum + beratBrutoItemSample(it) * it.harga_tawaran_kg, 0);
  const itemDeal = items.filter((it) => it.status_item === 'disetujui');
  const totalNilaiDeal = itemDeal.reduce(
    (sum, it) => sum + beratBrutoItemSample(it) * (it.harga_deal_kg || it.harga_tawaran_kg),
    0
  );

  // Kolom hanya muncul bila ada isinya, supaya tiap sel tetap satu baris dan tinggi baris pasti
  const adaKodeBuyer = items.some(
    (it) => it.kode_bal_pembeli && it.kode_bal_pembeli.trim().toUpperCase() !== (it.no_bal || '').trim().toUpperCase()
  );
  const adaDeal = itemDeal.some((it) => it.harga_deal_kg && it.harga_deal_kg > 0);

  const U: UkuranDokumen = { ...UKURAN_SURAT_SAMPLE, totalBaris: totalNilaiDeal > 0 ? 88 : 44 };

  const printDateStr = (() => {
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  })();

  // Lebar kolom dalam persen; jumlahnya selalu 100
  const lebar: number[] = [6, adaKodeBuyer ? 20 : 26, ...(adaKodeBuyer ? [16] : [])];
  const sisa = 100 - lebar.reduce((a, b) => a + b, 0);
  const jumlahAngka = 3 + (adaDeal ? 1 : 0);
  const bagi = Math.floor(sisa / jumlahAngka);
  for (let i = 0; i < jumlahAngka - 1; i++) lebar.push(bagi);
  lebar.push(sisa - bagi * (jumlahAngka - 1));

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
      <th className="px-3 text-right border-r border-slate-300">Tawar / Kg</th>
      {adaDeal && <th className="px-3 text-right border-r border-slate-300 bg-slate-200/50">Deal / Kg</th>}
      <th className="px-3 text-right">Subtotal</th>
    </tr>
  );

  const baris = items.map((it, idx) => {
    const bruto = beratBrutoItemSample(it);
    const kodeBuyerBerbeda =
      it.kode_bal_pembeli && it.kode_bal_pembeli.trim().toUpperCase() !== (it.no_bal || '').trim().toUpperCase();
    const punyaDeal = it.status_item === 'disetujui' && it.harga_deal_kg && it.harga_deal_kg > 0;
    return (
      <tr key={it.sample_item_id || `${it.barang_id}-${idx}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} style={{ height: U.baris }}>
        <td className="px-3 text-center font-mono font-medium text-slate-500 border-r border-slate-200 text-xs">{idx + 1}</td>
        <td className="px-3 text-left font-mono font-bold text-slate-950 border-r border-slate-200 text-xs sm:text-sm truncate" title={it.no_bal}>
          {it.no_bal}
        </td>
        {adaKodeBuyer && (
          <td className="px-3 text-left font-mono text-slate-700 border-r border-slate-200 text-xs truncate">
            {kodeBuyerBerbeda ? it.kode_bal_pembeli : ''}
          </td>
        )}
        <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 text-xs sm:text-sm whitespace-nowrap">
          {formatNumber(bruto, 1)} kg
        </td>
        <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 text-xs sm:text-sm whitespace-nowrap">
          {formatRupiah(it.harga_tawaran_kg)}
        </td>
        {adaDeal && (
          <td className="px-3 text-right font-mono font-bold text-emerald-800 border-r border-slate-200 text-xs sm:text-sm bg-slate-50/70 whitespace-nowrap">
            {punyaDeal ? formatRupiah(it.harga_deal_kg) : '-'}
          </td>
        )}
        <td className="px-3 text-right font-mono font-bold text-slate-950 text-xs sm:text-sm whitespace-nowrap">
          {formatRupiah(bruto * it.harga_tawaran_kg)}
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
        <td colSpan={adaDeal ? 2 : 1} className="px-3 text-right text-[11px] text-slate-600 border-r border-slate-300">
          Total Nilai:
        </td>
        <td className="px-3 text-right font-mono font-black text-slate-950 text-sm whitespace-nowrap">
          {formatRupiah(totalNilaiTawaran)}
        </td>
      </tr>
      {totalNilaiDeal > 0 && (
        <tr className="bg-emerald-50 font-bold text-emerald-900 border-t border-emerald-200" style={{ height: 44 }}>
          <td colSpan={kolomLabel + 1 + (adaDeal ? 1 : 0)} className="px-3 text-right uppercase tracking-wider text-xs border-r border-emerald-200">
            Total Nilai Disetujui (Deal Final):
          </td>
          <td colSpan={2} className="px-3 text-right font-mono font-black text-emerald-800 text-sm whitespace-nowrap">
            {formatRupiah(totalNilaiDeal)}
          </td>
        </tr>
      )}
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

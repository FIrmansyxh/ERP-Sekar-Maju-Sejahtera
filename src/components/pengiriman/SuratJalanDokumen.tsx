import React from 'react';
import { Barang, PengirimanBarang } from '../../types';
import { formatNumber, formatRupiah, terbilangRupiah } from '../../utils/formatters';
import { COMPANY_NAME } from '../../config/appInfo';
import { DokumenBerlembar } from '../common/DokumenBerlembar';
import { UKURAN_SURAT_JALAN } from '../../utils/paginasiDokumen';
import { beratKirimBal, nettoJualBal } from '../../utils/beratKirim';
import { labelRentang } from '../../utils/aturanNetto';
import { loadCurrentUser } from '../../utils/storage';

export interface SuratJalanDokumenProps {
  pengiriman: PengirimanBarang;
  barangList: Barang[];
}

const kg = (val: number): string =>
  `${val.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;

/**
 * Isi Surat Jalan Pengiriman (DO) untuk pratinjau, cetak, dan PDF. Aturan halaman sama dengan
 * Nota Pembelian: satu lembar per halaman, baris tidak terpotong, judul kolom berulang.
 * Data pemasok (petani) sengaja tidak ditampilkan; itu hanya kebutuhan internal.
 */
export const SuratJalanDokumen: React.FC<SuratJalanDokumenProps> = ({ pengiriman, barangList }) => {
  const barangIds = pengiriman.barang_ids || [];
  const barcodeList = pengiriman.barcode_list || [];
  const isBpp = pengiriman.jenis_pengeluaran === 'produksi_sendiri';
  const namaPetugasLogistik = loadCurrentUser()?.nama_lengkap || pengiriman.petugas || '';

  const balDetails = barangIds.map((id, index) => {
    const found = barangList.find((b) => b.barang_id === id);
    const barcodeVal = barcodeList[index] || (found ? found.barcode || found.barang_id : id);
    const bruto = beratKirimBal(pengiriman, id, found);
    const netto = nettoJualBal(pengiriman, id, found);
    // Harga jual hanya dari data DO; tanpa harga beli atau angka pengganti.
    const harga = pengiriman.harga_deal_map?.[id] || 0;
    return {
      id,
      no_bal: found?.no_bal || barcodeVal,
      bruto,
      netto,
      harga,
      total: Math.round(netto * harga),
    };
  });

  // Kolom netto hanya tampil pada DO yang memakai aturan netto; DO lama tetap tanpa kolom itu
  const adaNetto = !!pengiriman.netto_jual_map && Object.keys(pengiriman.netto_jual_map).length > 0;
  const totalBal = balDetails.length > 0 ? balDetails.length : pengiriman.total_bal || 0;
  const totalBruto = balDetails.reduce((s, b) => s + b.bruto, 0) || pengiriman.total_berat_kg || 0;
  const totalNetto = balDetails.reduce((s, b) => s + b.netto, 0);
  const totalNilai = balDetails.reduce((s, b) => s + b.total, 0);
  const dasarRata = adaNetto ? totalNetto : totalBruto;
  const rataHarga = dasarRata > 0 ? Math.round(totalNilai / dasarRata) : 0;
  const punyaAturan = adaNetto && !!pengiriman.aturan_netto && pengiriman.aturan_netto.length > 0;
  const punyaCatatan = !!pengiriman.catatan;
  // Blok penutup bertambah tinggi bila ada catatan (maksimal 3 baris) dan keterangan aturan netto
  const U = {
    ...UKURAN_SURAT_JALAN,
    ekor: UKURAN_SURAT_JALAN.ekor + (punyaAturan ? 44 : 0) + (punyaCatatan ? 84 : 0),
  };

  const judul = isBpp ? 'Bon Pemakaian Produksi (BPP)' : 'Surat Jalan Pengiriman (DO)';
  const printDateStr = (() => {
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  })();

  const kolom = adaNetto ? (
    <colgroup>
      <col style={{ width: '6%' }} />
      <col style={{ width: '22%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '19%' }} />
      <col style={{ width: '21%' }} />
    </colgroup>
  ) : (
    <colgroup>
      <col style={{ width: '7%' }} />
      <col style={{ width: '29%' }} />
      <col style={{ width: '20%' }} />
      <col style={{ width: '20%' }} />
      <col style={{ width: '24%' }} />
    </colgroup>
  );

  const kepalaTabel = (
    <tr
      className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-xs uppercase tracking-wider whitespace-nowrap"
      style={{ height: U.thead - 2 }}
    >
      <th className="px-3 text-center border-r border-slate-300">No</th>
      <th className="px-3 text-left border-r border-slate-300">No Bal</th>
      <th className="px-3 text-right border-r border-slate-300">Bruto (kg)</th>
      {adaNetto && <th className="px-3 text-right border-r border-slate-300 bg-slate-200/50">Netto Jual (kg)</th>}
      <th className="px-3 text-right border-r border-slate-300">Harga / Kg</th>
      <th className="px-3 text-right">Total Nilai</th>
    </tr>
  );

  const baris = balDetails.map((b, idx) => (
    <tr key={`${b.id}-${idx}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} style={{ height: U.baris }}>
      <td className="px-3 text-center font-mono font-medium text-slate-500 border-r border-slate-200 text-xs">{idx + 1}</td>
      <td className="px-3 text-left font-mono font-bold text-slate-950 border-r border-slate-200 text-xs sm:text-sm truncate" title={b.no_bal}>
        {b.no_bal}
      </td>
      <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 text-xs sm:text-sm whitespace-nowrap">
        {kg(b.bruto)}
      </td>
      {adaNetto && (
        <td className="px-3 text-right font-mono font-bold text-slate-950 border-r border-slate-200 text-xs sm:text-sm bg-slate-50/70 whitespace-nowrap">
          {kg(b.netto)}
        </td>
      )}
      <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 text-xs sm:text-sm whitespace-nowrap">
        {b.harga > 0 ? formatRupiah(b.harga) : '-'}
      </td>
      <td className="px-3 text-right font-mono font-bold text-slate-950 text-xs sm:text-sm whitespace-nowrap">
        {b.harga > 0 ? formatRupiah(b.total) : '-'}
      </td>
    </tr>
  ));

  const barisTotal = (
    <tr
      className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs sm:text-sm"
      style={{ height: U.totalBaris - 2 }}
    >
      <td colSpan={2} className="px-3 text-right uppercase tracking-wider text-xs text-slate-700 font-bold border-r border-slate-300">
        TOTAL ({totalBal} BAL):
      </td>
      <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-300 whitespace-nowrap">
        {kg(totalBruto)}
      </td>
      {adaNetto && (
        <td className="px-3 text-right font-mono font-bold text-slate-950 bg-slate-200/50 border-r border-slate-300 whitespace-nowrap">
          {kg(totalNetto)}
        </td>
      )}
      <td className="px-3 text-right font-mono text-slate-600 text-[10.5px] border-r border-slate-300 whitespace-nowrap">
        Rata-rata: {formatRupiah(rataHarga)}
      </td>
      <td className="px-3 text-right font-mono font-black text-slate-950 text-sm whitespace-nowrap">
        {formatRupiah(totalNilai)}
      </td>
    </tr>
  );

  const meta = (
    <>
      <div className="flex items-center justify-between text-xs">
        <div className="font-mono font-bold text-slate-900">
          No: <span className="text-[#b81d24]">{pengiriman.no_surat_jalan}</span>
        </div>
        <div className="text-[10.5px] text-slate-600 font-medium">
          Tgl Kirim: <span className="font-mono font-bold text-slate-800">{pengiriman.tanggal_kirim}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50/70 border border-slate-300 rounded-sm text-xs">
        <div className="space-y-1.5 pr-2">
          <div className="border-b border-slate-200 pb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Pabrik Rekanan / Tujuan Kirim:</span>
            <span className="font-bold text-sm text-slate-900 block leading-tight">{pengiriman.tujuan}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">Gudang Pengirim:</span>
            <span className="font-semibold text-slate-800 text-[11px]">Gudang Pusat Pamekasan</span>
          </div>
        </div>
        <div className="space-y-1.5 border-l border-slate-300 pl-4">
          <div className="border-b border-slate-200 pb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Armada & Pengemudi:</span>
            <span className="font-bold text-sm text-slate-900 block leading-tight">{pengiriman.driver_nama || 'Supir Ekspedisi'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 text-[10px] block">No. Polisi (Plat):</span>
              <span className="font-mono font-black text-slate-900">{pengiriman.plat_nomor || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Petugas Logistik:</span>
              <span className="font-semibold text-slate-800">{namaPetugasLogistik || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const ekor = (
    <div className="space-y-3">
      {punyaAturan && (
        <p className="text-[10.5px] text-slate-600 leading-snug line-clamp-2">
          Netto jual = bruto timbang ulang dikurangi potongan:{' '}
          {pengiriman.aturan_netto!.map((a) => `${labelRentang(a)} = ${formatNumber(a.potongan)} kg`).join('; ')}.
        </p>
      )}

      <div className="p-2.5 bg-slate-50 border border-slate-300 text-xs flex items-start space-x-2 rounded-sm">
        <span className="font-bold text-slate-700 shrink-0 uppercase tracking-wider text-[11px]">Terbilang:</span>
        <span className="italic font-bold text-slate-950 capitalize text-xs leading-relaxed">{terbilangRupiah(totalNilai)}</span>
      </div>

      {punyaCatatan && (
        <div className="p-2.5 bg-slate-50 border border-slate-300 text-xs text-slate-800 rounded-sm">
          <strong className="block font-bold text-[10px] uppercase text-slate-900">Catatan Khusus Pengiriman:</strong>
          <p className="mt-0.5 leading-snug line-clamp-3">{pengiriman.catatan}</p>
        </div>
      )}

      {!isBpp && (
        <div className="border border-slate-200 p-2.5 bg-slate-50/50 text-[10px] text-slate-600 space-y-0.5 rounded-sm">
          <strong className="block text-slate-800 uppercase font-bold text-[10px]">Syarat & Ketentuan Pengiriman:</strong>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Barang tembakau telah diperiksa bersama dalam kondisi baik, kering, terbungkus rapi dan sesuai mutu yang disepakati.</li>
            <li>Pengemudi wajib menjaga keutuhan segel dan terpal pelindung muatan selama perjalanan hingga ke pabrik tujuan.</li>
            <li>Klaim selisih berat timbang atau mutu harus dilaporkan dalam tempo 1x24 jam saat pembongkaran di pabrik penerima.</li>
          </ol>
        </div>
      )}

      <div className="pt-3 grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <p className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Petugas Logistik / Pengirim</p>
          <div className="h-20 flex items-end justify-center">
            <span className="font-bold border-b border-slate-800 pb-0.5 min-w-[130px] inline-block text-slate-900">
              {namaPetugasLogistik || <>&nbsp;</>}
            </span>
          </div>
        </div>
        <div>
          <p className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Pengemudi / Supir Ekspedisi</p>
          <div className="h-20 flex items-end justify-center">
            <span className="font-bold border-b border-slate-800 pb-0.5 min-w-[130px] inline-block text-slate-900">
              {pengiriman.driver_nama || <>&nbsp;</>}
            </span>
          </div>
        </div>
        <div>
          <p className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Penerima Gudang Pabrik</p>
          <div className="h-20 flex items-end justify-center">
            <span className="font-bold border-b border-slate-800 pb-0.5 min-w-[130px] inline-block text-slate-900">
              {pengiriman.penerima || <>&nbsp;</>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DokumenBerlembar
      ukuran={U}
      judul={judul}
      lanjutanKiri={`${COMPANY_NAME} • ${isBpp ? 'BPP' : 'Surat Jalan'} ${pengiriman.no_surat_jalan}`}
      lanjutanKanan={pengiriman.tujuan}
      meta={meta}
      kolom={kolom}
      kepalaTabel={kepalaTabel}
      baris={baris}
      barisTotal={barisTotal}
      ekor={ekor}
      footerKiri={`Dicetak ${printDateStr} oleh ${namaPetugasLogistik || 'Sistem ERP'}`}
      footerKanan={`Dokumen Resmi Pengiriman ${COMPANY_NAME}`}
    />
  );
};

import React from 'react';
import { TransaksiPembelian } from '../../types';
import { formatRupiah, formatAccounting, formatDateHariBulanTahun, terbilangRupiah } from '../../utils/formatters';
import { loadCurrentUser } from '../../utils/storage';

export interface NotaTimbangContentProps {
  transaksi: TransaksiPembelian;
}

export const NotaTimbangContent: React.FC<NotaTimbangContentProps> = ({ transaksi }) => {
  const currentUser = loadCurrentUser();
  
  const items = transaksi.items && transaksi.items.length > 0
    ? transaksi.items
    : [
        {
          item_id: 'item-1',
          no_bal: transaksi.no_bal,
          kode_grade: transaksi.kode_grade,
          berat_kg: transaksi.berat_kg,
          harga_per_kg: transaksi.harga_per_kg,
          total_kotor: transaksi.total_kotor || transaksi.berat_kg * transaksi.harga_per_kg,
          potongan: transaksi.total_potongan,
          subtotal_bersih: transaksi.harga_final,
          ganti_tikar: (transaksi.potongan_tikar || 0) > 0,
        },
      ];

  const totalBal = items.length;
  const totalNettoKg = Number(items.reduce((sum, it) => sum + (it.berat_kg || 0), 0).toFixed(1));
  const totalKotorRp = items.reduce((sum, it) => sum + (it.total_kotor || 0), 0);
  const totalPotonganRp = items.reduce((sum, it) => sum + (it.potongan || 0), 0);
  const grandTotalRp = items.reduce((sum, it) => sum + (it.subtotal_bersih || 0), 0);

  const jumlahGantiTikar = items.filter((it) => it.ganti_tikar).length;
  const totalPotonganKuli = items.reduce((sum, it) => sum + (it.potongan_kuli || 7000), 0);
  const totalPotonganTali = items.reduce((sum, it) => sum + (it.potongan_tali || 3000), 0);
  const totalPotonganTikar = items.reduce((sum, it) => sum + (it.potongan_tikar || (it.ganti_tikar ? 75000 : 0)), 0);

  const cleanDate = formatDateHariBulanTahun(transaksi.tanggal_transaksi);
  const isLunas = transaksi.status_pembayaran === 'lunas' || transaksi.metode_pembayaran === 'cash';

  return (
    <div className="space-y-4 text-xs text-gray-900 font-sans">
      {/* Header Kop Resmi - Sederhana, Formal & Profesional */}
      <div className="text-center border-b-2 border-gray-800 pb-3 space-y-1">
        <h1 className="text-2xl font-black tracking-widest text-gray-900 uppercase">
          S.A GROUP
        </h1>
        <h2 className="text-sm font-bold tracking-tight text-gray-800 uppercase mt-1">
          SURAT BUKTI TIMBANG & NOTA PEMBELIAN TEMBAKAU
        </h2>
        <p className="text-[10.5px] text-gray-600">
          Jl. Raya Blumbungan, Dusun Kendal, Desa Trasak, Kec. Larangan, Kab. Pamekasan
        </p>
      </div>

      {/* Metadata Grid - Bersih & Rapi */}
      <div className="grid grid-cols-2 gap-6 border-b border-gray-200 pb-3 text-xs">
        {/* Kolom Kiri: Informasi Transaksi & Pembayaran */}
        <div className="space-y-1.5 pr-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">No. Transaksi:</span>
            <span className="font-mono font-bold text-gray-950 text-[12px]">{transaksi.transaksi_id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">No. Kupon Antrian:</span>
            <span className="font-mono font-bold text-gray-900">{transaksi.no_kupon}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Tanggal Transaksi:</span>
            <span className="font-mono text-gray-800">{cleanDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Status Pembayaran:</span>
            <span
              className={`font-semibold px-2 py-0.5 text-[10px] tracking-wide rounded-xs border ${
                isLunas
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                  : 'text-amber-800 bg-amber-50 border-amber-300'
              }`}
            >
              {isLunas ? 'LUNAS (CASH)' : 'BELUM LUNAS (KREDIT)'}
            </span>
          </div>
        </div>

        {/* Kolom Kanan: Informasi Petani */}
        <div className="space-y-1.5 border-l border-gray-200 pl-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Petani / Penjual:</span>
            <span className="font-bold text-gray-900 truncate max-w-[200px]">
              {transaksi.nama_petani}{' '}
              <span className="font-mono text-[10.5px] text-gray-500 font-normal">({transaksi.petani_id})</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Asal / Desa:</span>
            <span className="text-gray-800 truncate max-w-[190px]">{transaksi.desa_kecamatan || '-'}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-gray-300 overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-800 text-[11px]">
              <th className="py-2 px-2 text-center border-r border-gray-300 w-8">No</th>
              <th className="py-2 px-2.5 border-r border-gray-300 w-20 text-center">No Bal</th>
              <th className="py-2 px-2 border-r border-gray-300 text-center">Tikar</th>
              <th className="py-2 px-2.5 border-r border-gray-300 text-right">Bruto (Kg)</th>
              <th className="py-2 px-2.5 border-r border-gray-300 text-right">Netto (Kg)</th>
              <th className="py-2 px-2.5 border-r border-gray-300 text-right">Tarif / Kg</th>
              <th className="py-2 px-2.5 border-r border-gray-300 text-right">Total Kotor</th>
              <th className="py-2 px-2.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}>
                <td className="py-1.5 px-2 text-center border-r border-gray-200 font-mono text-gray-600">
                  {idx + 1}
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-200 font-mono font-bold text-gray-900 text-center w-20">
                  {item.no_bal}
                </td>
                <td className="py-1.5 px-2 border-r border-gray-200 text-center font-mono text-[10px]">
                  {item.potongan_tikar && item.potongan_tikar > 0 ? (
                    <span className="text-gray-900 font-semibold">{formatRupiah(item.potongan_tikar)}</span>
                  ) : item.ganti_tikar ? (
                    <span className="text-gray-900 font-semibold">{formatRupiah(75000)}</span>
                  ) : (
                    <span className="text-gray-400">Standar</span>
                  )}
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-200 text-right font-mono font-medium text-gray-700">
                  {item.berat_bruto_kg || (item.berat_kg + (item.potongan_tara_kg || 0))} kg
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-200 text-right font-mono font-semibold text-gray-900">
                  {item.berat_kg} kg
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-200 text-right font-mono text-gray-700">
                  {formatRupiah(item.harga_per_kg)}
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-200 text-right font-mono text-gray-700">
                  {formatRupiah(item.total_kotor)}
                </td>
                <td className="py-1.5 px-2.5 text-right font-mono font-bold text-gray-900">
                  {formatRupiah(item.subtotal_bersih)}
                </td>
              </tr>
            ))}

            {/* Total Summary Row */}
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-900">
              <td colSpan={4} className="py-2 px-3 text-right uppercase text-[11px]">
                TOTAL ({totalBal} BAL):
              </td>
              <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-950 border-r border-gray-300">
                {totalNettoKg} kg
              </td>
              <td className="py-2 px-2.5 border-r border-gray-300"></td>
              <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-800 border-r border-gray-300">
                <span className="text-[9px] text-gray-400 mr-1">Rp</span>
                {formatAccounting(totalKotorRp)}
              </td>
              <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-950 text-xs">
                <span className="text-[9px] text-gray-400 mr-1">Rp</span>
                {formatAccounting(grandTotalRp)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rincian Potongan Biaya Table */}
      <div className="border border-gray-300 overflow-hidden mt-2">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-800 text-[11px]">
              <th className="py-1.5 px-2.5 border-r border-gray-300">Rincian Potongan Biaya</th>
              <th className="py-1.5 px-2.5 border-r border-gray-300 text-center w-32">Jumlah</th>
              <th className="py-1.5 px-2.5 text-right w-40">Subtotal Potongan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="bg-white">
              <td className="py-1.5 px-2.5 border-r border-gray-200 text-gray-700">
                Biaya Kuli & Angkut (@ Rp 7.000)
              </td>
              <td className="py-1.5 px-2.5 border-r border-gray-200 text-center font-mono text-gray-900">
                {totalBal} bal
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono text-gray-700 flex justify-end items-center">
                {totalPotonganKuli > 0 ? (
                  <>
                    <span className="text-[9px] text-gray-400 mr-1">-Rp</span>
                    {formatAccounting(totalPotonganKuli)}
                  </>
                ) : (
                  <span className="text-gray-400">Rp 0</span>
                )}
              </td>
            </tr>
            <tr className="bg-gray-50/60">
              <td className="py-1.5 px-2.5 border-r border-gray-200 text-gray-700">
                Biaya Tali (@ Rp 3.000)
              </td>
              <td className="py-1.5 px-2.5 border-r border-gray-200 text-center font-mono text-gray-900">
                {totalBal} bal
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono text-gray-700 flex justify-end items-center">
                {totalPotonganTali > 0 ? (
                  <>
                    <span className="text-[9px] text-gray-400 mr-1">-Rp</span>
                    {formatAccounting(totalPotonganTali)}
                  </>
                ) : (
                  <span className="text-gray-400">Rp 0</span>
                )}
              </td>
            </tr>
            <tr className="bg-white">
              <td className="py-1.5 px-2.5 border-r border-gray-200 text-gray-700">
                Biaya Ganti Tikar
              </td>
              <td className="py-1.5 px-2.5 border-r border-gray-200 text-center font-mono text-gray-900">
                {jumlahGantiTikar} bal
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono text-gray-700 flex justify-end items-center">
                {totalPotonganTikar > 0 ? (
                  <>
                    <span className="text-[9px] text-gray-400 mr-1">-Rp</span>
                    {formatAccounting(totalPotonganTikar)}
                  </>
                ) : (
                  <span className="text-gray-400">Rp 0</span>
                )}
              </td>
            </tr>
            <tr className="bg-gray-100 font-bold border-t border-gray-300 text-gray-900">
              <td colSpan={2} className="py-1.5 px-2.5 text-right uppercase text-[11px] border-r border-gray-300">
                TOTAL POTONGAN KESELURUHAN:
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono font-bold text-gray-800 text-xs flex justify-end items-center">
                <span className="text-[9px] text-gray-400 mr-1">-Rp</span>
                {formatAccounting(totalPotonganRp)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Total Bersih Dibayar (Grand Total) Summary - Format Akuntansi ERP Elegan & Bersih */}
      <div className="flex justify-end pt-1">
        <div className="w-1/2 bg-gray-50 border-2 border-gray-800 p-2.5 rounded-xs flex justify-between items-center">
          <div>
            <span className="font-bold uppercase text-[11px] tracking-wider text-gray-900 block">
              Total Bersih Dibayar
            </span>
            <span className="text-[10px] text-gray-500 font-normal">
              (Diterima Petani)
            </span>
          </div>
          <span className="font-mono font-bold text-base text-gray-950 flex items-center">
            <span className="text-xs text-gray-500 mr-2 font-sans font-bold">Rp</span>
            {formatAccounting(grandTotalRp)}
          </span>
        </div>
      </div>

      {/* Terbilang Box */}
      <div className="p-2.5 bg-gray-50 border border-gray-300 text-xs flex items-start space-x-2 rounded-xs">
        <span className="font-bold text-gray-700 shrink-0">Terbilang:</span>
        <span className="italic font-medium text-gray-900 capitalize">
          {terbilangRupiah(grandTotalRp)}
        </span>
      </div>

      {/* Signature Grid */}
      <div className="pt-4 grid grid-cols-2 gap-4 text-center text-xs avoid-page-break">
        <div>
          <p className="text-gray-600 font-medium">Penjual</p>
          <div className="h-14 flex items-end justify-center">
            <span className="font-semibold border-b border-gray-800 pb-0.5 min-w-[130px] inline-block text-gray-900">
              {transaksi.nama_petani || <>&nbsp;</>}
            </span>
          </div>
        </div>
        <div>
          <p className="text-gray-600 font-medium">Admin / Kasir</p>
          <div className="h-14 flex items-end justify-center">
            <span className="font-semibold border-b border-gray-800 pb-0.5 min-w-[130px] inline-block text-gray-900">
              {currentUser?.nama_lengkap || currentUser?.username || 'Admin'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


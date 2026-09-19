import React from 'react';
import { TransaksiPembelian } from '../../types';
import { formatRupiah, formatAccounting, formatDateHariBulanTahun, terbilangRupiah, normalizeKg } from '../../utils/formatters';
import { loadCurrentUser } from '../../utils/storage';
import { KopSurat } from '../common/KopSurat';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL, POTONGAN_TALI_PER_BAL } from '../../config/aturanTimbang';
import { sortTransaksiItemsByInputOrder } from '../../utils/kuponSortir';

export interface NotaTimbangContentProps {
  transaksi: TransaksiPembelian;
}

export const NotaTimbangContent: React.FC<NotaTimbangContentProps> = ({ transaksi }) => {
  const currentUser = loadCurrentUser();
  
  const items = transaksi.items && transaksi.items.length > 0
    ? sortTransaksiItemsByInputOrder(transaksi.items)
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
  const totalNettoKg = normalizeKg(items.reduce((sum, it) => sum + (it.berat_kg || 0), 0));
  const totalKotorRp = items.reduce((sum, it) => sum + (it.total_kotor || 0), 0);
  const totalPotonganRp = items.reduce((sum, it) => sum + (it.potongan || 0), 0);
  const grandTotalRp = items.reduce((sum, it) => sum + (it.subtotal_bersih || 0), 0);

  const jumlahGantiTikar = items.filter((it) => it.ganti_tikar || (it.potongan_tikar || 0) > 0).length;
  const totalPotonganKuli = items.reduce((sum, it) => sum + (it.potongan_kuli || POTONGAN_KULI_PER_BAL), 0);
  const totalPotonganTali = items.reduce((sum, it) => sum + (it.potongan_tali || POTONGAN_TALI_PER_BAL), 0);
  const totalPotonganTikar = items.reduce(
    (sum, it) => sum + (it.potongan_tikar || (it.ganti_tikar ? POTONGAN_GANTI_TIKAR : 0)),
    0
  );

  const cleanDate = formatDateHariBulanTahun(transaksi.tanggal_transaksi);
  const isLunas = transaksi.status_pembayaran === 'lunas' || transaksi.metode_pembayaran === 'cash';

  return (
    <div className="space-y-4 text-xs text-gray-900 font-sans">
      <KopSurat judul="Surat Bukti Timbang & Nota Pembelian Tembakau" />

      {/* Metadata Grid - Bersih & Rapi */}
      <div className="grid grid-cols-2 gap-6 border-b border-gray-200 pb-3 text-xs avoid-page-break">
        {/* Kolom Kiri: Informasi Transaksi & Pembayaran */}
        <div className="space-y-1.5 pr-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">No. Kupon:</span>
            <span className="font-mono font-bold text-gray-950 text-[12px]">{transaksi.no_kupon}</span>
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

      {/* Items Table - Dimaksimalkan Ukuran & Layout */}
      <div className="border border-slate-300 rounded-md overflow-hidden shadow-xs">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-xs uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12">No</th>
              <th className="py-3 px-4 text-center w-28">No Bal</th>
              <th className="py-3 px-3 text-center w-24">Tikar</th>
              <th className="py-3 px-3 text-right w-28">Bruto (Kg)</th>
              <th className="py-3 px-3 text-right w-28 bg-slate-200/50">Netto (Kg)</th>
              <th className="py-3 px-4 text-right w-36">Tarif / Kg</th>
              <th className="py-3 px-4 text-right">Total Kotor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800 text-[13px]">
            {items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                <td className="py-3 px-3 text-center font-mono font-semibold text-slate-500">
                  {idx + 1}
                </td>
                <td className="py-3 px-4 font-mono font-bold text-slate-950 text-center text-sm">
                  {item.no_bal}
                </td>
                <td className="py-3 px-3 text-center font-mono text-xs">
                  {item.potongan_tikar && item.potongan_tikar > 0 ? (
                    <span className="text-amber-900 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {formatRupiah(item.potongan_tikar)}
                    </span>
                  ) : item.ganti_tikar ? (
                    <span className="text-amber-900 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {formatRupiah(POTONGAN_GANTI_TIKAR)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Standar</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                  {item.berat_bruto_kg || (item.berat_kg + (item.potongan_tara_kg || 0))} kg
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-slate-950 text-sm bg-slate-50/50">
                  {item.berat_kg} kg
                </td>
                <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                  {formatRupiah(item.harga_per_kg)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-950 text-sm">
                  {formatRupiah(item.total_kotor)}
                </td>
              </tr>
            ))}

            {/* Total Summary Row */}
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-sm">
              <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-xs text-slate-700 font-bold">
                TOTAL ({totalBal} BAL):
              </td>
              <td className="py-3 px-3 text-right font-mono font-black text-slate-950 text-sm bg-slate-200/40">
                {totalNettoKg} kg
              </td>
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4 text-right font-mono font-black text-slate-950 text-base">
                <span className="text-xs text-slate-500 mr-1.5 font-sans font-semibold">Rp</span>
                {formatAccounting(totalKotorRp)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rincian Potongan Biaya Table */}
      <div className="border border-slate-300 rounded-md overflow-hidden mt-3 avoid-page-break shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-xs uppercase tracking-wider">
              <th className="py-2.5 px-3">Rincian Potongan Biaya</th>
              <th className="py-2.5 px-3 text-center w-36">Jumlah</th>
              <th className="py-2.5 px-4 text-right w-48">Subtotal Potongan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800 text-[12.5px]">
            <tr className="bg-white">
              <td className="py-2.5 px-3 text-slate-700 font-medium">
                Biaya Kuli &amp; Angkut (@ Rp 7.000)
              </td>
              <td className="py-2.5 px-3 text-center font-mono text-slate-700 font-semibold">
                {totalBal} bal
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-800 font-semibold">
                {totalPotonganKuli > 0 ? (
                  <>
                    <span className="text-xs text-slate-400 mr-1">-Rp</span>
                    {formatAccounting(totalPotonganKuli)}
                  </>
                ) : (
                  <span className="text-slate-400">Rp 0</span>
                )}
              </td>
            </tr>
            <tr className="bg-slate-50/70">
              <td className="py-2.5 px-3 text-slate-700 font-medium">
                Biaya Tali (@ Rp 3.000)
              </td>
              <td className="py-2.5 px-3 text-center font-mono text-slate-700 font-semibold">
                {totalBal} bal
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-800 font-semibold">
                {totalPotonganTali > 0 ? (
                  <>
                    <span className="text-xs text-slate-400 mr-1">-Rp</span>
                    {formatAccounting(totalPotonganTali)}
                  </>
                ) : (
                  <span className="text-slate-400">Rp 0</span>
                )}
              </td>
            </tr>
            <tr className="bg-white">
              <td className="py-2.5 px-3 text-slate-700 font-medium">
                Biaya Ganti Tikar
              </td>
              <td className="py-2.5 px-3 text-center font-mono text-slate-700 font-semibold">
                {jumlahGantiTikar} bal
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-800 font-semibold">
                {totalPotonganTikar > 0 ? (
                  <>
                    <span className="text-xs text-slate-400 mr-1">-Rp</span>
                    {formatAccounting(totalPotonganTikar)}
                  </>
                ) : (
                  <span className="text-slate-400">Rp 0</span>
                )}
              </td>
            </tr>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
              <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-xs tracking-wider text-slate-700">
                TOTAL POTONGAN KESELURUHAN:
              </td>
              <td className="py-2.5 px-4 text-right font-mono font-black text-slate-950 text-sm">
                <span className="text-xs text-slate-400 mr-1">-Rp</span>
                {formatAccounting(totalPotonganRp)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Penutup nota: total bersih, terbilang, dan tanda tangan selalu satu halaman */}
      <div className="space-y-4 avoid-page-break">
        <div className="flex justify-end pt-1">
          <div className="w-1/2 bg-slate-50 border-2 border-slate-400 p-3.5 rounded-md flex justify-between items-center shadow-xs">
            <div>
              <span className="font-bold uppercase text-xs tracking-wider text-slate-800 block">
                Total Bersih Dibayar
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                (Diterima Petani)
              </span>
            </div>
            <span className="font-mono font-black text-xl text-slate-950 flex items-center">
              <span className="text-xs text-slate-500 mr-2 font-sans font-semibold">Rp</span>
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

        {/* Tanda tangan: label, ruang tanda tangan, dan nama selalu di halaman yang sama */}
        <div className="pt-4 grid grid-cols-2 gap-4 text-center text-xs avoid-page-break">
          <div>
            <p className="text-gray-600 font-medium">Penjual</p>
            <div className="h-22 flex items-end justify-center">
              <span className="font-semibold border-b border-gray-800 pb-0.5 min-w-[130px] inline-block text-gray-900">
                {transaksi.nama_petani || <>&nbsp;</>}
              </span>
            </div>
          </div>
          <div>
            <p className="text-gray-600 font-medium">Admin / Kasir</p>
            <div className="h-22 flex items-end justify-center">
              <span className="font-semibold border-b border-gray-800 pb-0.5 min-w-[130px] inline-block text-gray-900">
                {currentUser?.nama_lengkap || currentUser?.username || 'Admin'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


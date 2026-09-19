import React from 'react';
import { TransaksiPembelian } from '../../types';
import { formatDateHariBulanTahun, terbilangRupiah, normalizeKg } from '../../utils/formatters';
import { loadCurrentUser } from '../../utils/storage';
import { COMPANY_ADDRESS, COMPANY_NAME } from '../../config/appInfo';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL, POTONGAN_TALI_PER_BAL } from '../../config/aturanTimbang';
import { sortTransaksiItemsByInputOrder } from '../../utils/kuponSortir';

export interface NotaTimbangContentProps {
  transaksi: TransaksiPembelian;
}

export const NotaTimbangContent: React.FC<NotaTimbangContentProps> = ({ transaksi }) => {
  const currentUser = loadCurrentUser();

  const rawItems = transaksi.items && transaksi.items.length > 0
    ? sortTransaksiItemsByInputOrder(transaksi.items)
    : [
        {
          item_id: 'item-1',
          no_bal: transaksi.no_bal || '-',
          kode_grade: transaksi.kode_grade,
          berat_kg: transaksi.berat_kg || 0,
          berat_bruto_kg: (transaksi as any).berat_terukur_kg || transaksi.berat_kg || 0,
          harga_per_kg: transaksi.harga_per_kg || 0,
          total_kotor: transaksi.total_kotor || (transaksi.berat_kg || 0) * (transaksi.harga_per_kg || 0),
          potongan: transaksi.total_potongan || 0,
          subtotal_bersih: transaksi.harga_final || 0,
          ganti_tikar: (transaksi.potongan_tikar || 0) > 0,
          potongan_kuli: transaksi.potongan_kuli ?? POTONGAN_KULI_PER_BAL,
          potongan_tali: (transaksi as any).potongan_tali ?? POTONGAN_TALI_PER_BAL,
          potongan_tikar: transaksi.potongan_tikar || 0,
        },
      ];

  const items = rawItems.map((it, idx) => {
    const isGantiTikar = Boolean(it.ganti_tikar) || Number(it.potongan_tikar || 0) > 0;
    const netto = Number(it.berat_kg || 0);
    const bruto = Number(it.berat_bruto_kg || 0) || (netto > 0 ? netto + Number((it as any).potongan_tara_kg || 0) : 0);
    const hargaPerKg = Number(it.harga_per_kg || 0);
    const nilaiBeli = it.total_kotor !== undefined && it.total_kotor > 0
      ? it.total_kotor
      : Math.round(netto * hargaPerKg);

    const kuli = Number(it.potongan_kuli ?? POTONGAN_KULI_PER_BAL);
    const tali = Number((it as any).potongan_tali ?? POTONGAN_TALI_PER_BAL);
    const tikar = isGantiTikar ? Number(it.potongan_tikar || 0) || POTONGAN_GANTI_TIKAR : 0;
    const itemPotongan = kuli + tali + tikar;
    const itemJumlah = nilaiBeli - itemPotongan;

    return {
      no: idx + 1,
      no_bal: it.no_bal || '-',
      isGantiTikar,
      bruto,
      netto,
      hargaPerKg,
      nilaiBeli,
      potongan: itemPotongan,
      jumlah: itemJumlah,
      kuli,
      tali,
      tikar,
    };
  });

  const totalBal = items.length;
  const totalBruto = normalizeKg(items.reduce((sum, it) => sum + it.bruto, 0));
  const totalNetto = normalizeKg(items.reduce((sum, it) => sum + it.netto, 0));
  const totalNilaiBeli = items.reduce((sum, it) => sum + it.nilaiBeli, 0);
  const totalPotongan = items.reduce((sum, it) => sum + it.potongan, 0);
  const grandTotal = items.reduce((sum, it) => sum + it.jumlah, 0);

  const totalPotonganKuli = items.reduce((sum, it) => sum + it.kuli, 0);
  const totalPotonganTali = items.reduce((sum, it) => sum + it.tali, 0);
  const totalPotonganTikar = items.reduce((sum, it) => sum + it.tikar, 0);
  const jumlahGantiTikar = items.filter((it) => it.isGantiTikar).length;

  const isLunas = transaksi.status_pembayaran === 'lunas' || transaksi.metode_pembayaran === 'cash';
  const cleanDate = formatDateHariBulanTahun(transaksi.tanggal_transaksi);

  const kasirNama =
    transaksi.dibayar_oleh ||
    transaksi.dicetak_oleh ||
    currentUser?.nama_lengkap ||
    currentUser?.username ||
    'Admin_Jihan';

  const printDateStr = (() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  })();

  const formatKg = (val: number): string => {
    return val.toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  return (
    <div className="w-full space-y-4 text-sm text-gray-900 font-sans leading-normal">
      {/* Header Nota / Kop Surat - Diperbesar & Lebih Resmi */}
      <div className="text-center pb-2 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-gray-950 uppercase">
          {COMPANY_NAME}
        </h1>
        <h2 className="text-sm sm:text-base font-bold tracking-wider text-gray-800 uppercase">
          Nota Pembelian Tembakau
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed pt-0.5">
          {COMPANY_ADDRESS}
        </p>
      </div>

      <div className="border-b-2 border-gray-900" />

      {/* Metadata Bar - Layout Maksimal & Font Lebih Besar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm py-1.5 bg-gray-50/70 p-3 rounded-sm border border-gray-200">
        <div>
          <span className="text-xs text-gray-500 font-medium block">No. Kupon</span>
          <span className="font-mono font-black text-gray-950 text-base">{transaksi.no_kupon}</span>
        </div>
        <div>
          <span className="text-xs text-gray-500 font-medium block">Tanggal Pembelian</span>
          <span className="font-mono font-semibold text-gray-900 text-sm">{cleanDate}</span>
        </div>
        <div>
          <span className="text-xs text-gray-500 font-medium block">Nama Petani</span>
          <div className="font-bold text-gray-950 text-base flex items-center space-x-1.5 flex-wrap">
            <span>{transaksi.nama_petani}</span>
            <span className="font-mono text-xs text-gray-500 font-normal">({transaksi.petani_id})</span>
          </div>
        </div>
        <div>
          <span className="text-xs text-gray-500 font-medium block">Status Kasir</span>
          <div className="mt-0.5">
            {isLunas ? (
              <span className="inline-block font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-xs border border-emerald-300 text-xs">
                ✓ LUNAS
              </span>
            ) : (
              <span className="inline-block font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-xs border border-amber-300 text-xs">
                BELUM LUNAS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table Bal Items (Kolom Tara & Subtotal Dihapus, Layout & Ukuran Dimaksimalkan) */}
      <div className="overflow-x-auto border-2 border-gray-400 rounded-sm shadow-2xs">
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-500 bg-gray-100 text-gray-900 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
              <th className="py-3.5 px-3 text-center w-14 border-r-2 border-gray-300">No</th>
              <th className="py-3.5 px-4 text-left w-36 border-r-2 border-gray-300">No Bal</th>
              <th className="py-3.5 px-4 text-right border-r-2 border-gray-300">Bruto (kg)</th>
              <th className="py-3.5 px-4 text-right border-r-2 border-gray-300 bg-slate-200/50">Netto (kg)</th>
              <th className="py-3.5 px-4 text-right border-r-2 border-gray-300">Harga/kg</th>
              <th className="py-3.5 px-4 text-right border-r-2 border-gray-300">Potongan</th>
              <th className="py-3.5 px-4 text-right bg-amber-100/40">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-gray-200 text-gray-900">
            {items.map((item, idx) => (
              <tr 
                key={item.no} 
                className={`${idx % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'} hover:bg-amber-50/50 transition-colors`}
              >
                <td className="py-3.5 sm:py-4 px-3 text-center font-mono font-semibold text-gray-500 border-r-2 border-gray-200 text-sm sm:text-base">
                  {item.no}
                </td>
                <td className="py-3.5 sm:py-4 px-4 text-left font-mono font-black text-gray-950 border-r-2 border-gray-200 whitespace-nowrap text-base sm:text-lg">
                  <span>{item.no_bal}</span>
                  {item.isGantiTikar && (
                    <span 
                      className="ml-2 inline-block bg-amber-200 text-amber-950 border border-amber-400 font-black text-xs px-2 py-0.5 rounded shadow-2xs"
                      title="Ganti Tikar (+Rp 75.000)"
                    >
                      T
                    </span>
                  )}
                </td>
                <td className="py-3.5 sm:py-4 px-4 text-right font-mono font-bold text-gray-800 border-r-2 border-gray-200 text-base sm:text-lg">
                  {formatKg(item.bruto)}
                </td>
                <td className="py-3.5 sm:py-4 px-4 text-right font-mono font-black text-gray-950 border-r-2 border-gray-200 text-lg sm:text-xl bg-slate-50/50">
                  {formatKg(item.netto)}
                </td>
                <td className="py-3.5 sm:py-4 px-4 text-right font-mono font-bold text-gray-800 border-r-2 border-gray-200 text-base sm:text-lg">
                  {item.hargaPerKg.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 sm:py-4 px-4 text-right font-mono font-semibold text-gray-700 border-r-2 border-gray-200 text-base sm:text-lg">
                  {item.potongan.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 sm:py-4 px-4 text-right font-mono font-black text-gray-950 text-lg sm:text-xl bg-amber-50/30">
                  {item.jumlah.toLocaleString('id-ID')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-3 border-b-2 border-gray-900 bg-gray-100 font-black text-gray-950 text-base sm:text-lg">
              <td colSpan={2} className="py-4 px-4 text-left border-r-2 border-gray-300 uppercase tracking-wide">
                Total {totalBal} bal
              </td>
              <td className="py-4 px-4 text-right font-mono font-bold border-r-2 border-gray-300 text-base sm:text-lg">
                {formatKg(totalBruto)}
              </td>
              <td className="py-4 px-4 text-right font-mono font-black border-r-2 border-gray-300 text-xl sm:text-2xl text-gray-950 bg-slate-200/50">
                {formatKg(totalNetto)}
              </td>
              <td className="py-4 px-4 text-right border-r-2 border-gray-300"></td>
              <td className="py-4 px-4 text-right font-mono font-bold border-r-2 border-gray-300 text-gray-800 text-base sm:text-lg">
                {totalPotongan.toLocaleString('id-ID')}
              </td>
              <td className="py-4 px-4 text-right font-mono font-black text-gray-950 text-xl sm:text-2xl bg-amber-100/50">
                {grandTotal.toLocaleString('id-ID')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Catatan / Keterangan Tikar & Potongan */}
      <div className="text-xs sm:text-sm text-gray-600 pt-0.5 pb-1 flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="font-semibold text-gray-800">Keterangan:</span> T = ganti tikar. Potongan bal: kuli Rp {POTONGAN_KULI_PER_BAL.toLocaleString('id-ID')} + tali Rp {POTONGAN_TALI_PER_BAL.toLocaleString('id-ID')} (+ tikar Rp {POTONGAN_GANTI_TIKAR.toLocaleString('id-ID')}).
        </div>
      </div>

      {/* Rincian Terbilang & Kalkulasi Potongan */}
      <div className="flex flex-col sm:flex-row justify-between gap-6 pt-1 items-stretch avoid-page-break">
        {/* Box Terbilang (Kiri) */}
        <div className="w-full sm:w-1/2 p-4 border border-gray-300 rounded-sm bg-gray-50/70 flex flex-col justify-center">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Terbilang:</span>
          <p className="italic font-bold text-gray-950 capitalize text-sm sm:text-base mt-2 leading-relaxed">
            {terbilangRupiah(grandTotal)} rupiah
          </p>
        </div>

        {/* Ringkasan Finansial (Kanan) */}
        <div className="w-full sm:w-1/2 text-sm space-y-1.5 p-4 border border-gray-300 rounded-sm bg-gray-50/40">
          <div className="flex justify-between items-center text-gray-700">
            <span className="font-medium">Nilai beli (Bruto x Harga)</span>
            <span className="font-mono font-semibold text-gray-900">{totalNilaiBeli.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center text-gray-700">
            <span>Kuli ({totalBal} bal x {POTONGAN_KULI_PER_BAL.toLocaleString('id-ID')})</span>
            <span className="font-mono font-semibold text-gray-800">-{totalPotonganKuli.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center text-gray-700">
            <span>Tali ({totalBal} bal x {POTONGAN_TALI_PER_BAL.toLocaleString('id-ID')})</span>
            <span className="font-mono font-semibold text-gray-800">-{totalPotonganTali.toLocaleString('id-ID')}</span>
          </div>
          {jumlahGantiTikar > 0 && (
            <div className="flex justify-between items-center text-amber-800 font-medium">
              <span>Ganti tikar ({jumlahGantiTikar} bal x {POTONGAN_GANTI_TIKAR.toLocaleString('id-ID')})</span>
              <span className="font-mono font-semibold">-{totalPotonganTikar.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="border-t-2 border-gray-400 pt-2.5 mt-2 flex justify-between items-center font-black text-gray-950">
            <span className="text-sm sm:text-base uppercase tracking-wider">Total Dibayar</span>
            <span className="font-mono text-base sm:text-xl font-black text-gray-950">
              Rp {grandTotal.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Tanda Tangan */}
      <div className="pt-8 grid grid-cols-2 gap-12 text-center text-sm avoid-page-break">
        <div>
          <p className="text-gray-700 font-bold uppercase tracking-wider text-xs sm:text-sm">Penjual / Petani</p>
          <div className="h-20 sm:h-24 flex items-end justify-center">
            <span className="font-bold border-b-2 border-gray-900 pb-1 min-w-[160px] inline-block text-gray-950 text-sm sm:text-base">
              {transaksi.nama_petani || <>&nbsp;</>}
            </span>
          </div>
        </div>
        <div>
          <p className="text-gray-700 font-bold uppercase tracking-wider text-xs sm:text-sm">Petugas Kasir</p>
          <div className="h-20 sm:h-24 flex items-end justify-center">
            <span className="font-bold border-b-2 border-gray-900 pb-1 min-w-[160px] inline-block text-gray-950 text-sm sm:text-base">
              {kasirNama}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info Dokumen */}
      <div className="pt-6 border-t border-gray-300 flex justify-between items-center text-xs text-gray-500 font-mono avoid-page-break">
        <div>
          Dicetak {printDateStr} oleh {kasirNama}
        </div>
        <div>
          Halaman 1 dari 1 • Dokumen Resmi Pembelian Tembakau
        </div>
      </div>
    </div>
  );
};

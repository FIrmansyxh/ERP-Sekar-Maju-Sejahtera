import React from 'react';
import { TransaksiPembelian } from '../../types';
import { 
  formatRupiah, 
  formatAccounting, 
  formatDateHariBulanTahun, 
  terbilangRupiah, 
  normalizeKg 
} from '../../utils/formatters';
import { loadCurrentUser } from '../../utils/storage';
import { KopSurat } from '../common/KopSurat';
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
    
    // Total Kotor = Netto (kg) x Harga per kg
    const totalKotor = it.total_kotor !== undefined && it.total_kotor > 0
      ? it.total_kotor
      : Math.round(netto * hargaPerKg);

    const kuli = Number(it.potongan_kuli ?? POTONGAN_KULI_PER_BAL);
    const tali = Number((it as any).potongan_tali ?? POTONGAN_TALI_PER_BAL);
    const tikar = isGantiTikar ? Number(it.potongan_tikar || 0) || POTONGAN_GANTI_TIKAR : 0;
    const itemPotongan = kuli + tali + tikar;
    const itemSubtotalBersih = totalKotor - itemPotongan;

    return {
      no: idx + 1,
      no_bal: it.no_bal || '-',
      kode_grade: it.kode_grade || '-',
      isGantiTikar,
      bruto,
      netto,
      hargaPerKg,
      totalKotor,
      potongan: itemPotongan,
      subtotalBersih: itemSubtotalBersih,
      kuli,
      tali,
      tikar,
    };
  });

  const totalBal = items.length;
  const totalBrutoKg = normalizeKg(items.reduce((sum, it) => sum + it.bruto, 0));
  const totalNettoKg = normalizeKg(items.reduce((sum, it) => sum + it.netto, 0));
  const totalKotorRp = items.reduce((sum, it) => sum + it.totalKotor, 0);

  const totalPotonganKuli = items.reduce((sum, it) => sum + it.kuli, 0);
  const totalPotonganTali = items.reduce((sum, it) => sum + it.tali, 0);
  const totalPotonganTikar = items.reduce((sum, it) => sum + it.tikar, 0);
  const totalPotonganRp = totalPotonganKuli + totalPotonganTali + totalPotonganTikar;
  const grandTotalRp = totalKotorRp - totalPotonganRp;
  const jumlahGantiTikar = items.filter((it) => it.isGantiTikar).length;

  const isLunas = transaksi.status_pembayaran === 'lunas' || transaksi.metode_pembayaran === 'cash';
  const cleanDate = formatDateHariBulanTahun(transaksi.tanggal_transaksi);

  const kasirNama =
    transaksi.dibayar_oleh ||
    transaksi.dicetak_oleh ||
    currentUser?.nama_lengkap ||
    currentUser?.username ||
    'Admin Kasir';

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
    <div className="space-y-5 text-sm sm:text-base text-slate-900 font-sans leading-relaxed">
      {/* 1. Kop Surat Resmi ERP */}
      <KopSurat judul="Surat Bukti Timbang & Nota Pembelian Tembakau" />

      {/* 2. Metadata Grid Transaksi & Petani - Tipografi Diperbesar & Jelas */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50/80 border border-slate-300 rounded-sm text-sm avoid-page-break">
        {/* Kolom Kiri: Informasi Transaksi & Pembayaran */}
        <div className="space-y-2 pr-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">No. Kupon:</span>
            <span className="font-mono font-black text-slate-950 text-base sm:text-lg">{transaksi.no_kupon}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">Tanggal:</span>
            <span className="font-mono text-slate-900 font-bold text-sm sm:text-base">{cleanDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">Status Kasir:</span>
            <span
              className={`font-black px-3 py-1 text-xs sm:text-sm tracking-wide rounded-xs border ${
                isLunas
                  ? 'text-emerald-800 bg-emerald-100 border-emerald-400'
                  : 'text-amber-800 bg-amber-100 border-amber-400'
              }`}
            >
              {isLunas ? '✓ LUNAS (CASH)' : 'BELUM LUNAS (KREDIT)'}
            </span>
          </div>
        </div>

        {/* Kolom Kanan: Informasi Petani */}
        <div className="space-y-2 border-l-2 border-slate-300 pl-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">Petani / Penjual:</span>
            <span className="font-black text-slate-950 text-base sm:text-lg truncate max-w-[240px]">
              {transaksi.nama_petani}{' '}
              <span className="font-mono text-xs sm:text-sm text-slate-500 font-normal">({transaksi.petani_id})</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">Asal / Desa:</span>
            <span className="text-slate-900 font-bold text-sm sm:text-base truncate max-w-[240px]">{transaksi.desa_kecamatan || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">Total Bal:</span>
            <span className="font-mono font-black text-slate-950 text-base sm:text-lg">{totalBal} Bal ({transaksi.kode_grade || 'Multi-Grade'})</span>
          </div>
        </div>
      </div>

      {/* 3. Main Bal Items Table: Kolom Total Kotor (Netto x Harga) - Teks Dimaksimalkan */}
      <div className="border-2 border-slate-300 rounded-sm overflow-hidden shadow-2xs">
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300 font-black text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-14 border-r border-slate-300">No</th>
              <th className="py-3 px-4 text-left w-36 border-r border-slate-300">No Bal</th>
              <th className="py-3 px-3 text-center w-36 border-r border-slate-300">Tikar</th>
              <th className="py-3 px-4 text-right w-32 border-r border-slate-300">Bruto (kg)</th>
              <th className="py-3 px-4 text-right w-36 border-r border-slate-300 bg-slate-200/50">Netto (kg)</th>
              <th className="py-3 px-4 text-right w-36 border-r border-slate-300">Harga / Kg</th>
              <th className="py-3 px-4 text-right w-44">Total Kotor</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-200 text-slate-900">
            {items.map((item, idx) => (
              <tr 
                key={item.no} 
                className={`${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} hover:bg-slate-100/60 transition-colors`}
              >
                <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-600 border-r border-slate-200 text-sm sm:text-base">
                  {item.no}
                </td>
                <td className="py-3.5 px-4 text-left font-mono font-black text-slate-950 border-r border-slate-200 whitespace-nowrap text-base sm:text-lg">
                  {item.no_bal}
                </td>
                <td className="py-3.5 px-3 text-center border-r border-slate-200">
                  {item.isGantiTikar ? (
                    <span className="inline-block text-amber-950 font-black bg-amber-100 px-2.5 py-1 rounded border border-amber-400 text-xs sm:text-sm shadow-2xs">
                      Ganti Tikar ({formatRupiah(item.tikar)})
                    </span>
                  ) : (
                    <span className="text-slate-500 font-semibold text-xs sm:text-sm">Standar</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 border-r border-slate-200 text-base sm:text-lg">
                  {formatKg(item.bruto)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-black text-slate-950 border-r border-slate-200 text-lg sm:text-xl bg-slate-100/90">
                  {formatKg(item.netto)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 border-r border-slate-200 text-base sm:text-lg">
                  {item.hargaPerKg.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-black text-slate-950 text-lg sm:text-xl">
                  {item.totalKotor.toLocaleString('id-ID')}
                </td>
              </tr>
            ))}

            {/* Total Summary Row Bal Table - Teks Ekstra Besar & Jelas */}
            <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-950 text-base sm:text-lg">
              <td colSpan={3} className="py-4 px-4 text-right uppercase tracking-wider text-xs sm:text-sm text-slate-800 font-extrabold border-r border-slate-300">
                TOTAL ({totalBal} BAL):
              </td>
              <td className="py-4 px-4 text-right font-mono font-bold text-slate-800 border-r border-slate-300 text-base sm:text-lg">
                {formatKg(totalBrutoKg)} kg
              </td>
              <td className="py-4 px-4 text-right font-mono font-black text-slate-950 bg-slate-200/60 border-r border-slate-300 text-xl sm:text-2xl">
                {formatKg(totalNettoKg)} kg
              </td>
              <td className="py-4 px-4 border-r border-slate-300"></td>
              <td className="py-4 px-4 text-right font-mono font-black text-slate-950 text-xl sm:text-2xl">
                <span className="text-sm text-slate-600 mr-1.5 font-sans font-bold">Rp</span>
                {totalKotorRp.toLocaleString('id-ID')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Rincian Potongan Biaya Table - Teks Nyaman & Mudah Dibaca */}
      <div className="border-2 border-slate-300 rounded-sm overflow-hidden mt-4 avoid-page-break shadow-2xs">
        <table className="w-full text-base text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300 font-black text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
              <th className="py-3 px-4 border-r border-slate-300">Rincian Potongan Biaya</th>
              <th className="py-3 px-4 text-center w-36 border-r border-slate-300">Jumlah</th>
              <th className="py-3 px-4 text-right w-56">Subtotal Potongan</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-200 text-slate-900">
            <tr className="bg-white">
              <td className="py-3 px-4 text-slate-800 font-semibold border-r border-slate-200 text-sm sm:text-base">
                Biaya Kuli &amp; Angkut (@ Rp {POTONGAN_KULI_PER_BAL.toLocaleString('id-ID')})
              </td>
              <td className="py-3 px-4 text-center font-mono text-slate-800 font-bold border-r border-slate-200 text-sm sm:text-base">
                {totalBal} bal
              </td>
              <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold text-base sm:text-lg">
                {totalPotonganKuli > 0 ? (
                  <>
                    <span className="text-xs sm:text-sm text-slate-500 mr-1 font-sans font-normal">-Rp</span>
                    {totalPotonganKuli.toLocaleString('id-ID')}
                  </>
                ) : (
                  <span className="text-slate-400">Rp 0</span>
                )}
              </td>
            </tr>
            <tr className="bg-slate-50/70">
              <td className="py-3 px-4 text-slate-800 font-semibold border-r border-slate-200 text-sm sm:text-base">
                Biaya Tali (@ Rp {POTONGAN_TALI_PER_BAL.toLocaleString('id-ID')})
              </td>
              <td className="py-3 px-4 text-center font-mono text-slate-800 font-bold border-r border-slate-200 text-sm sm:text-base">
                {totalBal} bal
              </td>
              <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold text-base sm:text-lg">
                {totalPotonganTali > 0 ? (
                  <>
                    <span className="text-xs sm:text-sm text-slate-500 mr-1 font-sans font-normal">-Rp</span>
                    {totalPotonganTali.toLocaleString('id-ID')}
                  </>
                ) : (
                  <span className="text-slate-400">Rp 0</span>
                )}
              </td>
            </tr>
            <tr className="bg-white">
              <td className="py-3 px-4 text-slate-800 font-semibold border-r border-slate-200 text-sm sm:text-base">
                Biaya Ganti Tikar (@ Rp {POTONGAN_GANTI_TIKAR.toLocaleString('id-ID')})
              </td>
              <td className="py-3 px-4 text-center font-mono text-slate-800 font-bold border-r border-slate-200 text-sm sm:text-base">
                {jumlahGantiTikar} bal
              </td>
              <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold text-base sm:text-lg">
                {totalPotonganTikar > 0 ? (
                  <>
                    <span className="text-xs sm:text-sm text-slate-500 mr-1 font-sans font-normal">-Rp</span>
                    {totalPotonganTikar.toLocaleString('id-ID')}
                  </>
                ) : (
                  <span className="text-slate-400">Rp 0</span>
                )}
              </td>
            </tr>
            <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-950 text-base sm:text-lg">
              <td colSpan={2} className="py-3.5 px-4 text-right uppercase text-xs sm:text-sm tracking-wider text-slate-800 font-black border-r border-slate-300">
                TOTAL POTONGAN KESELURUHAN:
              </td>
              <td className="py-3.5 px-4 text-right font-mono font-black text-slate-950 text-lg sm:text-xl">
                <span className="text-sm text-slate-600 mr-1 font-sans font-bold">-Rp</span>
                {totalPotonganRp.toLocaleString('id-ID')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Subtotal / Total Bersih Dibayar (Total Kotor - Semua Potongan) & Terbilang */}
      <div className="space-y-4 avoid-page-break pt-2">
        <div className="flex justify-end">
          <div className="w-full sm:w-3/4 md:w-3/5 bg-slate-50 border-2 border-slate-400 p-5 rounded-sm shadow-sm space-y-3">
            <div className="flex justify-between items-center text-sm sm:text-base text-slate-700 font-medium">
              <span>Total Kotor (Netto x Harga)</span>
              <span className="font-mono font-bold text-slate-950 text-base sm:text-lg">
                Rp {totalKotorRp.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm sm:text-base text-slate-700 font-medium">
              <span>Semua Potongan (Kuli, Tali, Tikar)</span>
              <span className="font-mono font-bold text-slate-800 text-base sm:text-lg">
                -Rp {totalPotonganRp.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="border-t-2 border-slate-400 pt-3 flex justify-between items-center">
              <div>
                <span className="font-black uppercase text-sm sm:text-base tracking-wider text-slate-950 block">
                  Subtotal / Total Dibayar
                </span>
                <span className="text-xs sm:text-sm text-slate-600 font-semibold block mt-0.5">
                  (Diterima Petani)
                </span>
              </div>
              <span className="font-mono font-black text-2xl sm:text-3xl text-slate-950 flex items-center">
                <span className="text-base text-slate-600 mr-2 font-sans font-bold">Rp</span>
                {grandTotalRp.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Terbilang Box - Font Besar & Nyaman Dibaca */}
        <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-sm">
          <span className="font-black text-slate-600 shrink-0 uppercase tracking-wider text-xs sm:text-sm block">Terbilang:</span>
          <p className="italic font-black text-slate-950 capitalize text-sm sm:text-base mt-1 leading-relaxed">
            {terbilangRupiah(grandTotalRp)} rupiah
          </p>
        </div>

        {/* Tanda Tangan */}
        <div className="pt-6 grid grid-cols-2 gap-10 text-center text-sm avoid-page-break">
          <div>
            <p className="text-slate-700 font-black uppercase tracking-wider text-xs sm:text-sm">Penjual / Petani</p>
            <div className="h-24 sm:h-28 flex items-end justify-center">
              <span className="font-black border-b-2 border-slate-900 pb-1 min-w-[160px] inline-block text-slate-950 text-base sm:text-lg">
                {transaksi.nama_petani || <>&nbsp;</>}
              </span>
            </div>
          </div>
          <div>
            <p className="text-slate-700 font-black uppercase tracking-wider text-xs sm:text-sm">Petugas Kasir / Admin</p>
            <div className="h-24 sm:h-28 flex items-end justify-center">
              <span className="font-black border-b-2 border-slate-900 pb-1 min-w-[160px] inline-block text-slate-950 text-base sm:text-lg">
                {kasirNama}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Dokumen */}
        <div className="pt-4 border-t border-slate-300 flex justify-between items-center text-xs font-mono text-slate-500 avoid-page-break">
          <div>Dicetak {printDateStr} oleh {kasirNama}</div>
          <div>Halaman 1 dari 1 • Dokumen Resmi Pembelian Tembakau</div>
        </div>
      </div>
    </div>
  );
};

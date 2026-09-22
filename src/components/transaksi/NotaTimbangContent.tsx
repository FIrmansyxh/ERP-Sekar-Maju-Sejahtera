import React from 'react';
import { TransaksiPembelian } from '../../types';
import {
  formatRupiah,
  formatAccounting,
  formatDateHariBulanTahun,
  terbilangRupiah,
  normalizeKg
} from '../../utils/formatters';
import { isTransaksiLunas } from '../../utils/statusBayar';
import { loadCurrentUser } from '../../utils/storage';
import { KopSurat } from '../common/KopSurat';
import { COMPANY_NAME } from '../../config/appInfo';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL, POTONGAN_TALI_PER_BAL } from '../../config/aturanTimbang';
import { sortTransaksiItemsByInputOrder } from '../../utils/kuponSortir';
import { susunHalamanNota, UKURAN_NOTA } from '../../utils/paginasiNota';

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

  const isLunas = isTransaksiLunas(transaksi);
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

  // Tiap halaman menjadi satu lembar tersendiri. Tinggi baris dipatok supaya pembagian halaman
  // pasti, sehingga tidak ada baris yang terpotong di pergantian halaman.
  const halamanList = susunHalamanNota(items.length);
  const jumlahHalaman = halamanList.length;

  const HeaderTabel = () => (
    <thead>
      <tr
        className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-xs uppercase tracking-wider"
        style={{ height: UKURAN_NOTA.thead - 2 }}
      >
        <th className="px-3 text-center w-12 border-r border-slate-300">No</th>
        <th className="px-3 text-left w-28 border-r border-slate-300">No Bal</th>
        <th className="px-3 text-center w-24 border-r border-slate-300">Tikar</th>
        <th className="px-3 text-right w-28 border-r border-slate-300">Bruto (kg)</th>
        <th className="px-3 text-right w-28 border-r border-slate-300 bg-slate-200/50">Netto (kg)</th>
        <th className="px-3 text-right w-32 border-r border-slate-300">Harga / Kg</th>
        <th className="px-3 text-right w-36">Total Kotor</th>
      </tr>
    </thead>
  );

  const renderBaris = (item: (typeof items)[number]) => (
    <tr
      key={item.no}
      className={`${(item.no - 1) % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}
      style={{ height: UKURAN_NOTA.baris }}
    >
      <td className="px-3 text-center font-mono font-medium text-slate-500 border-r border-slate-200 text-xs">
        {item.no}
      </td>
      <td className="px-3 text-left font-mono font-bold text-slate-950 border-r border-slate-200 text-xs sm:text-sm">
        {item.no_bal}
      </td>
      <td className="px-3 text-center border-r border-slate-200 font-mono text-xs">
        {item.isGantiTikar ? (
          <span className="inline-block text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            75.000
          </span>
        ) : (
          <span className="text-slate-400">Standar</span>
        )}
      </td>
      <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 text-xs sm:text-sm">
        {formatKg(item.bruto)}
      </td>
      <td className="px-3 text-right font-mono font-bold text-slate-950 border-r border-slate-200 text-xs sm:text-sm bg-slate-50/70">
        {formatKg(item.netto)}
      </td>
      <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 text-xs sm:text-sm">
        {formatRupiah(item.hargaPerKg)}
      </td>
      <td className="px-3 text-right font-mono font-bold text-slate-950 text-xs sm:text-sm">
        {formatRupiah(item.totalKotor)}
      </td>
    </tr>
  );

  const BarisTotal = () => (
    <tr
      className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs sm:text-sm"
      style={{ height: UKURAN_NOTA.totalBaris - 2 }}
    >
      <td colSpan={3} className="px-3 text-right uppercase tracking-wider text-xs text-slate-700 font-bold border-r border-slate-300">
        TOTAL ({totalBal} BAL):
      </td>
      <td className="px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-300">
        {formatKg(totalBrutoKg)} kg
      </td>
      <td className="px-3 text-right font-mono font-bold text-slate-950 bg-slate-200/50 border-r border-slate-300">
        {formatKg(totalNettoKg)} kg
      </td>
      <td className="px-3 border-r border-slate-300"></td>
      <td className="px-3 text-right font-mono font-black text-slate-950 text-sm">
        <span className="text-xs text-slate-500 mr-1.5 font-sans font-semibold">Rp</span>
        {formatAccounting(totalKotorRp)}
      </td>
    </tr>
  );

  const RincianPotongan = () => (
    <div className="border border-slate-300 rounded-sm overflow-hidden shadow-2xs">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-xs uppercase tracking-wider">
            <th className="py-2 px-3 border-r border-slate-300">Rincian Potongan Biaya</th>
            <th className="py-2 px-3 text-center w-36 border-r border-slate-300">Jumlah</th>
            <th className="py-2 px-4 text-right w-48">Subtotal Potongan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-slate-800 text-[12.5px]">
          <tr className="bg-white">
            <td className="py-2 px-3 text-slate-700 font-medium border-r border-slate-200">
              Biaya Kuli &amp; Angkut (@ Rp {POTONGAN_KULI_PER_BAL.toLocaleString('id-ID')})
            </td>
            <td className="py-2 px-3 text-center font-mono text-slate-700 font-semibold border-r border-slate-200">
              {totalBal} bal
            </td>
            <td className="py-2 px-4 text-right font-mono text-slate-800 font-semibold">
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
          <tr className="bg-slate-50/60">
            <td className="py-2 px-3 text-slate-700 font-medium border-r border-slate-200">
              Biaya Tali (@ Rp {POTONGAN_TALI_PER_BAL.toLocaleString('id-ID')})
            </td>
            <td className="py-2 px-3 text-center font-mono text-slate-700 font-semibold border-r border-slate-200">
              {totalBal} bal
            </td>
            <td className="py-2 px-4 text-right font-mono text-slate-800 font-semibold">
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
            <td className="py-2 px-3 text-slate-700 font-medium border-r border-slate-200">
              Biaya Ganti Tikar (@ Rp {POTONGAN_GANTI_TIKAR.toLocaleString('id-ID')})
            </td>
            <td className="py-2 px-3 text-center font-mono text-slate-700 font-semibold border-r border-slate-200">
              {jumlahGantiTikar} bal
            </td>
            <td className="py-2 px-4 text-right font-mono text-slate-800 font-semibold">
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
            <td colSpan={2} className="py-2 px-3 text-right uppercase text-xs tracking-wider text-slate-700 border-r border-slate-300">
              TOTAL POTONGAN KESELURUHAN:
            </td>
            <td className="py-2 px-4 text-right font-mono font-black text-slate-950 text-xs sm:text-sm">
              <span className="text-xs text-slate-400 mr-1">-Rp</span>
              {formatAccounting(totalPotonganRp)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const Ringkasan = () => (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="w-full sm:w-2/3 md:w-1/2 bg-slate-50 border-2 border-slate-400 p-3.5 rounded-sm shadow-xs space-y-1.5">
          <div className="flex justify-between items-center text-xs text-slate-600">
            <span>Total Kotor (Netto x Harga)</span>
            <span className="font-mono font-semibold text-slate-900">Rp {formatAccounting(totalKotorRp)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-600">
            <span>Semua Potongan (Kuli, Tali, Tikar)</span>
            <span className="font-mono font-semibold text-slate-800">-Rp {formatAccounting(totalPotonganRp)}</span>
          </div>
          <div className="border-t-2 border-slate-300 pt-2 flex justify-between items-center">
            <div>
              <span className="font-bold uppercase text-xs sm:text-sm tracking-wider text-slate-900 block">
                Subtotal / Total Dibayar
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                (Diterima Petani)
              </span>
            </div>
            <span className="font-mono font-black text-lg sm:text-xl text-slate-950 flex items-center">
              <span className="text-xs text-slate-500 mr-1.5 font-sans font-semibold">Rp</span>
              {formatAccounting(grandTotalRp)}
            </span>
          </div>
        </div>
      </div>

      {/* Terbilang Box (hasil terbilang sudah berakhiran "Rupiah") */}
      <div className="p-2.5 bg-slate-50 border border-slate-300 text-xs flex items-start space-x-2 rounded-sm">
        <span className="font-bold text-slate-700 shrink-0 uppercase tracking-wider text-[11px]">Terbilang:</span>
        <span className="italic font-bold text-slate-950 capitalize text-xs leading-relaxed">
          {terbilangRupiah(grandTotalRp)}
        </span>
      </div>

      {/* Tanda Tangan */}
      <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
        <div>
          <p className="text-slate-600 font-bold uppercase tracking-wider text-xs">Penjual / Petani</p>
          <div className="h-20 sm:h-22 flex items-end justify-center">
            <span className="font-bold border-b border-slate-800 pb-0.5 min-w-[140px] inline-block text-slate-900 text-xs sm:text-sm">
              {transaksi.nama_petani || <>&nbsp;</>}
            </span>
          </div>
        </div>
        <div>
          <p className="text-slate-600 font-bold uppercase tracking-wider text-xs">Petugas Kasir / Admin</p>
          <div className="h-20 sm:h-22 flex items-end justify-center">
            <span className="font-bold border-b border-slate-800 pb-0.5 min-w-[140px] inline-block text-slate-900 text-xs sm:text-sm">
              {kasirNama}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="nota-sheets text-xs text-slate-900 font-sans leading-normal">
      {halamanList.map((hal) => {
        const barisHalaman = items.slice(hal.barisMulai, hal.barisAkhir);
        const punyaTabel = barisHalaman.length > 0 || hal.totalBaris;

        return (
          <section
            key={hal.nomor}
            className="nota-sheet"
            data-pdf-page
            aria-label={`Halaman ${hal.nomor} dari ${jumlahHalaman}`}
          >
            {/* 1. Kop Surat Resmi ERP (halaman pertama) atau judul lanjutan */}
            {hal.pertama ? (
              <KopSurat judul="Surat Bukti Timbang & Nota Pembelian Tembakau" />
            ) : (
              <div className="flex items-end justify-between border-b-2 border-slate-800 pb-2">
                <div className="font-black uppercase tracking-wider text-slate-900 text-xs">
                  {COMPANY_NAME} • Nota Pembelian {transaksi.no_kupon}
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  {transaksi.nama_petani} • Lanjutan
                </div>
              </div>
            )}

            {/* 2. Metadata Grid Transaksi & Petani (halaman pertama) */}
            {hal.pertama && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50/70 border border-slate-300 rounded-sm text-xs">
                {/* Kolom Kiri: Informasi Transaksi & Pembayaran */}
                <div className="space-y-1.5 pr-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">NO. KUPON:</span>
                    <span className="font-mono font-bold text-slate-950 text-xs sm:text-sm">{transaksi.no_kupon}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">TANGGAL:</span>
                    <span className="font-mono text-slate-800">{cleanDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">STATUS KASIR:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 text-[10.5px] tracking-wide rounded-xs border ${
                        isLunas
                          ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                          : 'text-amber-800 bg-amber-50 border-amber-300'
                      }`}
                    >
                      {isLunas ? '✓ LUNAS (CASH)' : 'BELUM LUNAS (KREDIT)'}
                    </span>
                  </div>
                </div>

                {/* Kolom Kanan: Informasi Petani */}
                <div className="space-y-1.5 border-l border-slate-300 pl-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">PETANI / PENJUAL:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[220px]">
                      {transaksi.nama_petani}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">ASAL / DESA:</span>
                    <span className="text-slate-800 truncate max-w-[220px]">{transaksi.desa_kecamatan || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Tabel bal: judul kolom diulang di setiap halaman, bingkai selalu tertutup */}
            {punyaTabel && (
              <div className="border border-slate-300 rounded-sm overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <HeaderTabel />
                  <tbody className="divide-y divide-slate-200 text-slate-800 text-[13px]">
                    {barisHalaman.map(renderBaris)}
                    {hal.totalBaris && <BarisTotal />}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Rincian Potongan Biaya */}
            {hal.potongan && <RincianPotongan />}

            {/* 5. Total dibayar, terbilang, dan tanda tangan */}
            {hal.ringkasan && <Ringkasan />}

            {/* Footer setiap halaman */}
            <div className="nota-footer mt-auto pt-3 border-t border-slate-300 flex justify-between items-center text-[11px] text-slate-500 font-mono">
              <div>Dicetak {printDateStr} oleh {kasirNama}</div>
              <div>Halaman {hal.nomor} dari {jumlahHalaman} • Dokumen Resmi Pembelian Tembakau</div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

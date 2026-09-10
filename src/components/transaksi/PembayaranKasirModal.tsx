import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck, 
  Printer
} from 'lucide-react';
import { TransaksiPembelian } from '../../types';
import { formatRupiah } from '../../utils/formatters';

interface PembayaranKasirModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: TransaksiPembelian | null;
  currentKasirName?: string;
  onConfirmPembayaran: (
    transaksiId: string, 
    paymentDetails: {
      metode: 'cash';
      dibayarOleh: string;
      nominalCash: number;
    },
    directPrintAfter?: boolean
  ) => void;
}

export const PembayaranKasirModal: React.FC<PembayaranKasirModalProps> = ({
  isOpen,
  onClose,
  transaksi,
  currentKasirName = 'Petugas Kasir',
  onConfirmPembayaran,
}) => {
  const [dibayarOleh, setDibayarOleh] = useState(currentKasirName);
  const [inputCash, setInputCash] = useState('');
  const [isTiketFisikDiserahkan, setIsTiketFisikDiserahkan] = useState(true);
  const [cetakNotaLangsung, setCetakNotaLangsung] = useState(true);

  useEffect(() => {
    if (transaksi) {
      setDibayarOleh(currentKasirName || transaksi.dibayar_oleh || 'Petugas Kasir');
      setInputCash(''); // Kasir wajib mengetik ulang nominal tagihan
      setIsTiketFisikDiserahkan(true);
      setCetakNotaLangsung(true);
    }
  }, [transaksi, currentKasirName, isOpen]);

  if (!isOpen || !transaksi) return null;

  const totalBersih = Math.round(Math.max(0, transaksi.harga_final || 0));
  const items = transaksi.items || [];
  const balCount = transaksi.total_bal || (items.length > 0 ? items.length : 1);
  const unweighedItems = items.filter((it) => (it.berat_kg || 0) <= 0);
  const hasUnweighedBal = items.length === 0 ? (transaksi.berat_kg || 0) <= 0 : unweighedItems.length > 0;

  // Parse cash input from user
  const numericCash = parseInt(inputCash.replace(/\D/g, ''), 10) || 0;
  const isCashMatched = numericCash === totalBersih;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hasUnweighedBal) {
      alert(
        `⚠️ Pembayaran Ditolak!\n\nKupon ${transaksi.no_kupon} masih memiliki ${unweighedItems.length} bal yang belum ditimbang di modul Timbangan.\n\nSesuai SOP, seluruh bal dalam 1 kupon harus ditimbang semua terlebih dahulu baru bisa lanjut ke proses pembayaran kasir.`
      );
      return;
    }

    if (!isCashMatched) {
      alert(`Nominal Cash belum pas! Silakan ketik tepat senilai ${formatRupiah(totalBersih)}.`);
      return;
    }

    if (!isTiketFisikDiserahkan) {
      alert('Harap pastikan tiket timbang fisik asli telah diserahkan sebelum mencairkan kas.');
      return;
    }

    onConfirmPembayaran(
      transaksi.transaksi_id,
      {
        metode: 'cash',
        dibayarOleh: dibayarOleh.trim() || currentKasirName,
        nominalCash: numericCash,
      },
      cetakNotaLangsung
    );
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white border border-gray-300 w-full max-w-xl rounded-sm shadow-xl flex flex-col text-xs text-gray-800 max-h-[94vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header matching clean ERP theme */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-[#b81d24]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                Pencairan Kas & Pembayaran Tunai
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Pencatatan realisasi kas keluar loket kasir & serah terima tunai
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-sm transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimalist Subheader Info */}
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-2 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-medium">Kupon:</span>
            <strong className="text-gray-900 font-mono text-xs">{transaksi.no_kupon}</strong>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500 font-mono text-[11px]">{transaksi.transaksi_id}</span>
          </div>
          <span className="text-[11px] text-gray-500">
            Metode: <strong className="text-gray-800 font-medium">Kas Keluar (Tunai / Cash)</strong>
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Blocking Warning Banner if any bal is not weighed yet */}
          {hasUnweighedBal && (
            <div className="bg-amber-50/80 border border-amber-300 text-amber-950 p-3.5 rounded-sm flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs text-amber-950">
                  Pembayaran Dikunci: Masih Ada Bal Belum Ditimbang
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Kupon <strong className="font-mono text-amber-950">{transaksi.no_kupon}</strong> masih memiliki{' '}
                  <strong>{unweighedItems.length} dari {balCount} bal</strong> yang belum ditimbang di Proses 2 (Timbangan).
                </p>
                {unweighedItems.length > 0 && (
                  <div className="mt-1 font-mono text-[10px] text-amber-900 bg-amber-100/70 px-2 py-1 rounded-sm border border-amber-200">
                    Bal belum ditimbang: <strong>{unweighedItems.map((b) => b.no_bal).join(', ')}</strong>
                  </div>
                )}
                <p className="text-[10px] text-amber-700 italic pt-0.5">
                  * Sesuai SOP, seluruh bal dalam 1 kupon harus ditimbang lengkap terlebih dahulu baru dapat dicairkan.
                </p>
              </div>
            </div>
          )}

          {/* Summary Data Transaksi Box */}
          <div className="bg-white border border-gray-200 p-4 space-y-3 rounded-sm">
            <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Petani Penerima Tunai</span>
                <p className="text-sm font-bold text-gray-900">{transaksi.nama_petani}</p>
                <span className="text-[11px] font-mono text-gray-500">
                  {transaksi.petani_id} {transaksi.desa_kecamatan ? `• ${transaksi.desa_kecamatan}` : ''}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kupon Antrian</span>
                <p className="text-sm font-mono font-bold text-[#b81d24]">{transaksi.no_kupon}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="bg-gray-50 p-2.5 border border-gray-200 rounded-sm">
                <span className="text-gray-500 text-[11px] block">Jumlah Bal</span>
                <strong className="text-gray-900 font-mono text-xs">{balCount} Bal</strong>
              </div>
              <div className="bg-gray-50 p-2.5 border border-gray-200 rounded-sm">
                <span className="text-gray-500 text-[11px] block">Total Netto</span>
                <strong className="text-gray-900 font-mono text-xs">{transaksi.berat_kg} Kg</strong>
              </div>
              <div className="bg-gray-50 p-2.5 border border-gray-200 rounded-sm">
                <span className="text-gray-500 text-[11px] block">Total Potongan</span>
                <strong className="text-gray-700 font-mono text-xs">
                  {transaksi.total_potongan > 0 ? `-${formatRupiah(transaksi.total_potongan)}` : 'Rp 0'}
                </strong>
              </div>
            </div>

            {/* Banner Jumlah Bayar - Clean ERP Financial Display */}
            <div className="bg-gray-50 border border-gray-300 p-3.5 rounded-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Jumlah Bayar (Diserahkan ke Petani)
                </span>
                <span className="text-[11px] text-gray-500">
                  Uang tunai pas sesuai rekapan timbangan
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-[#b81d24]">
                  {formatRupiah(totalBersih)}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Validasi Ketik Ulang Cash */}
          <div className="bg-white border border-gray-200 p-4 rounded-sm space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-gray-800">
                Ketik Ulang Nominal Cash (Jumlah Bayar) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-500 font-mono">
                Target: <strong className="text-gray-800">{formatRupiah(totalBersih)}</strong>
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 font-mono">
                Rp
              </span>
              <input
                type="text"
                required
                autoFocus
                value={inputCash ? Number(inputCash.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setInputCash(raw);
                }}
                placeholder={`Ketik ulang ${totalBersih.toLocaleString('id-ID')}`}
                className="w-full bg-white border border-gray-300 rounded-sm pl-10 pr-20 py-2 text-sm font-mono font-bold text-gray-900 focus:border-gray-800 focus:outline-none transition"
              />
              {isCashMatched && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[10px] rounded-sm flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Sesuai</span>
                </span>
              )}
            </div>

            {/* Real-time Status Guide - Minimalist */}
            {numericCash === 0 ? (
              <p className="text-[11px] text-gray-500">
                Ketikkan nominal uang tunai yang diserahkan ke petani (harus pas senilai <strong className="text-gray-700">{formatRupiah(totalBersih)}</strong>).
              </p>
            ) : isCashMatched ? (
              <p className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Nominal pas & terverifikasi ({formatRupiah(numericCash)}). Siap diproses.</span>
              </p>
            ) : (
              <p className="text-[11px] text-red-600 font-medium flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>Nominal belum pas (ketik: {formatRupiah(numericCash)}, selisih {formatRupiah(Math.abs(numericCash - totalBersih))}).</span>
              </p>
            )}
          </div>

          {/* Section: Detail Pencatatan Kas Keluar */}
          <div className="space-y-3 bg-white border border-gray-200 p-4 rounded-sm">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-1.5 flex items-center space-x-1.5">
              <FileCheck className="w-3.5 h-3.5 text-gray-600" />
              <span>Detail Pencatatan Kasir</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* No Transaksi Referensi */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  No. Transaksi (Referensi)
                </label>
                <input
                  type="text"
                  readOnly
                  value={transaksi.transaksi_id}
                  className="w-full bg-gray-50 border border-gray-200 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 font-mono font-bold cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* Petugas Kasir (Akun yang sedang memproses) */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Petugas Kasir
                </label>
                <input
                  type="text"
                  readOnly
                  value={dibayarOleh}
                  className="w-full bg-gray-50 border border-gray-200 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 font-medium cursor-not-allowed focus:outline-none"
                  title="Petugas kasir yang bertugas di loket pembayaran"
                />
              </div>
            </div>

            {/* Checkboxes Checklist */}
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-sm space-y-2.5">
              <div className="flex items-start space-x-2.5">
                <input
                  type="checkbox"
                  id="check-tiket-fisik"
                  checked={isTiketFisikDiserahkan}
                  onChange={(e) => setIsTiketFisikDiserahkan(e.target.checked)}
                  className="mt-0.5 rounded-sm text-gray-900 focus:ring-gray-800 cursor-pointer"
                />
                <label htmlFor="check-tiket-fisik" className="text-xs text-gray-700 font-normal cursor-pointer leading-relaxed">
                  <strong>Verifikasi Penyerahan Tiket Timbang:</strong> Tiket fisik asli telah diserahkan dan uang tunai sebesar <strong>{formatRupiah(totalBersih)}</strong> diserahkan ke petani.
                </label>
              </div>

              <div className="flex items-center space-x-2.5 pt-1 border-t border-gray-200">
                <input
                  type="checkbox"
                  id="check-cetak-nota"
                  checked={cetakNotaLangsung}
                  onChange={(e) => setCetakNotaLangsung(e.target.checked)}
                  className="rounded-sm text-gray-900 focus:ring-gray-800 cursor-pointer"
                />
                <label htmlFor="check-cetak-nota" className="text-xs text-gray-700 font-normal cursor-pointer flex items-center space-x-1.5">
                  <Printer className="w-3.5 h-3.5 text-gray-500" />
                  <span>Buka dialog cetak Nota Pembelian otomatis setelah pembayaran selesai</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-gray-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer shadow-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={hasUnweighedBal || !isCashMatched || !isTiketFisikDiserahkan}
              className={`px-4 py-1.5 text-xs font-bold rounded-sm transition flex items-center space-x-1.5 shadow-xs ${
                !hasUnweighedBal && isCashMatched && isTiketFisikDiserahkan
                  ? 'bg-[#b81d24] hover:bg-[#a0181e] text-white cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {hasUnweighedBal ? 'Ditolak: Bal Belum Ditimbang Lengkap' : 'Proses Pembayaran Tunai (Cash)'}
              </span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

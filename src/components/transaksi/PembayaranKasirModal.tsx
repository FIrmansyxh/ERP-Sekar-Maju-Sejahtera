import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  X, 
  Receipt, 
  User, 
  Tag, 
  Calendar, 
  AlertCircle, 
  CreditCard,
  FileCheck,
  ShieldCheck
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
      noBuktiKas: string;
      dibayarOleh: string;
      catatanKasir: string;
    }
  ) => void;
}

export const PembayaranKasirModal: React.FC<PembayaranKasirModalProps> = ({
  isOpen,
  onClose,
  transaksi,
  currentKasirName = 'Kasir Loket 1',
  onConfirmPembayaran,
}) => {
  const [noBuktiKas, setNoBuktiKas] = useState('');
  const [dibayarOleh, setDibayarOleh] = useState(currentKasirName);
  const [catatanKasir, setCatatanKasir] = useState('');
  const [isTiketFisikDiserahkan, setIsTiketFisikDiserahkan] = useState(true);

  useEffect(() => {
    if (transaksi) {
      const now = new Date();
      const dateCompact = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = String(Math.floor(100 + Math.random() * 900));
      const generatedBkk = `BKK-${dateCompact}-${randomSuffix}`;
      setNoBuktiKas(transaksi.no_bukti_kas || generatedBkk);
      setDibayarOleh(transaksi.dibayar_oleh || currentKasirName);
      setCatatanKasir(transaksi.catatan_kasir || 'Tiket timbang fisik asli telah diserahkan petani dan uang tunai dibayarkan lunas.');
      setIsTiketFisikDiserahkan(true);
    }
  }, [transaksi, currentKasirName]);

  if (!isOpen || !transaksi) return null;

  const totalBersih = transaksi.harga_final || 0;
  const items = transaksi.items || [];
  const balCount = transaksi.total_bal || (items.length > 0 ? items.length : 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noBuktiKas.trim()) {
      alert('Mohon isi Nomor Bukti Kas Keluar (BKK).');
      return;
    }
    if (!isTiketFisikDiserahkan) {
      alert('Harap pastikan petani telah menyerahkan tiket timbang pembayaran sebelum memproses pencairan kas tunai.');
      return;
    }

    onConfirmPembayaran(transaksi.transaksi_id, {
      metode: 'cash',
      noBuktiKas: noBuktiKas.trim(),
      dibayarOleh: dibayarOleh.trim() || 'Kasir Loket',
      catatanKasir: catatanKasir.trim(),
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white border border-gray-300 w-full max-w-xl rounded-none shadow-2xl flex flex-col text-xs text-gray-800 max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#b81d24] flex items-center justify-center font-bold text-white shadow-xs">
              <span className="inline-flex items-center justify-center font-bold leading-none w-5 h-5">Rp</span>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">
                Pencairan Kas & Pembayaran Tunai (Cash)
              </h2>
              <p className="text-[11px] text-gray-300">
                Pencatatan penyerahan tiket timbang & realisasi kas keluar loket kasir
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Transition Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-bold rounded-xs text-[10px] uppercase">
              Status Saat Ini: Kredit
            </span>
            <span className="text-gray-400">➔</span>
            <span className="px-2 py-0.5 bg-emerald-700 text-white font-bold rounded-xs text-[10px] uppercase">
              Akan Masuk Kas: Cash (Lunas)
            </span>
          </div>
          <span className="text-[11px] text-amber-900 font-medium">
            Tiket Masuk Loket
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Invoice Summary Box */}
          <div className="bg-gray-50 border border-gray-200 p-3.5 space-y-2.5">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Petani Penerima Tunai</span>
                <p className="text-sm font-bold text-gray-900">{transaksi.nama_petani}</p>
                <span className="text-[10px] font-mono text-gray-500">{transaksi.nomor_kartu || transaksi.petani_id} • {transaksi.desa_kecamatan || '-'}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-500 uppercase">No. Kupon & Transaksi</span>
                <p className="text-xs font-mono font-black text-[#b81d24]">{transaksi.no_kupon}</p>
                <span className="text-[10px] font-mono text-gray-500">{transaksi.transaksi_id}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
              <div className="bg-white p-2 border border-gray-200">
                <span className="text-gray-500 text-[10px] block">Jumlah Bal</span>
                <strong className="text-gray-900 font-mono">{balCount} Bal</strong>
              </div>
              <div className="bg-white p-2 border border-gray-200">
                <span className="text-gray-500 text-[10px] block">Total Netto</span>
                <strong className="text-blue-900 font-mono">{transaksi.berat_kg} kg</strong>
              </div>
              <div className="bg-white p-2 border border-gray-200">
                <span className="text-gray-500 text-[10px] block">Total Potongan</span>
                <strong className="text-red-600 font-mono">-{formatRupiah(transaksi.total_potongan)}</strong>
              </div>
            </div>

            <div className="bg-[#fcf0f0] p-3 border border-red-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-red-800 uppercase block">
                  JUMLAH NOMINAL CAIR (CASH KELUAR)
                </span>
                <span className="text-[10px] text-gray-600">
                  Uang tunai wajib diserahkan pas ke tangan petani
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black font-mono text-[#b81d24]">
                  {formatRupiah(totalBersih)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Input Kasir */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-1 flex items-center space-x-1.5">
              <FileCheck className="w-3.5 h-3.5 text-[#b81d24]" />
              <span>Detail Pencatatan Kas Keluar</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* No Bukti Kas */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  No. Bukti Kas Keluar (BKK) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={noBuktiKas}
                  onChange={(e) => setNoBuktiKas(e.target.value)}
                  placeholder="BKK-YYYYMMDD-XXX"
                  className="w-full bg-white border border-gray-300 rounded-none px-2.5 py-1.5 text-xs text-gray-900 font-mono font-bold focus:outline-none focus:border-[#b81d24]"
                />
              </div>

              {/* Petugas Kasir */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Petugas Kasir Loket <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={dibayarOleh}
                  onChange={(e) => setDibayarOleh(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-none px-2.5 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:border-[#b81d24]"
                />
              </div>
            </div>

            {/* Catatan Pembayaran */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Catatan Transaksi Kasir
              </label>
              <textarea
                rows={2}
                value={catatanKasir}
                onChange={(e) => setCatatanKasir(e.target.value)}
                placeholder="Catatan penyerahan tiket atau keterangan kasir..."
                className="w-full bg-white border border-gray-300 rounded-none p-2 text-xs text-gray-900 focus:outline-none focus:border-[#b81d24]"
              />
            </div>

            {/* Checkbox Konfirmasi Tiket Fisik */}
            <div className="bg-emerald-50/70 border border-emerald-300 p-3 flex items-start space-x-2.5">
              <input
                type="checkbox"
                id="check-tiket-fisik"
                checked={isTiketFisikDiserahkan}
                onChange={(e) => setIsTiketFisikDiserahkan(e.target.checked)}
                className="mt-0.5 rounded text-[#b81d24] focus:ring-[#b81d24] cursor-pointer"
              />
              <label htmlFor="check-tiket-fisik" className="text-xs text-emerald-950 font-medium cursor-pointer">
                <strong>Verifikasi Penyerahan Tiket Timbang:</strong> Petani telah menyerahkan tiket timbang fisik asli di loket kasir, dan uang tunai sebesar <strong>{formatRupiah(totalBersih)}</strong> diserahkan lunas (Status berubah menjadi <strong>Cash</strong>).
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isTiketFisikDiserahkan}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Proses Pembayaran Cash (Masuk Kas)</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

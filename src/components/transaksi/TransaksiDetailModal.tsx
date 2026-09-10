import React, { useRef, useState } from 'react';
import { 
  Download, 
  ArrowLeft, 
  Receipt,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Edit3,
  Lock
} from 'lucide-react';
import { TransaksiPembelian } from '../../types';
import { formatRupiah, formatNumber, angkaTerbilang, formatDateHariBulanTahun } from '../../utils/formatters';
import { downloadElementAsPdf, printHtmlElementDirectly } from '../../utils/printDownload';
import { openPrintDocument } from '../../utils/openDedicatedPrint';
import { ConfirmModal } from '../common/ConfirmModal';
import { NotaTimbangContent } from './NotaTimbangContent';

interface TransaksiDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: TransaksiPembelian | null;
  onDeleteTransaksi?: (transaksiId: string, alasan?: string) => void;
  onOpenEditModal?: (transaksi: TransaksiPembelian) => void;
  onUpdateNotaStatus?: (transaksiId: string) => void;
  onMarkAsLunas?: (transaksiId: string) => void;
  onOpenBayarModal?: (tx: TransaksiPembelian) => void;
}

export const TransaksiDetailModal: React.FC<TransaksiDetailModalProps> = ({
  isOpen,
  onClose,
  transaksi,
  onDeleteTransaksi,
  onOpenEditModal,
  onUpdateNotaStatus,
  onMarkAsLunas,
  onOpenBayarModal,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [alasanHapus, setAlasanHapus] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen || !transaksi) return null;

  const isLunas = transaksi.status_pembayaran === 'lunas' || transaksi.metode_pembayaran === 'cash';

  const items = transaksi.items && transaksi.items.length > 0 
    ? transaksi.items 
    : [
        {
          item_id: 'item-1',
          no_bal: transaksi.no_bal,
          kode_grade: transaksi.kode_grade,
          berat_kg: transaksi.berat_kg,
          harga_per_kg: transaksi.harga_per_kg,
          total_kotor: transaksi.total_kotor || (transaksi.berat_kg * transaksi.harga_per_kg),
          potongan: transaksi.total_potongan,
          subtotal_bersih: transaksi.harga_final,
        }
      ];

  // Validation: Nota can ONLY be printed / downloaded when ALL items have price and weight > 0 AND payment is cash/lunas
  const isAllWeighed = items.length > 0 && items.every((it) => (it.berat_kg || 0) > 0 && (it.harga_per_kg || 0) > 0);
  const hasZeroWeightItem = items.some((it) => (it.berat_kg || 0) <= 0);

  const handleDownloadPdf = async () => {
    if (!isAllWeighed) {
      alert('Perhatian: Nota pembelian belum dapat diunduh/dicetak karena masih ada bal tembakau yang belum ditimbang (Proses 2 Timbang belum selesai).');
      return;
    }
    if (!receiptRef.current) return;
    setIsDownloadingPdf(true);
    try {
      await downloadElementAsPdf(
        receiptRef.current,
        `NOTA_TIMBANG_${transaksi.transaksi_id.replace(/\//g, '_')}.pdf`,
        { orientation: 'portrait' }
      );
      if (onUpdateNotaStatus) {
        onUpdateNotaStatus(transaksi.transaksi_id);
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const cleanDate = formatDateHariBulanTahun(transaksi.tanggal_transaksi);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white border border-gray-300 w-full max-w-3xl rounded-none shadow-xl flex flex-col text-xs text-gray-800 max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-[#b81d24]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                  Nota Timbang & Kasir Pembayaran
                </h2>
                {isLunas ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-sm flex items-center space-x-1 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>LUNAS (CASH)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-900 text-[10px] font-bold rounded-sm flex items-center space-x-1 border border-amber-300">
                    <Clock className="w-3 h-3 text-amber-700" />
                    <span>BELUM LUNAS (KREDIT)</span>
                  </span>
                )}
                {transaksi.status_nota === 'sudah_cetak' && (
                  <span className="text-[10px] text-gray-500 font-medium">
                    (Nota Tercetak)
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-gray-500 truncate mt-0.5">
                No. Transaksi: {transaksi.transaksi_id} • <span className="font-bold text-gray-800 whitespace-nowrap font-mono">{transaksi.no_kupon}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>

            {onOpenEditModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditModal(transaksi);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1 cursor-pointer shadow-xs"
                title="Edit / Koreksi data transaksi ini"
              >
                <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                <span>Edit</span>
              </button>
            )}

            {onDeleteTransaksi && (
              <button
                type="button"
                onClick={() => {
                  setAlasanHapus('');
                  setIsConfirmDeleteOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-sm transition flex items-center space-x-1 cursor-pointer shadow-xs"
                title="Hapus transaksi ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>

        {/* Riwayat Pengubahan Data (Audit Trail History Banner) */}
        {transaksi.terakhir_diubah_oleh && (
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-2 flex items-start space-x-2 text-gray-700 text-xs">
            <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div>
                <span className="font-semibold text-gray-900">Riwayat Pengubahan:</span> Terakhir diubah oleh <strong className="text-gray-900">{transaksi.terakhir_diubah_oleh}</strong>
                {transaksi.terakhir_diubah_pada && (
                  <span className="text-gray-500"> pada {new Date(transaksi.terakhir_diubah_pada).toLocaleString('id-ID')} WIB</span>
                )}
              </div>
              {transaksi.alasan_perubahan_terakhir && (
                <div className="text-[11px] text-gray-600 font-mono italic">
                  Alasan Koreksi: "{transaksi.alasan_perubahan_terakhir}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning if items are not weighed yet */}
        {hasZeroWeightItem && (
          <div className="bg-amber-50/80 border-b border-amber-200 px-5 py-2 flex items-center space-x-2 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Perhatian:</strong> Terdapat bal tembakau yang belum ditimbang (0 kg). Selesaikan Proses 2 Timbang agar nota dapat dicetak dan dicairkan kasir.
            </span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            {/* Tombol Cetak Nota (Terkunci jika belum lunas) */}
            {isLunas && isAllWeighed ? (
              <button
                type="button"
                onClick={() => {
                  if (onUpdateNotaStatus) onUpdateNotaStatus(transaksi.transaksi_id);
                  openPrintDocument('nota', transaksi.transaksi_id);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-sm bg-[#b81d24] hover:bg-[#a0181e] text-white flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                title="Buka Dialog Cetak / Simpan PDF Nota Resmi (Lunas)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Nota</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-3.5 py-1.5 text-xs font-medium rounded-sm bg-gray-100 border border-gray-200 text-gray-400 flex items-center space-x-1.5 cursor-not-allowed"
                title={
                  !isAllWeighed 
                    ? "Terkunci: Bal belum ditimbang lengkap" 
                    : "Terkunci: Nota baru dapat dicetak setelah status pembayaran Lunas (Cash)"
                }
              >
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span>Cetak Nota (Terkunci)</span>
              </button>
            )}

            {/* Tombol Unduh PDF (Terkunci jika belum lunas) */}
            {isLunas && isAllWeighed ? (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-sm bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                title="Unduh Berkas PDF Nota Resmi (Lunas)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloadingPdf ? 'Mengunduh...' : 'Unduh PDF'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-3.5 py-1.5 text-xs font-medium rounded-sm bg-gray-100 border border-gray-200 text-gray-400 flex items-center space-x-1.5 cursor-not-allowed"
                title={
                  !isAllWeighed 
                    ? "Terkunci: Bal belum ditimbang lengkap" 
                    : "Terkunci: PDF baru dapat diunduh setelah status pembayaran Lunas (Cash)"
                }
              >
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span>Unduh PDF (Terkunci)</span>
              </button>
            )}
          </div>

          {!isLunas && onOpenBayarModal && (
            <button
              type="button"
              onClick={() => {
                if (!isAllWeighed) {
                  alert(
                    `⚠️ Tidak Bisa Bayar!\n\nKupon ${transaksi.no_kupon} tidak dapat dibayar karena masih ada bal yang belum ditimbang di modul Timbangan.\n\nSesuai SOP, seluruh bal dalam 1 kupon harus ditimbang lengkap terlebih dahulu baru bisa lanjut ke pembayaran kasir.`
                  );
                  return;
                }
                onOpenBayarModal(transaksi);
              }}
              disabled={!isAllWeighed}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition flex items-center space-x-1.5 shadow-xs ${
                isAllWeighed
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
              title={isAllWeighed ? "Bayar Kasir (Cairkan Cash)" : "Tidak bisa bayar: seluruh bal dalam 1 kupon harus ditimbang terlebih dahulu"}
            >
              {isAllWeighed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Bayar Kasir (Cairkan Cash)</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Belum Ditimbang Lengkap (Terkunci)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Modal Body / Thermal & A4 Receipt Printable Preview */}
        <div className="p-5 overflow-y-auto bg-gray-100 flex-1">
          <div 
            ref={receiptRef}
            className="bg-white border border-gray-300 p-6 max-w-2xl mx-auto shadow-xs font-sans text-gray-900 rounded-xs"
          >
            <NotaTimbangContent transaksi={transaksi} />
          </div>
        </div>

      </div>

      {/* Konfirmasi Hapus Transaksi dengan Alasan Audit Trail */}
      {isConfirmDeleteOpen && onDeleteTransaksi && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-gray-300 rounded-sm shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Konfirmasi Hapus Transaksi</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {transaksi.no_kupon} ({transaksi.transaksi_id})
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-xs text-gray-800 space-y-1">
              <p>
                Apakah Anda yakin ingin menghapus transaksi milik Petani <strong>{transaksi.nama_petani}</strong>?
              </p>
              <p className="text-[11px] text-gray-600">
                • Berat Netto: {transaksi.berat_kg} Kg ({transaksi.total_bal || (transaksi.items ? transaksi.items.length : 1)} Bal)
                <br />
                • Total Nilai: {formatRupiah(transaksi.harga_final || transaksi.total_harga_beli)}
                <br />
                • Semua bal tembakau inventaris gudang terkait transaksi ini juga akan dihapus.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Alasan Penghapusan (Wajib untuk Audit Trail Admin):</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Salah input nomor kupon / Duplikasi / Dibatalkan petani"
                value={alasanHapus}
                onChange={(e) => setAlasanHapus(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-sm focus:ring-1 focus:ring-gray-800 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {['Salah input nomor kupon', 'Duplikasi transaksi timbangan', 'Dibatalkan oleh petani penyetor', 'Koreksi administratif'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAlasanHapus(preset)}
                    className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm border border-gray-200 transition cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmDeleteOpen(false);
                  setAlasanHapus('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaksi(transaksi.transaksi_id, alasanHapus.trim() || 'Dihapus dari popup detail transaksi');
                  setIsConfirmDeleteOpen(false);
                  setAlasanHapus('');
                  onClose();
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus & Rekam Audit Log</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

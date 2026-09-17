import React, { useRef, useState } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  FlaskConical, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { BatchPengirimanSample } from '../../types';
import { formatRupiah, formatNumber } from '../../utils/formatters';
import { downloadElementAsPdf } from '../../utils/printDownload';
import { COMPANY_NAME } from '../../config/appInfo';
import { KopSurat } from '../common/KopSurat';
import { beratBrutoItemSample } from '../../utils/beratKirim';

interface BatchSamplePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: BatchPengirimanSample | null;
}

export const BatchSamplePrintModal: React.FC<BatchSamplePrintModalProps> = ({
  isOpen,
  onClose,
  batch,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !batch) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloadingPdf(true);
    try {
      await downloadElementAsPdf(printRef.current, `Pengantar_Batch_Sample_${batch.kode_batch}`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const items = batch.items || [];
  const totalBal = items.length;
  // Dokumen untuk buyer memakai berat bruto; netto hanya untuk pembelian internal
  const totalBruto = items.reduce((sum, item) => sum + beratBrutoItemSample(item), 0);
  const totalNilaiTawaran = items.reduce((sum, item) => sum + (beratBrutoItemSample(item) * item.harga_tawaran_kg), 0);
  const totalNilaiDeal = items
    .filter(i => i.status_item === 'disetujui')
    .reduce((sum, item) => sum + (beratBrutoItemSample(item) * (item.harga_deal_kg || item.harga_tawaran_kg)), 0);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150 print:bg-white print:backdrop-blur-none print:p-0 print:block print:overflow-visible print:relative print:inset-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white border border-gray-300 w-full max-w-4xl rounded-none shadow-2xl flex flex-col max-h-[92vh] text-xs text-gray-800 print:max-h-none print:border-none print:shadow-none print:w-full print:max-w-full print:block print:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <FlaskConical className="w-4 h-4 text-[#b81d24]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">Dokumen Pengantar & Uji Sample Batch Tembakau</h2>
              <p className="text-[11px] text-gray-500 font-medium">
                No. Surat Sample: <span className="font-mono font-bold text-gray-900">{batch.kode_batch}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Dokumen</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingPdf ? 'Mengunduh...' : 'Unduh PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-sm transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper View */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-gray-100 flex justify-center">
          <div
            ref={printRef}
            className="bg-white p-6 sm:p-8 border border-gray-300 shadow-md w-full max-w-[210mm] text-xs text-gray-900 font-sans space-y-4 print:p-0 print:border-none print:shadow-none"
          >
            <KopSurat judul="Surat Pengantar Sample & Penawaran Batch" />

            {/* Metadata (gaya sama dengan Nota Pembelian) */}
            <div className="grid grid-cols-2 gap-6 border-b border-gray-200 pb-3">
              <div className="space-y-1.5 pr-2">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-gray-500">No. Surat Sample:</span>
                  <span className="font-mono font-bold text-gray-950">{batch.kode_batch}</span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-gray-500">Tanggal Kirim:</span>
                  <span className="font-mono text-gray-900">{batch.tanggal_kirim || '-'}</span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-gray-500">Pengirim:</span>
                  <span className="font-semibold text-gray-900">{batch.dikirim_oleh || '-'}</span>
                </div>
              </div>
              <div className="space-y-1.5 pl-4 border-l border-gray-200">
                <div className="flex justify-between items-start gap-3">
                  <span className="text-gray-500 shrink-0">Tujuan / Pabrik Buyer:</span>
                  <span className="font-bold text-gray-900 text-right">{batch.tujuan_buyer || '-'}</span>
                </div>
                {batch.permintaan_buyer && (
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-gray-500 shrink-0">Spesifikasi:</span>
                    <span className="text-gray-800 text-right">{batch.permintaan_buyer}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabel Bal Sample */}
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 font-semibold text-slate-600 text-xs">
                    <th className="py-2.5 px-3 w-10">No</th>
                    <th className="py-2.5 px-3">No Bal</th>
                    <th className="py-2.5 px-3">Bruto (Kg)</th>
                    <th className="py-2.5 px-3">Harga Tawar / Kg</th>
                    <th className="py-2.5 px-3">Est. Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {items.map((it, idx) => {
                    const isAcc = it.status_item === 'disetujui';
                    const bruto = beratBrutoItemSample(it);
                    const subtotal = bruto * it.harga_tawaran_kg;
                    const kodeBuyerBerbeda =
                      it.kode_bal_pembeli && it.kode_bal_pembeli.trim().toUpperCase() !== (it.no_bal || '').trim().toUpperCase();

                    return (
                      <tr key={it.sample_item_id}>
                        <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-mono font-semibold text-slate-900">{it.no_bal}</div>
                          {kodeBuyerBerbeda && (
                            <div className="text-[10px] text-slate-500">Kode buyer: <span className="font-mono">{it.kode_bal_pembeli}</span></div>
                          )}
                          <div className="text-[10px] text-slate-500">Petani: {it.nama_petani || '-'}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{formatNumber(bruto, 1)} kg</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">
                          {formatRupiah(it.harga_tawaran_kg)}
                          {isAcc && it.harga_deal_kg && it.harga_deal_kg !== it.harga_tawaran_kg && (
                            <div className="text-[10px] text-emerald-700 font-semibold">Deal: {formatRupiah(it.harga_deal_kg)}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{formatRupiah(subtotal)}</td>
                      </tr>
                    );
                  })}

                  <tr className="bg-slate-100/90 font-semibold border-t border-slate-300 text-slate-800">
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px] text-slate-700">
                      Total ({totalBal} Bal Sample):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatNumber(totalBruto, 1)} kg</td>
                    <td className="py-2.5 px-3 text-right text-[11px] text-slate-600">Total Nilai:</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatRupiah(totalNilaiTawaran)}</td>
                  </tr>
                  {totalNilaiDeal > 0 && (
                    <tr className="bg-emerald-50 font-semibold text-emerald-900">
                      <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px]">
                        Total Nilai Disetujui (Deal Final):
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-right font-mono text-emerald-800">
                        {formatRupiah(totalNilaiDeal)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Tanda Tangan (gaya sama dengan Nota Pembelian) */}
            <div className="pt-4 grid grid-cols-3 gap-4 text-center text-xs avoid-page-break">
              <div>
                <p className="text-gray-600 font-medium">Dibuat & Dikirim Oleh</p>
                <div className="h-22 flex items-end justify-center">
                  <span className="font-semibold border-b border-gray-800 pb-0.5 min-w-[130px] inline-block text-gray-900">
                    {batch.dikirim_oleh || <>&nbsp;</>}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">QC & Logistik {COMPANY_NAME}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Mengetahui</p>
                <div className="h-22 flex items-end justify-center">
                  <span className="font-semibold border-b border-gray-800 pb-0.5 min-w-[130px] inline-block text-gray-900">
                    &nbsp;
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">Kepala Gudang & Pembelian</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Diterima & Diuji Oleh</p>
                <div className="h-22 flex items-end justify-center">
                  <span className="font-semibold border-b border-gray-800 pb-0.5 min-w-[130px] inline-block text-gray-900">
                    {batch.petugas_qc_pabrik || <>&nbsp;</>}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">Tim QC / Lab Pabrik Buyer</p>
              </div>
            </div>

            <div className="text-[10px] text-gray-400 border-t border-gray-200 pt-3 text-center">
              Dokumen ini merupakan bukti sah pengiriman sample tembakau rajangan Madura dan lampiran kesepakatan spesifikasi mutu & harga sebelum penerbitan Delivery Order (Surat Jalan).
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { Printer, Download, ArrowLeft, FileText, X } from 'lucide-react';
import { PengirimanBarang, Barang, TabelHarga, TransaksiPembelian } from '../../types';
import { downloadElementAsPdf } from '../../utils/printDownload';
import { openPrintDocument } from '../../utils/openDedicatedPrint';
import { SuratJalanDokumen } from './SuratJalanDokumen';

interface SuratJalanPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  pengiriman: PengirimanBarang | null;
  barangList: Barang[];
  tabelHarga?: TabelHarga[];
  transaksiList?: TransaksiPembelian[];
}

export const SuratJalanPrintModal: React.FC<SuratJalanPrintModalProps> = ({
  isOpen,
  onClose,
  pengiriman,
  barangList = [],
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  if (!isOpen || !pengiriman) return null;

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(
        printAreaRef.current,
        `SURAT_JALAN_${pengiriman.no_surat_jalan}.pdf`,
        { orientation: 'portrait' }
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    openPrintDocument('surat_jalan', pengiriman.pengiriman_id);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white overflow-y-auto font-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white border border-gray-300 w-full max-w-4xl rounded-none shadow-2xl flex flex-col text-xs text-gray-800 print:border-none print:shadow-none print:w-full print:max-w-none max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Modal Topbar (hidden on print) */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white print:hidden">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#b81d24]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                Dokumen Surat Jalan Pengiriman / Delivery Order (DO)
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                No. DO: <span className="font-mono font-bold text-gray-900">{pengiriman.no_surat_jalan}</span> •
                Tujuan: <span className="font-semibold text-gray-800">{pengiriman.tujuan}</span>
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

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#17a2b8] hover:bg-[#138496] disabled:opacity-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title="Unduh Dokumen Surat Jalan Format PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title="Buka Halaman Cetak Surat Jalan (Pilih PDF atau Printer)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Buka Dialog Cetak / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-sm hover:bg-gray-100 transition cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lembar dokumen: tiap halaman tampil sebagai kertas terpisah, sama seperti Nota Pembelian */}
        <div className="p-4 sm:p-6 md:p-8 bg-[#f8f9fa] overflow-y-auto flex-1 print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printAreaRef}
            id="printable-surat-jalan"
            className="mx-auto w-full max-w-3xl text-gray-900 font-sans"
          >
            <SuratJalanDokumen pengiriman={pengiriman} barangList={barangList} />
          </div>
        </div>

      </div>
    </div>
  );
};

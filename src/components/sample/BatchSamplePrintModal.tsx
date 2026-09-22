import React, { useState } from 'react';
import { Printer, FileSpreadsheet, X, FlaskConical } from 'lucide-react';
import { BatchPengirimanSample } from '../../types';
import { unduhSuratSampleExcel } from '../../utils/excelSuratSample';
import { openPrintDocument } from '../../utils/openDedicatedPrint';
import { SuratSampleDokumen } from './SuratSampleDokumen';

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
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

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

  // Cetak lewat halaman cetak khusus agar pembagian halamannya rapi
  const handlePrint = () => {
    openPrintDocument('sample', batch.batch_id);
  };

  const handleDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      await unduhSuratSampleExcel(batch);
    } catch (err) {
      console.error('Excel export error:', err);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

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
              <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">Surat Pengiriman Sample</h2>
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
              onClick={handleDownloadExcel}
              disabled={isDownloadingExcel}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Unduh surat sample dalam format Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isDownloadingExcel ? 'Mengunduh...' : 'Unduh Excel'}</span>
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

        {/* Lembar dokumen: tiap halaman tampil sebagai kertas terpisah, sama seperti Nota Pembelian */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-gray-100">
          <div className="mx-auto w-full max-w-3xl text-gray-900 font-sans">
            <SuratSampleDokumen batch={batch} />
          </div>
        </div>

      </div>
    </div>
  );
};

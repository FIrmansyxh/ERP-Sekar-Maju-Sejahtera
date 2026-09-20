import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  CheckCircle2, 
  AlertCircle,
  Lock,
  Truck,
  Building2,
  Calendar,
  UserCheck
} from 'lucide-react';
import { 
  loadTransaksiData, 
  loadPengirimanData, 
  loadBarangData, 
  loadBatchSampleData,
  loadPetaniData,
  loadCurrentUser
} from '../../utils/storage';
import { 
  TransaksiPembelian, 
  PengirimanBarang, 
  BatchPengirimanSample,
  Barang, 
  Petani, 
  TabelHarga 
} from '../../types';
import { downloadElementAsPdf } from '../../utils/printDownload';
import { NotaTimbangContent } from '../transaksi/NotaTimbangContent';
import { SuratJalanDokumen } from '../pengiriman/SuratJalanDokumen';
import { SuratSampleDokumen } from '../sample/SuratSampleDokumen';

export interface DedicatedPrintViewProps {
  type: 'nota' | 'surat_jalan' | 'sample' | 'bon_produksi';
  id: string;
  onClose?: () => void;
  isEmbedded?: boolean;
  transaksiList?: TransaksiPembelian[];
  pengirimanList?: PengirimanBarang[];
  batchSampleList?: BatchPengirimanSample[];
  barangList?: Barang[];
  petaniList?: Petani[];
  tabelHarga?: TabelHarga[];
}

export const DedicatedPrintView: React.FC<DedicatedPrintViewProps> = ({
  type,
  id,
  onClose,
  isEmbedded = true,
  transaksiList: propTransaksiList,
  pengirimanList: propPengirimanList,
  batchSampleList: propBatchSampleList,
  barangList: propBarangList,
  petaniList: propPetaniList,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Load Data with fallback to local storage
  const activeTransaksiList = useMemo(() => {
    return propTransaksiList && propTransaksiList.length > 0
      ? propTransaksiList
      : loadTransaksiData();
  }, [propTransaksiList]);

  const activePengirimanList = useMemo(() => {
    return propPengirimanList && propPengirimanList.length > 0
      ? propPengirimanList
      : loadPengirimanData();
  }, [propPengirimanList]);

  const activeBatchSampleList = useMemo(() => {
    return propBatchSampleList && propBatchSampleList.length > 0
      ? propBatchSampleList
      : loadBatchSampleData();
  }, [propBatchSampleList]);

  const activeBarangList = useMemo(() => {
    return propBarangList && propBarangList.length > 0
      ? propBarangList
      : loadBarangData();
  }, [propBarangList]);

  const activePetaniList = useMemo(() => {
    return propPetaniList && propPetaniList.length > 0
      ? propPetaniList
      : loadPetaniData();
  }, [propPetaniList]);


  // Find exact document
  const cleanId = (id || '').trim();

  const foundTransaksi = useMemo(() => {
    if (type !== 'nota') return null;
    return (
      activeTransaksiList.find((tx) => tx.transaksi_id === cleanId) ||
      activeTransaksiList.find((tx) => tx.no_kupon === cleanId) ||
      activeTransaksiList.find((tx) => (tx.items || []).some((it) => it.no_bal === cleanId)) ||
      // Fallback in case ID was converted from TRX-YYYYMMDD to TRX-DDMMYYYY
      activeTransaksiList.find((tx) => {
        const ymdMatch = cleanId.match(/^TRX-(\d{4})(\d{2})(\d{2})/);
        if (ymdMatch) {
          const [, y, m, d] = ymdMatch;
          return tx.transaksi_id.startsWith(`TRX-${d}${m}${y}`);
        }
        return false;
      }) ||
      null
    );
  }, [activeTransaksiList, type, cleanId]);

  const foundPengiriman = useMemo(() => {
    if (type !== 'surat_jalan') return null;
    return (
      activePengirimanList.find((p) => p.pengiriman_id === cleanId) ||
      activePengirimanList.find((p) => p.no_surat_jalan === cleanId) ||
      activePengirimanList.find((p) => (p.barang_ids || []).includes(cleanId)) ||
      null
    );
  }, [activePengirimanList, type, cleanId]);

  const foundBatch = useMemo(() => {
    if (type !== 'sample') return null;
    return (
      activeBatchSampleList.find((b) => b.batch_id === cleanId) ||
      activeBatchSampleList.find((b) => b.kode_batch === cleanId) ||
      null
    );
  }, [activeBatchSampleList, type, cleanId]);

  // Document Title for Tab / Save As
  const docTitle = useMemo(() => {
    if (type === 'nota' && foundTransaksi) {
      return `Nota Timbang & Pembelian - ${foundTransaksi.no_kupon}`;
    }
    if (type === 'surat_jalan' && foundPengiriman) {
      return foundPengiriman.jenis_pengeluaran === 'produksi_sendiri'
        ? `Bon Pemakaian Produksi - ${foundPengiriman.no_surat_jalan}`
        : `Surat Jalan Pengiriman DO - ${foundPengiriman.no_surat_jalan}`;
    }
    if (type === 'sample' && foundBatch) {
      return `Surat Pengantar Sample - ${foundBatch.kode_batch}`;
    }
    return `Dokumen Cetak - ${id}`;
  }, [type, foundTransaksi, foundPengiriman, foundBatch, id]);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = docTitle;
    return () => {
      document.title = originalTitle;
    };
  }, [docTitle]);

  // Keyboard shortcut listener (Escape to close, Ctrl+P to trigger print)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Action: Trigger browser print dialog (for connected physical printer)
  const handleTriggerPrint = () => {
    window.print();
  };

  // Action: Generate and download element directly as PDF
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    
    // TEMPORARY FIX FOR HTML2CANVAS WITH SCALED ELEMENTS
    // html2canvas gets very confused and crops the image if the element has transform: scale()
    // So we temporarily disable the transform during generation.
    const originalTransform = printAreaRef.current.style.transform;
    printAreaRef.current.style.transform = 'none';

    try {
      const aman = (teks: string) => teks.replace(/[/\\?%*:|"<>]/g, '_');
      const filename =
        type === 'nota' && foundTransaksi
          ? `NOTA_TIMBANG_${aman(foundTransaksi.no_kupon)}.pdf`
          : type === 'sample'
          ? `SURAT_SAMPLE_${aman(foundBatch?.kode_batch || id)}.pdf`
          : `SURAT_JALAN_${aman(foundPengiriman?.no_surat_jalan || id)}.pdf`;

      const judulLanjutan =
        type === 'nota' && foundTransaksi
          ? `Nota Pembelian ${foundTransaksi.no_kupon}`
          : type === 'sample'
          ? `Surat Sample ${foundBatch?.kode_batch || ''}`.trim()
          : `Surat Jalan ${foundPengiriman?.no_surat_jalan || ''}`.trim();
      await downloadElementAsPdf(printAreaRef.current, filename, { orientation: 'portrait', judulLanjutan });
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback to browser print dialog if html2canvas/jspdf fails
      window.print();
    } finally {
      // Restore original transform
      if (printAreaRef.current) {
        printAreaRef.current.style.transform = originalTransform;
      }
      setIsGeneratingPdf(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      try {
        window.close();
      } catch {
        window.location.href = window.location.origin + window.location.pathname;
      }
    }
  };

  // NOT FOUND STATE
  if ((type === 'nota' && !foundTransaksi) || (type === 'surat_jalan' && !foundPengiriman) || (type === 'sample' && !foundBatch)) {
    return (
      <div className="print-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-sans">
        <div className="bg-white border border-gray-300 rounded-none p-6 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3 text-[#b81d24]">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-gray-900 mb-1">
            Data Dokumen Tidak Ditemukan
          </h2>
          <p className="text-xs text-gray-600 mb-4">
            Dokumen <strong>{type === 'nota' ? 'Nota' : type === 'sample' ? 'Surat Sample' : 'Surat Jalan'}</strong> dengan nomor identitas{' '}
            <span className="font-mono font-bold text-gray-800 bg-gray-100 px-1 py-0.5 rounded-xs">
              {id}
            </span>{' '}
            belum tersimpan atau tidak ditemukan dalam basis data.
          </p>
          <div className="flex justify-center space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer shadow-xs"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>
    );
  }

  // UNPAID LOCK STATE FOR NOTA (Nota can ONLY be printed when status is Lunas)
  const isNotaLunas = foundTransaksi 
    ? (foundTransaksi.status_pembayaran === 'lunas' || foundTransaksi.metode_pembayaran === 'cash')
    : false;

  if (type === 'nota' && foundTransaksi && !isNotaLunas) {
    return (
      <div className="print-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-sans">
        <div className="bg-white border border-gray-300 rounded-none p-6 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-700">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-gray-900 mb-1">
            Dokumen Nota Timbang Terkunci
          </h2>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Nota untuk transaksi kupon <strong className="text-gray-900 font-mono">{foundTransaksi.no_kupon}</strong> ({foundTransaksi.nama_petani}) belum dapat dicetak atau diunduh karena status pembayaran masih <strong>KREDIT / BELUM LUNAS</strong>.
            <br className="my-1" />
            Tombol cetak baru akan terbuka setelah transaksi diselesaikan dan dilunasi di loket kasir.
          </p>
          <div className="flex justify-center space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer shadow-xs"
            >
              Kembali / Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="print-modal-backdrop fixed inset-0 z-[9999] flex flex-col bg-[#f8f9fa] font-sans text-gray-900 select-none">

      {/* Top Header & Main Action Bar (Hidden on print) */}
      <header className="no-print bg-white border-b border-gray-200 shadow-xs px-4 py-3 shrink-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">

          {/* Left: Document Info Badge */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#b81d24]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold tracking-tight text-gray-900 truncate">
                  {type === 'nota'
                    ? 'Pratinjau Nota Pembelian & Kasir'
                    : type === 'sample'
                    ? 'Pratinjau Surat Pengantar Sample'
                    : foundPengiriman?.jenis_pengeluaran === 'produksi_sendiri'
                    ? 'Pratinjau Bon Pemakaian Produksi (BPP)'
                    : 'Pratinjau Surat Jalan Pengiriman (DO)'}
                </h1>
                <span className="bg-red-50 text-[#b81d24] border border-red-200 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm">
                  {type === 'nota' ? foundTransaksi?.no_kupon : type === 'sample' ? foundBatch?.kode_batch : foundPengiriman?.no_surat_jalan}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium hidden sm:block">
                Periksa dokumen, lalu klik <strong className="text-gray-800">Download PDF</strong> untuk menyimpan berkas ke komputer.
              </p>
            </div>
          </div>

          {/* Center: Zoom Controls */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-white border border-gray-300 rounded-sm px-2 py-1 text-gray-600 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.max(0.7, Number((prev - 0.1).toFixed(1))))}
              className="p-1 hover:bg-gray-100 rounded-xs transition cursor-pointer text-gray-500 hover:text-gray-900"
              title="Zoom Out (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] min-w-[42px] text-center font-bold text-gray-800">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.min(1.3, Number((prev + 0.1).toFixed(1))))}
              className="p-1 hover:bg-gray-100 rounded-xs transition cursor-pointer text-gray-500 hover:text-gray-900"
              title="Zoom In (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              className="p-1 hover:bg-gray-100 rounded-xs transition cursor-pointer text-gray-400 hover:text-gray-700 ml-0.5"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Right: Tutup + Download PDF */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Tutup Pratinjau (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Unduh dokumen dalam format PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Printable Document Canvas */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100 flex justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible">
        <div
          ref={printAreaRef}
          // Nota, Surat Jalan, dan Surat Sample terdiri dari lembar-lembar berkertas sendiri (lihat .nota-sheet)
          className="print-canvas-paper mx-auto w-full max-w-[980px] print:max-w-none text-slate-900 font-sans print:m-0 transition-transform duration-100"
          style={{
            transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
            transformOrigin: 'top center'
          }}
        >
          {type === 'nota' && foundTransaksi && (
            <NotaTimbangContent 
              transaksi={foundTransaksi} 
            />
          )}

          {type === 'surat_jalan' && foundPengiriman && (
            <SuratJalanDokumen
              pengiriman={foundPengiriman}
              barangList={activeBarangList}
            />
          )}

          {type === 'sample' && foundBatch && <SuratSampleDokumen batch={foundBatch} />}
        </div>
      </main>

    </div>
  );
};

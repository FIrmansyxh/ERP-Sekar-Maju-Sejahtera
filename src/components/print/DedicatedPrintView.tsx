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
  loadPetaniData, 
  loadHargaData 
} from '../../utils/storage';
import { 
  TransaksiPembelian, 
  PengirimanBarang, 
  Barang, 
  Petani, 
  TabelHarga 
} from '../../types';
import { 
  formatRupiah, 
  formatDateHariBulanTahun, 
  formatNumber, 
  terbilangRupiah 
} from '../../utils/formatters';
import { downloadElementAsPdf } from '../../utils/printDownload';
import { NotaTimbangContent } from '../transaksi/NotaTimbangContent';

export interface DedicatedPrintViewProps {
  type: 'nota' | 'surat_jalan' | 'sample' | 'bon_produksi';
  id: string;
  onClose?: () => void;
  isEmbedded?: boolean;
  transaksiList?: TransaksiPembelian[];
  pengirimanList?: PengirimanBarang[];
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
  barangList: propBarangList,
  petaniList: propPetaniList,
  tabelHarga: propTabelHarga,
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

  const activeTabelHarga = useMemo(() => {
    return propTabelHarga && propTabelHarga.length > 0
      ? propTabelHarga
      : loadHargaData();
  }, [propTabelHarga]);

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

  // Document Title for Tab / Save As
  const docTitle = useMemo(() => {
    if (type === 'nota' && foundTransaksi) {
      return `Nota Timbang & Pembelian - ${foundTransaksi.transaksi_id} (${foundTransaksi.no_kupon})`;
    }
    if (type === 'surat_jalan' && foundPengiriman) {
      return foundPengiriman.jenis_pengeluaran === 'produksi_sendiri'
        ? `Bon Pemakaian Produksi - ${foundPengiriman.no_surat_jalan}`
        : `Surat Jalan Pengiriman DO - ${foundPengiriman.no_surat_jalan}`;
    }
    return `Dokumen Cetak - ${id}`;
  }, [type, foundTransaksi, foundPengiriman, id]);

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
      const filename =
        type === 'nota' && foundTransaksi
          ? `NOTA_TIMBANG_${foundTransaksi.transaksi_id.replace(/[/\\?%*:|"<>]/g, '_')}_${foundTransaksi.no_kupon}.pdf`
          : `SURAT_JALAN_${(foundPengiriman?.no_surat_jalan || id).replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;

      await downloadElementAsPdf(printAreaRef.current, filename, { orientation: 'portrait' });
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
  if ((type === 'nota' && !foundTransaksi) || (type === 'surat_jalan' && !foundPengiriman)) {
    return (
      <div className="print-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm font-sans">
        <div className="bg-white border border-slate-300 rounded-sm p-6 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-150">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Data Dokumen Tidak Ditemukan
          </h2>
          <p className="text-xs text-slate-600 mb-4">
            Dokumen <strong>{type === 'nota' ? 'Nota' : 'Surat Jalan'}</strong> dengan nomor identitas{' '}
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1 py-0.5 rounded-xs">
              {id}
            </span>{' '}
            belum tersimpan atau tidak ditemukan dalam basis data.
          </p>
          <div className="flex justify-center space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xs transition cursor-pointer shadow-sm"
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
      <div className="print-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm font-sans">
        <div className="bg-white border border-amber-300 rounded-sm p-6 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3 text-amber-700">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Dokumen Nota Timbang Terkunci
          </h2>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Nota untuk transaksi kupon <strong className="text-slate-900 font-mono">{foundTransaksi.no_kupon}</strong> ({foundTransaksi.nama_petani}) belum dapat dicetak atau diunduh karena status pembayaran masih <strong>KREDIT / BELUM LUNAS</strong>.
            <br className="my-1" />
            Tombol cetak baru akan terbuka setelah transaksi diselesaikan dan dilunasi di loket kasir.
          </p>
          <div className="flex justify-center space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xs transition cursor-pointer shadow-sm"
            >
              Kembali / Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="print-modal-backdrop fixed inset-0 z-[9999] flex flex-col bg-slate-950/80 backdrop-blur-sm font-sans text-slate-900 select-none">
      
      {/* Top Header & Main Action Bar (Hidden on print) */}
      <header className="no-print bg-[#1e293b] text-white border-b border-slate-700 shadow-lg px-4 py-2.5 shrink-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left: Document Info Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-sm bg-[#b81d24] text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
              SMS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>
                    {type === 'nota'
                      ? 'Pratinjau Nota Pembelian & Kasir'
                      : foundPengiriman?.jenis_pengeluaran === 'produksi_sendiri'
                      ? 'Pratinjau Bon Pemakaian Produksi (BPP)'
                      : 'Pratinjau Surat Jalan Pengiriman (DO)'}
                  </span>
                </h1>
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono px-1.5 py-0.5 rounded-xs">
                  {type === 'nota' ? foundTransaksi?.no_kupon : foundPengiriman?.no_surat_jalan}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                Pilih opsi di sebelah kanan: <strong className="text-cyan-300">Download PDF</strong> untuk menyimpan berkas ke komputer.
              </p>
            </div>
          </div>

          {/* Center: Zoom Controls */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700 rounded-sm px-2 py-1 text-slate-300 text-xs">
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.max(0.7, Number((prev - 0.1).toFixed(1))))}
              className="p-1 hover:bg-slate-700 rounded-xs transition cursor-pointer text-slate-300 hover:text-white"
              title="Zoom Out (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] min-w-[42px] text-center font-bold text-slate-200">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.min(1.3, Number((prev + 0.1).toFixed(1))))}
              className="p-1 hover:bg-slate-700 rounded-xs transition cursor-pointer text-slate-300 hover:text-white"
              title="Zoom In (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              className="p-1 hover:bg-slate-700 rounded-xs transition cursor-pointer text-slate-400 hover:text-slate-200 ml-0.5"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Right: The Two Primary Action Choices (Download PDF vs Cetak Print) + Close */}
          <div className="flex items-center space-x-2 shrink-0">
            
            {/* OPSI 1: CETAK JADI PDF (DOWNLOAD PDF) */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#007bff] hover:bg-[#0069d9] active:bg-[#0056b3] text-white rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              title="Cetak Jadi PDF (Unduh berkas PDF langsung ke komputer)"
            >
              <Download className="w-4 h-4 text-cyan-200" />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
            </button>

            {/* TOMBOL TUTUP */}
            <button
              type="button"
              onClick={handleClose}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-sm transition flex items-center space-x-1 cursor-pointer"
              title="Tutup Pratinjau (Esc)"
            >
              <X className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          </div>
        </div>
      </header>

      {/* Guidance Sub-bar (Hidden on print) */}
      <div className="no-print bg-slate-900/90 border-b border-slate-800 px-4 py-1.5 text-center text-xs text-slate-300 font-medium">
        <span>
          Silakan tentukan pilihan:{' '}
          <strong className="text-cyan-300 font-bold">Download PDF</strong> untuk mengunduh dan menyimpan dokumen.
        </span>
      </div>

      {/* Scrollable Printable Document Canvas */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-800/60 flex justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible">
        <div
          ref={printAreaRef}
          className="print-canvas-paper bg-white border border-slate-300 print:border-none shadow-2xl print:shadow-none p-6 sm:p-8 mx-auto w-full max-w-[820px] text-slate-900 font-sans print:m-0 transition-transform duration-100"
          style={{ 
            minHeight: '1050px',
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
            <SuratJalanContent
              pengiriman={foundPengiriman}
              barangList={activeBarangList}
              tabelHarga={activeTabelHarga}
            />
          )}
        </div>
      </main>

    </div>
  );
};

// ==========================================
// SURAT JALAN PENGIRIMAN (DO) COMPONENT
// ==========================================
interface SuratJalanContentProps {
  pengiriman: PengirimanBarang;
  barangList: Barang[];
  tabelHarga: TabelHarga[];
}

const SuratJalanContent: React.FC<SuratJalanContentProps> = ({
  pengiriman,
  barangList,
  tabelHarga,
}) => {
  const barangIds = pengiriman.barang_ids || [];
  const barcodeList = pengiriman.barcode_list || [];

  const balDetails = barangIds.map((id, index) => {
    const found = barangList.find((b) => b.barang_id === id);
    const barcodeVal = barcodeList[index] || (found ? found.barcode || found.barang_id : id);
    const grade = found?.kode_grade || 'A';
    const berat =
      found?.berat_kg ||
      (pengiriman.total_berat_kg ? pengiriman.total_berat_kg / (pengiriman.total_bal || 1) : 45);

    let pricePerKg = pengiriman.harga_deal_map?.[id] || 0;
    if (!pricePerKg || pricePerKg <= 0) {
      const fromTable = tabelHarga.find((t) => t.kode_grade?.toUpperCase() === grade.toUpperCase());
      pricePerKg = fromTable?.harga_per_kg || 100000;
    }

    const subtotal = Math.round(berat * pricePerKg);

    return {
      id,
      no_bal: found?.no_bal || barcodeVal,
      kode_grade: grade,
      berat_kg: berat,
      harga_per_kg: pricePerKg,
      total_harga: subtotal,
    };
  });

  const totalItemsCount = balDetails.length;
  const grandTotalBerat = balDetails.reduce((sum, b) => sum + b.berat_kg, 0);
  const grandTotalNilai = balDetails.reduce((sum, b) => sum + b.total_harga, 0);

  return (
    <div className="space-y-4 text-xs text-slate-900 font-sans">
      {/* Header Kop Surat Resmi */}
      <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-[#b81d24] text-white font-black flex items-center justify-center text-xs shadow-2xs">
              SMS
            </div>
            <h1 className="text-base font-black tracking-tight text-[#b81d24] uppercase">
              PR. SEKAR MAJU SEJAHTERA
            </h1>
          </div>
          <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
            PABRIK ROKOK & PENGOLAHAN TEMBAKAU RAJANG MADURA
          </div>
          <div className="text-[10px] text-slate-600 leading-tight">
            Jl. Raya Proppo No. 88, Kec. Proppo, Kab. Pamekasan, Jawa Timur 69363
            <br />
            Telp: (0324) 321889 / 0812-3456-7890 • NPWP: 01.234.567.8-608.000
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="inline-block bg-[#b81d24] text-white px-2.5 py-1 text-xs font-black uppercase tracking-wider shadow-2xs">
            {pengiriman.jenis_pengeluaran === 'produksi_sendiri' ? 'BON PEMAKAIAN PRODUKSI (BPP)' : 'SURAT JALAN PENGIRIMAN (DO)'}
          </div>
          <div className="text-xs font-mono font-bold text-slate-900">
            No: <span className="text-[#b81d24]">{pengiriman.no_surat_jalan}</span>
          </div>
          <div className="text-[10.5px] text-slate-600 font-medium">
            Tgl Kirim: <span className="font-mono font-bold text-slate-800">{pengiriman.tanggal_kirim}</span>
          </div>
        </div>
      </div>

      {/* Meta Details Grid */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-300 text-xs">
        <div className="space-y-1.5">
          <div className="border-b border-slate-200 pb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Pabrik Rekanan / Tujuan Kirim:
            </span>
            <span className="font-bold text-sm text-slate-900 block leading-tight">
              {pengiriman.tujuan}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
            <div>
              <span className="text-slate-500 text-[10px] block">Gudang Pengirim:</span>
              <span className="font-semibold text-slate-800">Gudang Pusat Pamekasan</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Status Dokumen:</span>
              <span className="font-bold text-emerald-800">Sah & Berlaku</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 border-l border-slate-200 pl-3">
          <div className="border-b border-slate-200 pb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Armada & Pengemudi:
            </span>
            <span className="font-bold text-sm text-slate-900 block leading-tight">
              {pengiriman.driver_nama || 'Supir Ekspedisi'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
            <div>
              <span className="text-slate-500 text-[10px] block">No. Polisi (Plat):</span>
              <span className="font-mono font-black text-slate-900">{pengiriman.plat_nomor || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Petugas Logistik:</span>
              <span className="font-semibold text-slate-800">
                {pengiriman.petugas || 'Admin Ekspedisi'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Items Table */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Rincian Muatan Bal Tembakau & Nilai Pengiriman
          </h3>
          <span className="text-[11px] font-mono text-slate-600">
            Total Muatan: <strong>{totalItemsCount} Bal</strong> ({formatNumber(grandTotalBerat)} kg)
          </span>
        </div>

        <table className="w-full text-xs text-left border-collapse border border-slate-400 table-fixed">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-900 text-[11px]">
              <th className="p-2 border border-slate-300 text-center w-[6%]">No</th>
              <th className="p-2 border border-slate-300 w-[22%]">No Bal / Barcode</th>
              <th className="p-2 border border-slate-300 text-center w-[12%]">Grade</th>
              <th className="p-2 border border-slate-300 text-right w-[18%]">Berat Netto</th>
              <th className="p-2 border border-slate-300 text-right w-[21%]">Harga / Kg</th>
              <th className="p-2 border border-slate-300 text-right w-[21%]">Total Nilai</th>
            </tr>
          </thead>
          <tbody>
            {balDetails.map((b, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                <td className="p-1.5 border border-slate-300 text-center font-mono text-slate-600">
                  {idx + 1}
                </td>
                <td className="p-1.5 border border-slate-300 font-mono font-bold text-slate-900 truncate" title={b.no_bal}>
                  {b.no_bal}
                </td>
                <td className="p-1.5 border border-slate-300 text-center font-bold">
                  Grade {b.kode_grade}
                </td>
                <td className="p-1.5 border border-slate-300 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                  {b.berat_kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                </td>
                <td className="p-1.5 border border-slate-300 text-right font-mono text-slate-700 whitespace-nowrap">
                  {formatRupiah(b.harga_per_kg)}
                </td>
                <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                  {formatRupiah(b.total_harga)}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
              <td colSpan={3} className="p-2 border border-slate-300 text-right uppercase text-[11px]">
                TOTAL {totalItemsCount} BAL:
              </td>
              <td className="p-2 border border-slate-300 text-right font-mono font-black text-slate-950 text-xs whitespace-nowrap">
                {formatNumber(grandTotalBerat)} kg
              </td>
              <td className="p-2 border border-slate-300 text-right font-mono text-slate-600 text-[10.5px] whitespace-nowrap">
                Rata-rata: {formatRupiah(grandTotalBerat > 0 ? Math.round(grandTotalNilai / grandTotalBerat) : 0)}
              </td>
              <td className="p-2 border border-slate-300 text-right font-mono font-black text-[#b81d24] text-xs whitespace-nowrap">
                {formatRupiah(grandTotalNilai)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Terbilang Box */}
      <div className="p-2.5 bg-slate-50 border border-slate-300 text-xs flex items-start space-x-2">
        <span className="font-bold text-slate-700 shrink-0">Terbilang:</span>
        <span className="italic font-semibold text-slate-900 capitalize">
          {terbilangRupiah(grandTotalNilai)}
        </span>
      </div>

      {/* Signature Blocks */}
      {/* Signature Grid */}
      <div className="pt-4 grid grid-cols-3 gap-4 text-center text-xs avoid-page-break">
        <div>
          <p className="text-slate-600 font-medium">Petugas Logistik / Pengirim</p>
          <div className="h-16 flex items-end justify-center">
            <span className="font-bold border-b border-slate-900 pb-0.5 min-w-[130px] inline-block">
              {pengiriman.petugas || <>&nbsp;</>}
            </span>
          </div>
        </div>
        <div>
          <p className="text-slate-600 font-medium">Pengemudi / Supir Ekspedisi</p>
          <div className="h-16 flex items-end justify-center">
            <span className="font-bold border-b border-slate-900 pb-0.5 min-w-[130px] inline-block">
              {pengiriman.driver_nama || <>&nbsp;</>}
            </span>
          </div>
        </div>
        <div>
          <p className="text-slate-600 font-medium">Penerima Gudang Pabrik</p>
          <div className="h-16 flex items-end justify-center">
            <span className="font-bold border-b border-slate-900 pb-0.5 min-w-[130px] inline-block">
              {pengiriman.penerima || <>&nbsp;</>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

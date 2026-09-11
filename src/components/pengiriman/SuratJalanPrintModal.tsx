import React, { useRef, useState } from 'react';
import { 
  Printer, 
  Download, 
  ArrowLeft,
  FileText,
  Truck,
  CheckCircle2,
  Building2,
  Calendar,
  DollarSign,
  Scale,
  X
} from 'lucide-react';
import { PengirimanBarang, Barang, TabelHarga, TransaksiPembelian } from '../../types';
import { downloadElementAsPdf, printHtmlElementDirectly } from '../../utils/printDownload';
import { openPrintDocument } from '../../utils/openDedicatedPrint';
import { formatNumber, formatRupiah, angkaTerbilang } from '../../utils/formatters';

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
  tabelHarga = [],
  transaksiList = [],
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

  // Helper to lookup default unit price by grade
  const getDefaultPriceByGrade = (grade: string): number => {
    const clean = (grade || 'A').toUpperCase().trim();
    const fromTable = tabelHarga.find((t) => t.kode_grade?.toUpperCase() === clean);
    if (fromTable && fromTable.harga_per_kg > 0) return fromTable.harga_per_kg;

    switch (clean) {
      case 'A':
      case 'A1':
      case 'A+':
        return 140000;
      case 'B':
      case 'B+':
        return 120000;
      case 'C':
        return 100000;
      case 'D':
        return 80000;
      case 'E':
        return 60000;
      case 'F':
        return 40000;
      default:
        return 100000;
    }
  };

  const barangIds = pengiriman.barang_ids || [];
  const barcodeList = pengiriman.barcode_list || [];

  // Map and calculate exact price, weight, and subtotal per bal
  const balDetails = barangIds.map((id, index) => {
    const found = barangList.find((b) => b.barang_id === id);
    const barcodeVal = barcodeList[index] || (found ? found.barcode || found.barang_id : id);
    const grade = found?.kode_grade || 'A';
    const berat = found?.berat_kg || (pengiriman.total_berat_kg ? pengiriman.total_berat_kg / (pengiriman.total_bal || 1) : 45);
    
    // Priority 1: Agreed deal price from Sample Batch negotiation
    let pricePerKg = pengiriman.harga_deal_map?.[id];
    
    // If no deal price is provided for DO, default to 0 to prevent leaking buy price
    if (!pricePerKg || pricePerKg <= 0) {
      pricePerKg = 0;
    }

    const subtotal = Math.round(berat * pricePerKg);

    const kodeHarga = pengiriman.kode_harga_jual_map?.[id];
    const displayGrade = kodeHarga || grade;
    const keteranganStr = `Tembakau Madura Grade ${displayGrade}`;

    return {
      barang_id: id,
      no_bal: found?.no_bal || `BAL-${String(index + 1).padStart(3, '0')}`,
      barcode: barcodeVal,
      kode_grade: typeof displayGrade !== 'undefined' ? displayGrade : grade,
      berat_kg: berat,
      harga_per_kg: pricePerKg,
      total_harga: subtotal,
      keterangan: keteranganStr,
    };
  });

  // Calculate Aggregates
  const totalItemsCount = balDetails.length > 0 ? balDetails.length : pengiriman.total_bal || 1;
  const grandTotalBerat = balDetails.reduce((acc, curr) => acc + curr.berat_kg, 0) || pengiriman.total_berat_kg || 0;
  const grandTotalNilai = balDetails.reduce((acc, curr) => acc + curr.total_harga, 0) || (grandTotalBerat * 110000);
  const averageHargaPerKg = grandTotalBerat > 0 ? Math.round(grandTotalNilai / grandTotalBerat) : 0;
  const terbilangStr = angkaTerbilang(grandTotalNilai);

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#b81d24]/50 flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white overflow-y-auto font-sans animate-in fade-in duration-150"
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

        {/* Printable Document Area */}
        <div className="p-4 sm:p-6 md:p-8 bg-[#f8f9fa] overflow-y-auto flex-1 print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printAreaRef}
            id="printable-surat-jalan"
            className="bg-white p-6 sm:p-8 border border-gray-300 shadow-sm max-w-3xl mx-auto text-gray-900 print:border-none print:shadow-none print:p-0 font-sans"
            style={{ minHeight: '840px' }}
          >
            {/* Header Kop Surat Jalan Resmi */}
            <div className="border-b-2 border-[#b81d24] pb-3 mb-4 flex justify-between items-start">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-[#b81d24] text-white font-black flex items-center justify-center text-xs">
                    SMS
                  </div>
                  <div>
                    <h1 className="text-base font-black tracking-tight text-[#b81d24] uppercase">
                      PR. SEKAR MAJU SEJAHTERA
                    </h1>
                  </div>
                </div>
                <div className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                  PABRIK ROKOK & PENGOLAHAN TEMBAKAU RAJANG MADURA
                </div>
                <div className="text-[10px] text-gray-600 leading-tight">
                  Jl. Raya Proppo No. 88, Kec. Proppo, Kab. Pamekasan, Jawa Timur 69363
                  <br />
                  Telp: (0324) 321889 / 0812-3456-7890 • NPWP: 01.234.567.8-608.000
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block bg-[#b81d24] text-white px-2.5 py-1 text-xs font-black uppercase tracking-wider">
                  SURAT JALAN PENGIRIMAN (DO)
                </div>
                <div className="text-xs font-mono font-bold text-gray-900">
                  No: <span className="text-[#b81d24]">{pengiriman.no_surat_jalan}</span>
                </div>
                <div className="text-[10.5px] text-gray-600 font-medium">
                  Tgl Kirim: <span className="font-mono font-bold text-gray-800">{pengiriman.tanggal_kirim}</span>
                </div>
              </div>
            </div>

            {/* Meta Details Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-300 text-xs mb-4">
              {/* Kolom Kiri: Tujuan & Kontrak */}
              <div className="space-y-1.5">
                <div className="border-b border-gray-200 pb-1">
                  <span className="text-[10px] font-bold uppercase text-gray-500 block">Pabrik Rekanan / Tujuan Kirim:</span>
                  <span className="font-bold text-sm text-gray-900 block leading-tight">{pengiriman.tujuan}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                  
                  <div>
                    <span className="text-gray-500 text-[10px] block">Gudang Pengirim:</span>
                    <span className="font-semibold text-gray-800">Gudang Pusat Pamekasan</span>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Ekspedisi & Kendaraan */}
              <div className="space-y-1.5 border-l border-gray-200 pl-3">
                <div className="border-b border-gray-200 pb-1">
                  <span className="text-[10px] font-bold uppercase text-gray-500 block">Armada & Pengemudi:</span>
                  <span className="font-bold text-sm text-gray-900 block leading-tight">{pengiriman.driver_nama || 'Supir Ekspedisi'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                  <div>
                    <span className="text-gray-500 text-[10px] block">No. Polisi (Plat):</span>
                    <span className="font-mono font-black text-gray-900">{pengiriman.plat_nomor || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Petugas Logistik:</span>
                    <span className="font-semibold text-gray-800">{pengiriman.petugas || 'Admin Ekspedisi'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Items Table with Detail Berat, Harga, and Total */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center space-x-1.5">
                  <span>Rincian Muatan Bal Tembakau & Nilai Pengiriman</span>
                </h3>
                <span className="text-[11px] font-mono text-gray-600">
                  Total Muatan: <strong>{totalItemsCount} Bal</strong> ({formatNumber(grandTotalBerat)} kg)
                </span>
              </div>

              <table className="w-full text-xs text-left border-collapse border border-gray-400 table-fixed">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-400 font-bold text-gray-900 text-[11px]">
                    <th className="p-2 border border-gray-300 text-center w-[6%]">No</th>
                    <th className="p-2 border border-gray-300 w-[22%]">No Bal / Barcode</th>
                    <th className="p-2 border border-gray-300 text-center w-[12%]">Grade</th>
                    <th className="p-2 border border-gray-300 text-right w-[18%]">Berat Netto</th>
                    <th className="p-2 border border-gray-300 text-right w-[21%]">Harga / Kg</th>
                    <th className="p-2 border border-gray-300 text-right w-[21%]">Total Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {balDetails.map((b, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}>
                      <td className="p-1.5 border border-gray-300 text-center font-mono text-gray-600">{idx + 1}</td>
                      <td className="p-1.5 border border-gray-300 font-mono font-bold text-gray-900 truncate" title={b.no_bal}>{b.no_bal}</td>
                      <td className="p-1.5 border border-gray-300 text-center font-bold">
                        <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-gray-900 rounded-none text-[10px]">
                          {b.kode_grade}
                        </span>
                      </td>
                      <td className="p-1.5 border border-gray-300 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">
                        {b.berat_kg.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg
                      </td>
                      <td className="p-1.5 border border-gray-300 text-right font-mono text-gray-700 whitespace-nowrap">
                        {formatRupiah(b.harga_per_kg)}
                      </td>
                      <td className="p-1.5 border border-gray-300 text-right font-mono font-bold text-gray-950 whitespace-nowrap">
                        {formatRupiah(b.total_harga)}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Subtotal Row */}
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-gray-900">
                    <td colSpan={3} className="p-2 border border-gray-300 text-right uppercase text-[11px]">
                      TOTAL {totalItemsCount} BAL:
                    </td>
                    <td className="p-2 border border-gray-300 text-right font-mono font-black text-rose-900 text-xs whitespace-nowrap">
                      {formatNumber(grandTotalBerat)} kg
                    </td>
                    <td className="p-2 border border-gray-300 text-right font-mono text-gray-600 text-[10.5px] whitespace-nowrap">
                      Rata-rata: {formatRupiah(averageHargaPerKg)}
                    </td>
                    <td className="p-2 border border-gray-300 text-right font-mono font-black text-[#b81d24] text-xs whitespace-nowrap">
                      {formatRupiah(grandTotalNilai)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Terbilang & Catatan Box */}
            <div className="space-y-2 mb-5">
              <div className="p-2.5 bg-gray-50 border border-gray-300 text-xs">
                <div className="flex items-baseline space-x-2">
                  <span className="font-bold uppercase text-[10px] text-gray-600 shrink-0">Terbilang:</span>
                  <span className="font-semibold italic text-gray-900">
                    "{terbilangStr}"
                  </span>
                </div>
              </div>

              {pengiriman.catatan && (
                <div className="p-2.5 bg-slate-50 border border-slate-300 text-xs text-slate-800">
                  <strong className="block font-bold text-[10px] uppercase text-slate-900">Catatan Khusus Pengiriman:</strong>
                  <p className="mt-0.5">{pengiriman.catatan}</p>
                </div>
              )}
            </div>

            {/* Terms of Delivery */}
            <div className="border border-gray-200 p-2.5 bg-gray-50/50 text-[10px] text-gray-600 mb-6 space-y-0.5">
              <strong className="block text-gray-800 uppercase font-bold text-[10px]">Syarat & Ketentuan Pengiriman:</strong>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Barang tembakau telah diperiksa bersama dalam kondisi baik, kering, terbungkus rapi dan sesuai grade mutu.</li>
                <li>Pengemudi wajib menjaga keutuhan segel dan terpal pelindung muatan selama perjalanan hingga ke pabrik tujuan.</li>
                <li>Klaim selisih berat timbang atau mutu harus dilaporkan dalam tempo 1x24 jam saat pembongkaran di pabrik penerima.</li>
              </ol>
            </div>

            {/* Official 3-Party Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-300 text-center text-xs">
              <div className="space-y-12">
                <div>
                  <span className="font-bold text-gray-800 block">Petugas Pengirim (Gudang)</span>
                  <span className="text-[10px] text-gray-500">PR. Sekar Maju Sejahtera</span>
                </div>
                <div className="border-t border-gray-400 font-bold text-gray-900 pt-1 inline-block px-4 min-w-[120px]">
                  {pengiriman.petugas || <>&nbsp;</>}
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <span className="font-bold text-gray-800 block">Pengemudi / Ekspedisi</span>
                  <span className="text-[10px] text-gray-500">Pembawa Muatan</span>
                </div>
                <div className="border-t border-gray-400 font-bold text-gray-900 pt-1 inline-block px-4 min-w-[120px]">
                  {pengiriman.driver_nama || <>&nbsp;</>}
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <span className="font-bold text-gray-800 block">Penerima & QC Pabrik</span>
                  <span className="text-[10px] text-gray-500">{pengiriman.tujuan}</span>
                </div>
                <div className="border-t border-gray-400 font-bold text-gray-900 pt-1 inline-block px-4 min-w-[120px]">
                  {pengiriman.penerima || <>&nbsp;</>}
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-6 pt-2 border-t border-gray-200 text-[9px] text-gray-500 flex justify-between items-center">
              <span>Dicetak melalui Sistem ERP Gudang PR. Sekar Maju Sejahtera</span>
              <span className="font-mono">Lembar 1: Pabrik Penerima • Lembar 2: Arsip SMS • Lembar 3: Ekspedisi</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

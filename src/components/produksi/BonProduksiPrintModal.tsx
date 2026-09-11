import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Factory, 
  Building2, 
  User, 
  Calendar, 
  Scale, 
  Package, 
  FileText, 
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { PengirimanBarang, Barang } from '../../types';
import { generateNoBalSimple, formatNumber } from '../../utils/formatters';
import { downloadElementAsPdf, printHtmlElementDirectly } from '../../utils/printDownload';

interface BonProduksiPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  pengeluaran: PengirimanBarang | null;
  barangList: Barang[];
}

export const BonProduksiPrintModal: React.FC<BonProduksiPrintModalProps> = ({
  isOpen,
  onClose,
  pengeluaran,
  barangList,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !pengeluaran) return null;

  const barangIds = pengeluaran.barang_ids || [];
  const barcodeList = pengeluaran.barcode_list || [];
  const availableBarangList = barangList || [];

  const balDetails = barangIds.map((id, index) => {
    const found = availableBarangList.find((b) => b.barang_id === id);
    if (found) return found;
    return {
      barang_id: id,
      barcode: barcodeList[index] || id,
      kode_grade: 'A',
      no_bal: generateNoBalSimple('A', index + 1),
      berat_kg: (pengeluaran.total_berat_kg || 0) / (pengeluaran.total_bal || 1),
      status_stok: 'keluar' as const,
      lokasi_gudang: 'Gudang Bahan Baku Utama',
      tanggal_masuk: pengeluaran.tanggal_kirim,
    };
  });

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(
        printAreaRef.current,
        `BON_PRODUKSI_${pengeluaran.no_surat_jalan}.pdf`,
        { orientation: 'portrait' }
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!printAreaRef.current) return;
    printHtmlElementDirectly(
      printAreaRef.current,
      `Bon Pengeluaran Produksi - ${pengeluaran.no_surat_jalan}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white overflow-y-auto font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-gray-300 w-full max-w-4xl rounded-none shadow-xl flex flex-col text-xs text-gray-800 print:border-none print:shadow-none print:w-full print:max-w-none max-h-[94vh]">
        
        {/* Modal Topbar (hidden on print) */}
        <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white print:hidden">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <Factory className="w-4 h-4 text-[#b81d24]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                Bukti Pengeluaran Bahan Baku Produksi Rokok (SPBB Internal)
              </h2>
              <p className="text-[11px] font-mono text-gray-500 truncate">
                No. Bon: <span className="font-bold text-gray-800">{pengeluaran.no_surat_jalan}</span> • 
                Unit: <span className="font-semibold text-gray-800">{pengeluaran.unit_produksi || pengeluaran.tujuan}</span>
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
              title="Unduh Lembar Bon Produksi Format PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>

        {/* Printable Document Layout */}
        <div className="p-4 sm:p-6 md:p-8 bg-[#f8f9fa] overflow-y-auto flex-1 print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printAreaRef}
            className="p-8 sm:p-10 space-y-6 text-gray-900 bg-white print:p-6 print:text-black font-sans text-xs border border-gray-300 shadow-sm max-w-3xl mx-auto"
          >
          {/* Header Kop */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-[#b81d24]">
                PR. SEKAR MAJU SEJAHTERA
              </h1>
              <p className="text-xs text-gray-700 font-semibold">
                PABRIK ROKOK & PENGOLAHAN TEMBAKAU RAJANG
              </p>
              <p className="text-[11px] text-gray-500 font-mono">
                Jl. Raya Wringin Anom Km. 4, Situbondo - Jawa Timur • Telp: (0338) 671234
              </p>
            </div>

            <div className="text-right space-y-1">
              <div className="inline-block bg-[#b81d24] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                BON PENGELUARAN PRODUKSI (INTERNAL)
              </div>
              <div className="text-xs font-mono font-bold text-gray-900">
                No. Bon: {pengeluaran.no_surat_jalan}
              </div>
              <div className="text-[11px] text-gray-500 font-mono">
                Tgl Keluar: {pengeluaran.tanggal_kirim}
              </div>
            </div>
          </div>

          {/* Destination / Unit Produksi Information Grid */}
          <div className="grid grid-cols-2 gap-4 bg-[#f8f9fa] p-3.5 border border-gray-200 print:bg-transparent print:border-gray-300">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Unit Kerja / Lini Produksi Penerima:
              </span>
              <div className="font-bold text-xs text-gray-900">
                {pengeluaran.unit_produksi || pengeluaran.tujuan}
              </div>
              <div className="text-[11px] text-red-800 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 inline-block">
                Peruntukan: Produksi Rokok Sendiri (Internal PR. Sekar Maju Sejahtera)
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Petugas & Penanggung Jawab Lini:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 text-[10px] block">Mandor Produksi:</span>
                  <span className="font-bold text-gray-900">{pengeluaran.mandor_produksi || pengeluaran.driver_nama || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Armada / Sarana Angkut:</span>
                  <span className="font-mono font-bold text-gray-900">{pengeluaran.plat_nomor || 'Hand-Trolley Gudang'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table of Issued Tobacco Bales */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Rincian Bal Tembakau yang Dikeluarkan untuk Produksi:
              </span>
              <span className="text-xs font-mono font-bold text-gray-700">
                Total: {pengeluaran.total_bal} Bal ({pengeluaran.total_berat_kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg)
              </span>
            </div>

            <table className="w-full text-left border-collapse border border-gray-300 text-xs">
              <thead className="bg-[#f8f9fa] text-gray-800 font-mono text-[10px] uppercase border-b border-gray-300">
                <tr>
                  <th className="p-2 border border-gray-300 w-10 text-center">No</th>
                  <th className="p-2 border border-gray-300">No Bal / Lot</th>
                  <th className="p-2 border border-gray-300">Nomor Barcode</th>
                  <th className="p-2 border border-gray-300 text-center">Grade</th>
                  <th className="p-2 border border-gray-300 text-right">Berat Timbang (Kg)</th>
                </tr>
              </thead>
              <tbody>
                {balDetails.map((b, i) => (
                  <tr key={b.barang_id || i} className="border-b border-gray-200">
                    <td className="p-2 border border-gray-300 text-center font-mono">{i + 1}</td>
                    <td className="p-2 border border-gray-300 font-bold font-mono">{b.no_bal}</td>
                    <td className="p-2 border border-gray-300 font-mono text-gray-800 font-semibold">{b.barcode}</td>
                    <td className="p-2 border border-gray-300 text-center font-bold">Grade {b.kode_grade}</td>
                    <td className="p-2 border border-gray-300 text-right font-mono font-bold">{b.berat_kg} kg</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#f8f9fa] font-mono font-bold text-xs border-t-2 border-gray-400">
                <tr>
                  <td colSpan={3} className="p-2 text-right border border-gray-300">
                    TOTAL BAHAN BAKU MASUK PRODUKSI:
                  </td>
                  <td className="p-2 text-center border border-gray-300">
                    {pengeluaran.total_bal} Bal
                  </td>
                  <td className="p-2 text-right border border-gray-300 text-gray-900">
                    {pengeluaran.total_berat_kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} KG
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {pengeluaran.catatan && (
            <div className="bg-[#f8f9fa] p-3 border border-gray-200 text-gray-700 text-xs">
              <strong className="block text-[10px] uppercase text-gray-500">Instruksi & Catatan Khusus:</strong>
              <p className="italic">"{pengeluaran.catatan}"</p>
            </div>
          )}

          {/* 3 Signature Blocks */}
          <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-12">
              <span className="font-semibold text-gray-600 block">Dikeluarkan Oleh (Gudang)</span>
              <div className="border-t border-gray-400 pt-1 font-bold text-gray-900">
                {pengeluaran.dibuat_oleh || <>&nbsp;</>}
              </div>
            </div>

            <div className="space-y-12">
              <span className="font-semibold text-gray-600 block">Petugas Pemindahan / Logistik</span>
              <div className="border-t border-gray-400 pt-1 font-bold text-gray-900">
                <>&nbsp;</>
              </div>
            </div>

            <div className="space-y-12">
              <span className="font-semibold text-gray-600 block">Diterima Mandor Produksi Rokok</span>
              <div className="border-t border-gray-400 pt-1 font-bold text-gray-900">
                {pengeluaran.mandor_produksi || <>&nbsp;</>}
              </div>
            </div>
          </div>

        </div>
      </div>

      </div>
    </div>
  );
};

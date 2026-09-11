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
  const totalNetto = items.reduce((sum, item) => sum + (item.berat_bal_kg || 0), 0);
  const totalBruto = items.reduce((sum, item) => {
    if (item.berat_bruto_kg && item.berat_bruto_kg > 0) return sum + item.berat_bruto_kg;
    const netto = item.berat_bal_kg || 0;
    const tara = item.potongan_tara_kg !== undefined ? item.potongan_tara_kg : 2;
    return sum + (netto > 0 ? (netto + tara) : 0);
  }, 0);
  const totalNilaiTawaran = items.reduce((sum, item) => sum + (item.berat_bal_kg * item.harga_tawaran_kg), 0);
  const totalNilaiDeal = items
    .filter(i => i.status_item === 'disetujui')
    .reduce((sum, item) => sum + (item.berat_bal_kg * (item.harga_deal_kg || item.harga_tawaran_kg)), 0);

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
        <div className="px-5 py-3.5 border-b border-gray-200 bg-[#b81d24] text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5">
            <FlaskConical className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Dokumen Pengantar & Uji Sample Batch Tembakau</h2>
              <p className="text-[11px] text-gray-300 font-mono">{batch.kode_batch}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-sm transition flex items-center space-x-1 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Dokumen</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingPdf ? 'Mengunduh...' : 'Unduh PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-sm hover:bg-[#b81d24] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper View */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-gray-100 flex justify-center">
          <div 
            ref={printRef}
            className="bg-white p-6 sm:p-10 border border-gray-300 shadow-md w-full max-w-[210mm] text-gray-900 space-y-5 print:p-0 print:border-none print:shadow-none"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {/* Letterhead */}
            <div className="border-b-2 border-[#b81d24] pb-4 text-center relative">
              <h1 className="text-xl font-bold uppercase tracking-wider text-gray-950">
                PR. SEKAR MAJU SEJAHTERA
              </h1>
              <p className="text-xs text-gray-600 font-sans tracking-normal mt-0.5">
                Pusat Pembelian, Pengolahan & Distribusi Tembakau Rajangan Madura
              </p>
              <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                Kantor & Gudang Utama: Jl. Raya Tlanakan No. 88, Pamekasan, Madura | Telp: (0324) 321890
              </p>
              <div className="mt-2.5 inline-block bg-[#b81d24] text-white px-4 py-1 text-xs font-bold font-sans uppercase tracking-widest">
                SURAT PENGANTAR SAMPLE & PENAWARAN BATCH
              </div>
            </div>

            {/* Meta Information */}
            <div className="grid grid-cols-2 gap-4 font-sans text-xs pt-1">
              <div className="bg-gray-50 p-3 border border-gray-200 rounded-xs space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-500">Tujuan Evaluasi / Pabrik Buyer:</div>
                <div className="font-bold text-sm text-gray-900">{batch.tujuan_buyer}</div>
                {batch.permintaan_buyer && (
                  <div className="text-[11px] text-gray-700 pt-1 border-t border-gray-200 mt-1">
                    <span className="font-semibold text-gray-800">Spesifikasi Permintaan:</span> {batch.permintaan_buyer}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-3 border border-gray-200 rounded-xs space-y-1 text-right">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">No. Batch:</span>
                  <span className="font-bold font-mono text-gray-900">{batch.kode_batch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Tanggal Kirim:</span>
                  <span className="font-semibold">{batch.tanggal_kirim}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Gudang Asal:</span>
                  <span className="font-semibold">{batch.sumber_gudang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Pengirim:</span>
                  <span className="font-semibold">{batch.dikirim_oleh}</span>
                </div>
              </div>
            </div>

            {/* Table of Sample Bales */}
            <div className="font-sans">
              <table className="w-full border-collapse border border-[#b81d24] text-xs">
                <thead>
                  <tr className="bg-[#b81d24] text-white text-[10px] font-bold">
                    <th className="border border-[#b81d24] p-2 text-center w-8">No</th>
                    <th className="border border-[#b81d24] p-2 text-left">Kode Bal (Gudang / Buyer)</th>
                    <th className="border border-[#b81d24] p-2 text-right w-16">Bruto (Kg)</th>
                    <th className="border border-[#b81d24] p-2 text-right w-16">Netto (Kg)</th>
                    <th className="border border-[#b81d24] p-2 text-right w-24">Harga Tawar</th>
                    <th className="border border-[#b81d24] p-2 text-right w-28">Est. Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const isAcc = it.status_item === 'disetujui';
                    const isReject = it.status_item === 'ditolak';
                    const isNego = it.status_item === 'nego';

                    const netto = it.berat_bal_kg || 0;
                    const bruto = it.berat_bruto_kg && it.berat_bruto_kg > 0
                      ? it.berat_bruto_kg
                      : (netto > 0 ? netto + (it.potongan_tara_kg !== undefined ? it.potongan_tara_kg : 2) : 0);
                    const hrgBeli = it.harga_beli_kg || 0;
                    const subtotal = netto * it.harga_tawaran_kg;

                    return (
                      <tr key={it.sample_item_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                        <td className="border border-gray-300 p-1.5 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-300 p-1.5">
                          <div className="font-mono font-bold text-gray-900">
                            {it.no_bal || it.barang_id}
                            {it.kode_bal_pembeli && it.kode_bal_pembeli !== it.no_bal && (
                              <span className="text-gray-600 font-normal"> / {it.kode_bal_pembeli}</span>
                            )}
                          </div>
                          <div className="text-[9px] text-gray-500 font-mono">{it.sample_item_id} • Petani: {it.nama_petani || '-'}</div>
                        </td>
                        <td className="border border-gray-300 p-1.5 text-right font-mono text-gray-700">
                          {formatNumber(bruto, 1)}
                        </td>
                        <td className="border border-gray-300 p-1.5 text-right font-mono font-bold text-gray-900">
                          {formatNumber(netto, 1)}
                        </td>
                        <td className="border border-gray-300 p-1.5 text-right font-mono font-bold text-gray-900">
                          {formatRupiah(it.harga_tawaran_kg)}
                          {isAcc && it.harga_deal_kg && it.harga_deal_kg !== it.harga_tawaran_kg && (
                            <div className="text-[9px] text-emerald-700 font-semibold">
                              Deal: {formatRupiah(it.harga_deal_kg)}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1.5 text-right font-mono font-bold text-gray-950">
                          {formatRupiah(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold border-t-2 border-[#b81d24] text-[11px]">
                    <td colSpan={2} className="border border-[#b81d24] p-2 text-right uppercase">
                      Total ({totalBal} Bal Sample)
                    </td>
                    <td className="border border-[#b81d24] p-2 text-right font-mono">
                      {formatNumber(totalBruto, 1)}
                    </td>
                    <td className="border border-[#b81d24] p-2 text-right font-mono font-bold text-gray-950">
                      {formatNumber(totalNetto, 1)}
                    </td>
                    <td className="border border-[#b81d24] p-2 text-right text-[10px] text-gray-600">
                      Total Nilai:
                    </td>
                    <td className="border border-[#b81d24] p-2 text-right font-mono font-bold text-gray-950">
                      {formatRupiah(totalNilaiTawaran)}
                    </td>
                  </tr>
                  {totalNilaiDeal > 0 && (
                    <tr className="bg-emerald-50 font-bold border-b border-[#b81d24] text-emerald-900">
                      <td colSpan={4} className="border border-[#b81d24] p-2 text-right uppercase text-[11px]">
                        Total Nilai Disetujui (Deal Final):
                      </td>
                      <td colSpan={2} className="border border-[#b81d24] p-2 text-right font-mono text-sm text-emerald-800">
                        {formatRupiah(totalNilaiDeal)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Signatures */}
            <div className="font-sans grid grid-cols-3 gap-6 pt-6 text-center text-xs">
              <div>
                <p className="text-gray-500 mb-14">Dibuat & Dikirim Oleh,</p>
                <p className="font-bold border-t border-[#b81d24] pt-1 text-gray-900">{batch.dikirim_oleh}</p>
                <p className="text-[10px] text-gray-500">QC & Logistik PR. Sekar Maju Sejahtera</p>
              </div>

              <div>
                <p className="text-gray-500 mb-14">Mengetahui (Pimpinan Gudang),</p>
                <p className="font-bold border-t border-[#b81d24] pt-1 text-gray-900">H. Achmad Syafi'i</p>
                <p className="text-[10px] text-gray-500">Kepala Gudang & Pembelian</p>
              </div>

              <div>
                <p className="text-gray-500 mb-14">Diterima & Diuji Oleh (Pabrik Buyer),</p>
                <p className="font-bold border-t border-[#b81d24] pt-1 text-gray-900 min-h-[22px]">
                  {batch.petugas_qc_pabrik || <>&nbsp;</>}
                </p>
                <p className="text-[10px] text-gray-500">Tim QC / Lab Pembelian Pabrik</p>
              </div>
            </div>

            {/* Note footer */}
            <div className="text-[10px] text-gray-400 border-t border-gray-200 pt-3 text-center font-sans">
              Dokumen ini merupakan bukti sah pengiriman sample tembakau rajangan Madura dan lampiran kesepakatan spesifikasi mutu & harga sebelum penerbitan Delivery Order (Surat Jalan).
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

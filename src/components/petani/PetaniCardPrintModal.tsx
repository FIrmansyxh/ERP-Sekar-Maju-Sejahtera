import React, { useRef, useState } from 'react';
import { 
  Printer, 
  Download, 
  User, 
  ArrowLeft,
  Building2,
  ShieldCheck,
  MapPin,
  Phone
} from 'lucide-react';
import { Petani } from '../../types';
import { formatDateIndo } from '../../utils/formatters';
import { downloadElementAsPdf, printHtmlElementDirectly } from '../../utils/printDownload';

interface PetaniCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  petani: Petani | null;
}

export const PetaniCardPrintModal: React.FC<PetaniCardPrintModalProps> = ({
  isOpen,
  onClose,
  petani,
}) => {
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !petani) return null;

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(
        printRef.current,
        `KARTU_PETANI_${petani.petani_id}_${cardSide.toUpperCase()}.pdf`,
        { orientation: 'landscape' }
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    printHtmlElementDirectly(
      printRef.current,
      `Kartu Identitas Petani - ${petani.nama_petani} (${petani.petani_id})`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-gray-300 w-full max-w-2xl rounded-none shadow-2xl flex flex-col text-xs text-gray-800">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#b81d24]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                Cetak Kartu Tanda Anggota / ID Petani
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                ID Petani: <span className="font-mono font-bold text-gray-800">{petani.petani_id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#17a2b8] hover:bg-[#138496] disabled:opacity-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title="Unduh Berkas PDF Langsung"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Side Toggle */}
        <div className="px-5 py-2.5 bg-[#f8f9fa] border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCardSide('front')}
              className={`px-3 py-1 text-xs font-bold rounded-sm transition cursor-pointer ${
                cardSide === 'front'
                  ? 'bg-[#b81d24] text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Sisi Depan (Identitas)
            </button>
            <button
              onClick={() => setCardSide('back')}
              className={`px-3 py-1 text-xs font-bold rounded-sm transition cursor-pointer ${
                cardSide === 'back'
                  ? 'bg-[#b81d24] text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Sisi Belakang (Ketentuan)
            </button>
          </div>
        </div>

        {/* Card Preview Stage */}
        <div className="p-6 bg-gray-100 flex items-center justify-center overflow-x-auto">
          <div ref={printRef} className="p-2">
            
            {cardSide === 'front' ? (
              /* CARD FRONT */
              <div className="w-[360px] h-[220px] bg-white border-2 border-gray-800 rounded-lg p-4 flex flex-col justify-between shadow-lg relative font-sans text-gray-900">
                {/* Top Header */}
                <div className="border-b-2 border-[#b81d24] pb-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded bg-[#b81d24] flex items-center justify-center text-white font-black text-xs">
                      SMS
                    </div>
                    <div>
                      <div className="font-bold text-xs tracking-tight text-[#b81d24] uppercase">PR. SEKAR MAJU SEJAHTERA</div>
                      <div className="text-[9px] text-gray-500 font-medium">KARTU ANGGOTA PETANI TEMBAKAU</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-gray-100 border border-gray-300 rounded font-bold">
                      {petani.status_aktif ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                </div>

                {/* Farmer Info Body */}
                <div className="my-2 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-gray-500 font-medium">PETANI ID:</span>
                    <span className="text-sm font-mono font-black text-gray-950 tracking-wider">
                      {petani.petani_id}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-gray-500 font-medium">NAMA PETANI:</span>
                    <span className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
                      {petani.nama_petani}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-gray-500 font-medium">NO. HP / WA:</span>
                    <span className="text-xs font-mono font-medium text-gray-800">
                      {petani.no_hp || '-'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-[10px] text-gray-500 font-medium shrink-0">ALAMAT:</span>
                    <span className="text-[10px] text-gray-700 text-right leading-tight truncate max-w-[210px]">
                      {petani.alamat}
                    </span>
                  </div>
                </div>

                {/* Card Bottom Strip */}
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500">
                  <span>Terdaftar: {petani.tanggal_daftar ? formatDateIndo(petani.tanggal_daftar) : '-'}</span>
                  <span className="font-semibold text-gray-700">Gudang Intake Madura</span>
                </div>
              </div>
            ) : (
              /* CARD BACK */
              <div className="w-[360px] h-[220px] bg-white border-2 border-gray-800 rounded-lg p-4 flex flex-col justify-between shadow-lg relative font-sans text-gray-900">
                <div className="border-b border-gray-300 pb-1.5">
                  <div className="font-bold text-[11px] text-gray-900 uppercase tracking-tight">KETENTUAN PEMASOK & TIMBANG</div>
                  <div className="text-[9px] text-gray-500">PR. SEKAR MAJU SEJAHTERA - SENTRA TEMBAKAU MADURA</div>
                </div>

                <div className="text-[9px] text-gray-700 space-y-1.5 leading-tight my-1">
                  <p>1. Kartu ini adalah tanda identitas resmi pemasok petani tembakau.</p>
                  <p>2. Wajib ditunjukkan kepada operator loket timbang saat proses penimbangan dan pembayaran bal.</p>
                  <p>3. Potongan resmi timbang: Tara keranjang 2 kg (bruto) dan potongan otomatis Rp 2.000 / bal.</p>
                  <p>4. Hak cipta & verifikasi data terdaftar di Master Petani PR. Sekar Maju Sejahtera.</p>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500">
                  <span className="font-mono">{petani.petani_id}</span>
                  <span>Layanan Petani: 0812-3456-7890</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            <span>Format kartu standar siap dicetak atau disimpan sebagai arsip fisik.</span>
          </span>
          <span className="font-mono text-gray-400">ID: {petani.petani_id}</span>
        </div>

      </div>
    </div>
  );
};

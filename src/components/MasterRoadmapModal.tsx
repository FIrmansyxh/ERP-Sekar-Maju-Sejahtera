import React from 'react';
import { 
  Layers, 
  ArrowLeft, 
  CheckCircle2, 
  Database
} from 'lucide-react';

interface MasterRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterRoadmapModal: React.FC<MasterRoadmapModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const prdSequence = [
    {
      no: 1,
      name: 'Data Petani (PRD 01)',
      status: 'Selesai & Aktif',
      desc: 'Master data dasar. Semua transaksi pembelian & pengiriman merujuk ke petani_id.',
    },
    {
      no: 2,
      name: 'Data Barang / Bal (PRD 02)',
      status: 'Selesai & Aktif',
      desc: 'Master tembakau per grade + nomor bal fisik, lokasi gudang, dan rincian data bal.',
    },
    {
      no: 3,
      name: 'Tabel Harga (PRD 03)',
      status: 'Selesai & Aktif',
      desc: 'Harga acuan beli per kg per grade + rate potongan kadar air per 10kg.',
    },
    {
      no: 4,
      name: 'Pengiriman Sample (PRD 04)',
      status: 'Selesai & Aktif',
      desc: 'Uji mutu lab/pabrik buyer sebelum pengiriman bal fisik skala penuh.',
    },
    {
      no: 5,
      name: 'Pengiriman Barang (PRD 05)',
      status: 'Selesai & Aktif',
      desc: 'Input bal fisik saat keluar gudang & cetak surat jalan / DO.',
    },
    {
      no: 6,
      name: 'Laporan & Analytic (PRD 06)',
      status: 'Selesai & Aktif',
      desc: 'Dashboard analitik ranking grade terlaris dan ranking petani paling produktif.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-gray-300 w-full max-w-3xl rounded-none shadow-xl flex flex-col text-xs text-gray-800">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-gray-700" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                Master Roadmap & Arsitektur ERP Gudang Tembakau
              </h2>
              <p className="text-[11px] text-gray-500">
                Fondasi keterhubungan 6 modul terintegrasi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto bg-white">
          
          <div className="bg-[#f8f9fa] border border-gray-200 p-3 text-xs text-gray-800 leading-relaxed space-y-1">
            <div className="font-bold text-xs flex items-center space-x-1.5 text-gray-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Arsitektur Sistem ERP Tembakau Terintegrasi Lengkap</span>
            </div>
            <p className="text-[11px] text-gray-600">
              Semua entitas data (<code className="text-gray-900 font-mono">petani_id</code>, <code className="text-gray-900 font-mono">no_bal</code>, <code className="text-gray-900 font-mono">gudang_id</code>) tersambung secara presisi.
            </p>
          </div>

          {/* Sequence Timeline */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
              Struktur Modul Sistem
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {prdSequence.map((step) => (
                <div
                  key={step.no}
                  className="p-3 border border-gray-200 text-xs space-y-1 bg-white hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 flex items-center space-x-1.5">
                      <span className="w-4 h-4 text-white text-[10px] font-bold flex items-center justify-center bg-gray-900">
                        {step.no}
                      </span>
                      <span>{step.name}</span>
                    </span>

                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-300">
                      {step.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Integration Box */}
          <div className="bg-[#f8f9fa] p-3.5 border border-gray-300 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider">
              <Database className="w-3.5 h-3.5 text-gray-700" />
              <span>Dua Kunci Integrasi Utama</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 border border-gray-200 space-y-1">
                <span className="font-mono text-gray-900 font-bold block text-xs">
                  1. petani_id
                </span>
                <p className="text-gray-600 text-[11px]">
                  Menghubungkan <strong>Master Petani</strong> ↔ <strong>Loket Timbang</strong> ↔ <strong>Buku Kas</strong> ↔ <strong>Analitik</strong>.
                </p>
              </div>

              <div className="bg-white p-2.5 border border-gray-200 space-y-1">
                <span className="font-mono text-gray-900 font-bold block text-xs">
                  2. no_bal (Barang)
                </span>
                <p className="text-gray-600 text-[11px]">
                  Menghubungkan <strong>Master Barang</strong> ↔ <strong>Pengiriman Sample</strong> ↔ <strong>Surat Jalan Muatan Pabrik</strong>.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

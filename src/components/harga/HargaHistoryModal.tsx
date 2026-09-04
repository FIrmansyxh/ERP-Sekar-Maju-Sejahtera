import React from 'react';
import { X, History, TrendingUp, Calendar, ArrowLeft } from 'lucide-react';
import { TabelHarga } from '../../types';
import { formatRupiah } from '../../utils/formatters';

interface HargaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradeCode: string | null;
  allHargaList: TabelHarga[];
}

export const HargaHistoryModal: React.FC<HargaHistoryModalProps> = ({
  isOpen,
  onClose,
  gradeCode,
  allHargaList,
}) => {
  if (!isOpen || !gradeCode) return null;

  const historyItems = allHargaList
    .filter((h) => h.kode_grade === gradeCode)
    .sort((a, b) => new Date(b.tanggal_berlaku).getTime() - new Date(a.tanggal_berlaku).getTime());

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-gray-300 w-full max-w-2xl rounded-none shadow-xl flex flex-col text-xs text-gray-800">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-[#b81d24]" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                Riwayat & Versioning Tarif Acuan Grade {gradeCode}
              </h2>
              <p className="text-[11px] text-gray-500">
                Histori perubahan tarif acuan dan rate potongan operasional
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#545b62] hover:bg-[#464c52] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto bg-white">
          <div className="space-y-2">
            <span className="font-bold text-gray-700 uppercase tracking-wider text-[11px] block">
              Daftar Versi Harga Tercatat ({historyItems.length} Versi):
            </span>

            <div className="divide-y divide-gray-200 border border-gray-200">
              {historyItems.map((item) => {
                const isCurrentActive = item.status === 'aktif';

                return (
                  <div
                    key={item.harga_id}
                    className={`p-3.5 transition ${
                      isCurrentActive ? 'bg-[#f8f9fa] border-l-4 border-l-[#b81d24]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          {formatRupiah(item.harga_per_kg)}
                        </span>
                        <span className="text-gray-500 text-xs">/ kg</span>

                        {isCurrentActive ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            SEDANG BERLAKU
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
                            ARSIP NONAKTIF
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-gray-500 font-semibold">
                        {item.harga_id}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600">
                      <div>
                        <span className="text-gray-400 block text-[10px]">Periode Berlaku:</span>
                        <span className="font-mono font-semibold text-gray-800">
                          {item.tanggal_berlaku} s/d {item.tanggal_berakhir || 'Sekarang'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Ketentuan Mutu:</span>
                        <span className="font-semibold text-gray-800 truncate block">
                          {item.ketentuan || 'Standar Mutu Pabrik'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Dibuat Oleh:</span>
                        <span className="font-semibold text-gray-800 truncate block">
                          {item.dibuat_oleh || 'Admin Gudang'}
                        </span>
                      </div>
                    </div>

                    {item.deskripsi && (
                      <p className="mt-2 text-[11px] text-gray-600 italic bg-white p-2 border border-gray-200">
                        "{item.deskripsi}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

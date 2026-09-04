import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  HelpCircle,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { Petani } from '../../types';

interface PetaniDeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (petani: Petani, reason?: string) => void;
  petani: Petani | null;
}

export const PetaniDeactivateModal: React.FC<PetaniDeactivateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  petani,
}) => {
  const [reason, setReason] = useState<string>('');

  if (!isOpen || !petani) return null;

  const isDeactivating = petani.status_aktif;

  const handleConfirm = () => {
    onConfirm(petani, reason);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-gray-300 w-full max-w-lg rounded-none shadow-2xl flex flex-col text-xs text-gray-800">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center space-x-2.5 min-w-0">
            {isDeactivating ? (
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#b81d24]" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-sm bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                {isDeactivating ? 'Konfirmasi Nonaktifkan Petani' : 'Konfirmasi Aktifkan Kembali Petani'}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                ID: {petani.petani_id} • No. Kartu: {petani.nomor_kartu}
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
              <span>Batal</span>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-1.5 text-xs font-bold text-white rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap ${
                isDeactivating
                  ? 'bg-[#b81d24] hover:bg-[#a0181e]'
                  : 'bg-[#28a745] hover:bg-[#218838]'
              }`}
            >
              {isDeactivating ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 bg-white">
          
          <div className="bg-[#f8f9fa] p-3 border border-gray-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold">Nama Petani:</span>
              <strong className="text-gray-900">{petani.nama_petani}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold">No. Kartu Fisik:</span>
              <span className="font-mono font-bold text-gray-800 bg-white px-1.5 py-0.5 border border-gray-300">
                {petani.nomor_kartu}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold">Riwayat Setoran:</span>
              <span className="text-gray-900 font-bold">
                {petani.statistik?.total_setoran_bal || 0} Bal ({petani.statistik?.total_berat_kg || 0} Kg)
              </span>
            </div>
          </div>

          {isDeactivating ? (
            <div className="space-y-3">
              <div className="bg-[#f8f9fa] border border-gray-300 p-2.5 text-xs text-gray-700 leading-relaxed">
                <strong>Catatan Sistem:</strong> Petani yang dinonaktifkan tidak akan muncul di loket timbang, namun seluruh data historis dan audit tetap tersimpan aman.
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Alasan Penonaktifan (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Misal: Pergantian komoditas tanaman, lahan istirahat panen, kartu ditarik sementara."
                  className="w-full text-xs rounded-sm px-2.5 py-1.5 border border-[#ced4da] focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed">
              Petani akan diaktifkan kembali dan nomor kartu dapat langsung digunakan untuk proses loket timbangan penerimaan.
            </p>
          )}

        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Save, FlaskConical, ArrowLeft } from 'lucide-react';
import { PengirimanSample, StatusSample } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

interface SampleStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: PengirimanSample | null;
  onSaveStatus: (updated: PengirimanSample) => void;
}

export const SampleStatusUpdateModal: React.FC<SampleStatusUpdateModalProps> = ({
  isOpen,
  onClose,
  sample,
  onSaveStatus,
}) => {
  const [status, setStatus] = useState<StatusSample>(sample?.status || 'dikirim');
  const [catatan, setCatatan] = useState(sample?.catatan || '');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  React.useEffect(() => {
    if (sample) {
      setStatus(sample.status);
      setCatatan(sample.catatan || '');
      setIsConfirmOpen(false);
    }
  }, [sample, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirmOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirmOpen, onClose]);

  if (!isOpen || !sample) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updated: PengirimanSample = {
      ...sample,
      status,
      tanggal_respon: status !== 'dikirim' ? dateFormatted : sample.tanggal_respon,
      catatan: catatan.trim(),
    };

    onSaveStatus(updated);
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isConfirmOpen) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-white border border-gray-300 w-full max-w-md rounded-none shadow-2xl flex flex-col text-xs text-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <FlaskConical className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                  Update Approval QC Sample
                </h2>
                <p className="text-[11px] font-mono text-gray-500 truncate">{sample.sample_id}</p>
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
                onClick={handleSubmit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Respon</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 bg-[#f8f9fa]">
            
            {/* Sample Info */}
            <div className="bg-white p-3.5 border border-gray-300 shadow-xs space-y-1.5 text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Tujuan Lab / Pabrik:</span>
                <span className="font-bold text-gray-900 truncate max-w-[200px]">{sample.tujuan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Grade & Berat:</span>
                <span className="font-bold text-gray-900">Grade {sample.kode_grade} ({sample.berat_sample_gram} Gram)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Tgl Dikirim:</span>
                <span className="font-mono text-gray-600">{sample.tanggal_kirim}</span>
              </div>
            </div>

            {/* Status Selection Buttons */}
            <div className="space-y-1.5 bg-white p-3.5 border border-gray-300 shadow-xs">
              <label className="font-bold text-gray-700 block">
                Pilih Status Respon Lab / Buyer <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('dikirim')}
                  className={`p-2 border text-center font-bold text-xs rounded-sm transition cursor-pointer ${
                    status === 'dikirim'
                      ? 'bg-amber-100 border-amber-500 text-amber-900 font-bold'
                      : 'bg-[#f8f9fa] border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Dikirim (Logistik)
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('diterima')}
                  className={`p-2 border text-center font-bold text-xs rounded-sm transition cursor-pointer ${
                    status === 'diterima'
                      ? 'bg-rose-100 border-[#b81d24] text-rose-900 font-bold'
                      : 'bg-[#f8f9fa] border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Diterima (Lab)
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('disetujui')}
                  className={`p-2 border text-center font-bold text-xs rounded-sm transition cursor-pointer ${
                    status === 'disetujui'
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-900 font-bold'
                      : 'bg-[#f8f9fa] border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Disetujui (Approved)
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('ditolak')}
                  className={`p-2 border text-center font-bold text-xs rounded-sm transition cursor-pointer ${
                    status === 'ditolak'
                      ? 'bg-red-100 border-red-500 text-red-900 font-bold'
                      : 'bg-[#f8f9fa] border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Ditolak (Rejected)
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1 bg-white p-3.5 border border-gray-300 shadow-xs">
              <label className="font-bold text-gray-700 block">
                Catatan Hasil Uji Organoleptik / Lab
              </label>
              <textarea
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Kadar air 13.2%, aroma harum tembakau Madura, disetujui untuk PO massal..."
                className="w-full border border-[#ced4da] rounded-sm p-2 text-xs focus:outline-none focus:border-[#b81d24]"
              />
            </div>

          </form>

        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Update Status QC Sample"
        message={`Apakah Anda yakin ingin memperbarui status sampel ${sample.sample_id} menjadi "${status.toUpperCase()}"?`}
        detail={`Tujuan: ${sample.tujuan} | Grade ${sample.kode_grade}`}
        variant="warning"
        confirmText="Ya, Perbarui Status"
        cancelText="Batal"
        onConfirm={handleConfirmSave}
        onClose={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

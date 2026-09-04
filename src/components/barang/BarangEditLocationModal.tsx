import React, { useState } from 'react';
import { Lock, Save, ArrowLeft, Warehouse } from 'lucide-react';
import { Barang } from '../../types';
import { STANDARD_GUDANG_LOCATIONS } from '../../data/initialGudangData';
import { ConfirmModal } from '../common/ConfirmModal';

interface BarangEditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  barang: Barang | null;
  onSave: (updated: Barang) => void;
}

export const BarangEditLocationModal: React.FC<BarangEditLocationModalProps> = ({
  isOpen,
  onClose,
  barang,
  onSave,
}) => {
  const [lokasiGudang, setLokasiGudang] = useState(barang?.lokasi_gudang || '');
  const [catatan, setCatatan] = useState(barang?.catatan || '');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  React.useEffect(() => {
    if (barang) {
      setLokasiGudang(barang.lokasi_gudang || '');
      setCatatan(barang.catatan || '');
      setIsConfirmOpen(false);
    }
  }, [barang]);

  if (!isOpen || !barang) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    onSave({
      ...barang,
      lokasi_gudang: lokasiGudang.trim() || 'Gudang Pusat Induk - Pamekasan / Blok A-01',
      catatan: catatan.trim(),
    });
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
        <div className="bg-white border border-gray-300 w-full max-w-lg rounded-none shadow-2xl flex flex-col text-xs text-gray-800">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Warehouse className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                  Update Lokasi Bal Tembakau
                </h2>
                <p className="text-[11px] font-mono text-gray-500 truncate">
                  No Bal: {barang.no_bal} ({barang.barcode})
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
                onClick={handleSubmit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Lokasi</span>
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 bg-[#f8f9fa]">
            
            {/* Integrity Note */}
            <div className="bg-white border border-gray-200 p-3 text-gray-700 flex items-start space-x-2.5 shadow-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                Grade (<span className="font-bold text-gray-900">Grade {barang.kode_grade}</span>) dan Berat Timbang (<span className="font-bold text-gray-900">{barang.berat_kg} kg</span>) terkunci permanen sesuai standar audit transaksi pembelian.
              </p>
            </div>

            {/* Locked Fields Preview */}
            <div className="grid grid-cols-2 gap-3 bg-white p-3.5 border border-gray-200 shadow-xs">
              <div>
                <span className="text-gray-500 uppercase font-bold text-[10px] block">Kode Mutu (Grade)</span>
                <span className="text-xs font-bold text-gray-900">GRADE {barang.kode_grade}</span>
              </div>
              <div>
                <span className="text-gray-500 uppercase font-bold text-[10px] block">Berat Timbang</span>
                <span className="text-xs font-bold text-gray-900 font-mono">{barang.berat_kg} kg</span>
              </div>
            </div>

            {/* Editable Field: Lokasi Gudang */}
            <div className="space-y-1.5 bg-white p-3.5 border border-gray-200 shadow-xs">
              <label className="font-bold text-gray-700 block">
                Pilihan Fasilitas Gudang & Blok Rak <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={lokasiGudang}
                onChange={(e) => setLokasiGudang(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border border-[#ced4da] rounded-sm focus:outline-none focus:border-[#b81d24] bg-white text-gray-900 cursor-pointer"
              >
                {STANDARD_GUDANG_LOCATIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Editable Field: Catatan */}
            <div className="space-y-1.5 bg-white p-3.5 border border-gray-200 shadow-xs">
              <label className="font-bold text-gray-700 block">
                Catatan Kondisi Fisik Bal
              </label>
              <textarea
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Pembungkusan karung goni rapi, aroma tajam khas tembakau Madura, tumpukan lapis 2..."
                className="w-full px-3 py-2 text-xs border border-[#ced4da] rounded-sm focus:outline-none focus:border-[#b81d24] bg-white text-gray-900"
              />
            </div>

          </form>

        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Pemindahan / Update Lokasi Bal"
        message={`Apakah Anda yakin ingin memperbarui penempatan bal ${barang.no_bal}?`}
        detail={`Lokasi Baru: ${lokasiGudang || 'Gudang Pusat Induk - Pamekasan'} | Catatan: ${catatan || 'Tanpa catatan khusus'}`}
        variant="primary"
        confirmText="Ya, Simpan Lokasi"
        cancelText="Batal"
        onConfirm={handleConfirmSave}
        onClose={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Warehouse, CheckCircle2 } from 'lucide-react';
import { Gudang } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

interface GudangFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gudang: Gudang) => void;
  editingGudang?: Gudang | null;
  existingGudangList: Gudang[];
}

export const GudangFormModal: React.FC<GudangFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingGudang,
  existingGudangList,
}) => {
  const [formData, setFormData] = useState<Partial<Gudang>>({
    gudang_id: '',
    kode_gudang: '',
    nama_gudang: '',
    alamat: '',
    kapasitas_bal: 500,
    kepala_gudang: '',
    kontak: '',
    status_aktif: true,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingGudang) {
        setFormData({ ...editingGudang });
      } else {
        const nextNum = existingGudangList.length + 1;
        setFormData({
          gudang_id: `GDG-${String(nextNum).padStart(2, '0')}`,
          kode_gudang: `GDG-PMK-0${nextNum}`,
          nama_gudang: '',
          alamat: '',
          kapasitas_bal: 500,
          kepala_gudang: '',
          kontak: '',
          status_aktif: true,
        });
      }
      setErrors({});
      setIsConfirmOpen(false);
    }
  }, [isOpen, editingGudang, existingGudangList]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!formData.kode_gudang?.trim()) {
      newErrors.kode_gudang = 'Kode gudang wajib diisi.';
    }
    if (!formData.nama_gudang?.trim()) {
      newErrors.nama_gudang = 'Nama gudang wajib diisi.';
    }
    if (!formData.alamat?.trim()) {
      newErrors.alamat = 'Alamat gudang wajib diisi.';
    }
    if (!formData.kapasitas_bal || formData.kapasitas_bal <= 0) {
      newErrors.kapasitas_bal = 'Kapasitas bal harus lebih dari 0.';
    }
    if (!formData.kepala_gudang?.trim()) {
      newErrors.kepala_gudang = 'Nama penanggung jawab wajib diisi.';
    }
    if (!formData.kontak?.trim()) {
      newErrors.kontak = 'Nomor HP penanggung jawab wajib diisi.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    const finalGudang: Gudang = {
      gudang_id: formData.gudang_id || `GDG-${Date.now()}`,
      kode_gudang: (formData.kode_gudang || '').trim(),
      nama_gudang: (formData.nama_gudang || '').trim(),
      nama_lokasi: (formData.nama_gudang || '').trim(),
      alamat: (formData.alamat || '').trim(),
      kapasitas_bal: Number(formData.kapasitas_bal) || 500,
      kepala_gudang: (formData.kepala_gudang || '').trim(),
      kontak: (formData.kontak || '').trim(),
      status_aktif: formData.status_aktif ?? true,
    };

    onSave(finalGudang);
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
        <div className="bg-white border border-gray-300 w-full max-w-xl rounded-none shadow-2xl flex flex-col text-xs text-gray-800">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Warehouse className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                  {editingGudang ? 'Edit Master Fasilitas Gudang' : 'Tambah Fasilitas Gudang Baru'}
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  Manajemen kapasitas penyimpanan bal tembakau Madura
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
                <span>Simpan Gudang</span>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Kode Gudang */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Kode Gudang <span className="text-[#b81d24]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: GDG-PMK-01"
                  value={formData.kode_gudang || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, kode_gudang: e.target.value.toUpperCase() });
                    if (errors.kode_gudang) setErrors({ ...errors, kode_gudang: '' });
                  }}
                  className={`w-full bg-white border ${
                    errors.kode_gudang ? 'border-red-500' : 'border-gray-300'
                  } rounded-sm px-3 py-2 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:border-[#b81d24]`}
                />
                {errors.kode_gudang && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.kode_gudang}</p>
                )}
              </div>

              {/* Kapasitas Bal */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Kapasitas (Bal) <span className="text-[#b81d24]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 500"
                    value={formData.kapasitas_bal || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, kapasitas_bal: Number(e.target.value) });
                      if (errors.kapasitas_bal) setErrors({ ...errors, kapasitas_bal: '' });
                    }}
                    className={`w-full bg-white border ${
                      errors.kapasitas_bal ? 'border-red-500' : 'border-gray-300'
                    } rounded-sm px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#b81d24]`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">
                    Bal
                  </span>
                </div>
                {errors.kapasitas_bal && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.kapasitas_bal}</p>
                )}
              </div>
            </div>

            {/* Nama Gudang */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Nama Gudang <span className="text-[#b81d24]">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Gudang Pusat Induk & Intake Pamekasan"
                value={formData.nama_gudang || ''}
                onChange={(e) => {
                  setFormData({ ...formData, nama_gudang: e.target.value });
                  if (errors.nama_gudang) setErrors({ ...errors, nama_gudang: '' });
                }}
                className={`w-full bg-white border ${
                  errors.nama_gudang ? 'border-red-500' : 'border-gray-300'
                } rounded-sm px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]`}
              />
              {errors.nama_gudang && (
                <p className="text-[11px] text-red-600 mt-1">{errors.nama_gudang}</p>
              )}
            </div>

            {/* Alamat */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Alamat Gudang <span className="text-[#b81d24]">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Jl. Raya Proppo No. 88, Kec. Proppo, Kab. Pamekasan, Madura"
                value={formData.alamat || ''}
                onChange={(e) => {
                  setFormData({ ...formData, alamat: e.target.value });
                  if (errors.alamat) setErrors({ ...errors, alamat: '' });
                }}
                className={`w-full bg-white border ${
                  errors.alamat ? 'border-red-500' : 'border-gray-300'
                } rounded-sm px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]`}
              />
              {errors.alamat && (
                <p className="text-[11px] text-red-600 mt-1">{errors.alamat}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Penanggung Jawab */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Penanggung Jawab <span className="text-[#b81d24]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. H. Budi Santoso, S.P."
                  value={formData.kepala_gudang || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, kepala_gudang: e.target.value });
                    if (errors.kepala_gudang) setErrors({ ...errors, kepala_gudang: '' });
                  }}
                  className={`w-full bg-white border ${
                    errors.kepala_gudang ? 'border-red-500' : 'border-gray-300'
                  } rounded-sm px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]`}
                />
                {errors.kepala_gudang && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.kepala_gudang}</p>
                )}
              </div>

              {/* Nomor HP */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Nomor HP <span className="text-[#b81d24]">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 0812-3456-7890"
                  value={formData.kontak || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, kontak: e.target.value });
                    if (errors.kontak) setErrors({ ...errors, kontak: '' });
                  }}
                  className={`w-full bg-white border ${
                    errors.kontak ? 'border-red-500' : 'border-gray-300'
                  } rounded-sm px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]`}
                />
                {errors.kontak && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.kontak}</p>
                )}
              </div>
            </div>

            {/* Status Aktif */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-700 block">Status Operasional Fasilitas</label>
                <p className="text-[11px] text-gray-500">
                  Gudang aktif dapat dipilih untuk penerimaan stok dan alokasi penyimpanan
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.status_aktif ?? true}
                  onChange={(e) => setFormData({ ...formData, status_aktif: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#b81d24]"></div>
              </label>
            </div>
          </form>

          {/* Footer Info */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>Format master gudang: Kode, Nama, Alamat, Kapasitas, Penanggung Jawab, Nomor HP.</span>
            </span>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={editingGudang ? 'Konfirmasi Edit Gudang' : 'Konfirmasi Simpan Gudang'}
        message={`Simpan data fasilitas gudang "${formData.nama_gudang}" (${formData.kode_gudang}) dengan kapasitas ${formData.kapasitas_bal} bal?`}
        variant="primary"
        confirmText="Simpan Gudang"
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

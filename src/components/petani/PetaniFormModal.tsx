import React, { useState, useEffect } from 'react';
import { 
  Save, 
  User, 
  ArrowLeft,
  CheckCircle2,
  Phone,
  MapPin,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { Petani } from '../../types';
import { generatePetaniId } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

interface PetaniFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (petani: Petani) => void;
  existingPetaniList: Petani[];
  editingPetani?: Petani | null;
}

export const PetaniFormModal: React.FC<PetaniFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingPetaniList,
  editingPetani,
}) => {
  const isEdit = Boolean(editingPetani);

  const [formData, setFormData] = useState<Partial<Petani>>({
    petani_id: '',
    nama_petani: '',
    no_hp: '',
    alamat: '',
    status_aktif: true,
    tanggal_daftar: new Date().toISOString().split('T')[0],
    catatan: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingPetani) {
        setFormData({ ...editingPetani });
      } else {
        const newId = generatePetaniId(existingPetaniList);
        setFormData({
          petani_id: newId,
          nama_petani: '',
          no_hp: '',
          alamat: '',
          status_aktif: true,
          tanggal_daftar: new Date().toISOString().split('T')[0],
          catatan: '',
        });
      }
      setErrors({});
      setIsConfirmOpen(false);
    }
  }, [isOpen, editingPetani, existingPetaniList]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nama_petani || formData.nama_petani.trim().length < 2) {
      newErrors.nama_petani = 'Nama petani wajib diisi (minimal 2 karakter).';
    }

    if (!formData.no_hp || formData.no_hp.trim().length < 9) {
      newErrors.no_hp = 'Nomor HP wajib diisi (minimal 9 digit angka).';
    }

    if (!formData.alamat || formData.alamat.trim().length < 3) {
      newErrors.alamat = 'Alamat lengkap petani wajib diisi.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsConfirmOpen(true);
    }
  };

  const handleConfirmSave = () => {
    const finalData: Petani = {
      petani_id: formData.petani_id || generatePetaniId(existingPetaniList),
      nomor_kartu: formData.petani_id || generatePetaniId(existingPetaniList),
      nama_petani: (formData.nama_petani || '').trim(),
      no_hp: (formData.no_hp || '').trim(),
      alamat: (formData.alamat || '').trim(),
      desa_kecamatan: formData.alamat || '',
      status_aktif: formData.status_aktif ?? true,
      tanggal_daftar: formData.tanggal_daftar || new Date().toISOString().split('T')[0],
      catatan: formData.catatan || '',
      statistik: formData.statistik || {
        total_setoran_bal: 0,
        total_berat_kg: 0,
        kunjungan_terakhir: 'Belum Ada',
        grade_dominan: '-',
      },
    };

    onSave(finalData);
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
        <div className="bg-white border border-gray-300 w-full max-w-xl rounded-none shadow-2xl flex flex-col text-xs text-gray-800">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                  {isEdit ? `Edit Data Petani - ${formData.petani_id}` : 'Tambah Data Petani Baru'}
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  {isEdit ? 'Perbarui informasi master data petani tembakau' : 'Registrasi petani mitra tembakau (ID otomatis di-generate sistem)'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isEdit ? 'Simpan Perubahan' : 'Simpan Petani'}</span>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Auto Generated Petani ID */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Petani ID <span className="text-gray-400 font-normal text-[11px]">(Otomatis Sistem)</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={formData.petani_id || ''}
                  className="w-full bg-gray-100 border border-gray-300 rounded-sm px-3 py-2 text-xs font-mono font-bold text-gray-800 cursor-not-allowed select-all"
                />
                <span className="shrink-0 px-2.5 py-1.5 bg-green-50 text-green-700 border border-green-200 text-[11px] font-semibold rounded-sm">
                  Format: PTN-YYYY-XXX
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Petani ID dibuat otomatis berdasarkan tahun pendaftaran dan urutan nomor registrasi.
              </p>
            </div>

            {/* Nama Petani */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Nama Petani <span className="text-[#b81d24]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Contoh: H. Achmad Zaini / Mat Rokim"
                  value={formData.nama_petani || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, nama_petani: e.target.value });
                    if (errors.nama_petani) setErrors({ ...errors, nama_petani: '' });
                  }}
                  className={`w-full bg-white border ${
                    errors.nama_petani ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                  } rounded-sm px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]`}
                />
              </div>
              {errors.nama_petani && (
                <p className="text-[11px] text-red-600 font-medium mt-1">{errors.nama_petani}</p>
              )}
            </div>

            {/* Nomor HP */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Nomor HP / WhatsApp <span className="text-[#b81d24]">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890 / 087855667788"
                  value={formData.no_hp || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, no_hp: e.target.value });
                    if (errors.no_hp) setErrors({ ...errors, no_hp: '' });
                  }}
                  className={`w-full bg-white border ${
                    errors.no_hp ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                  } rounded-sm px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]`}
                />
              </div>
              {errors.no_hp && (
                <p className="text-[11px] text-red-600 font-medium mt-1">{errors.no_hp}</p>
              )}
            </div>

            {/* Alamat Lengkap */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Alamat Lengkap <span className="text-[#b81d24]">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Dusun Sumber Bening RT 01 / RW 02, Ds. Guluk-Guluk, Kec. Guluk-Guluk, Sumenep, Madura"
                value={formData.alamat || ''}
                onChange={(e) => {
                  setFormData({ ...formData, alamat: e.target.value });
                  if (errors.alamat) setErrors({ ...errors, alamat: '' });
                }}
                className={`w-full bg-white border ${
                  errors.alamat ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                } rounded-sm px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]`}
              />
              {errors.alamat && (
                <p className="text-[11px] text-red-600 font-medium mt-1">{errors.alamat}</p>
              )}
            </div>

            {/* Status Aktif */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-700 block">Status Kemitraan Petani</label>
                <p className="text-[11px] text-gray-500">
                  Petani aktif dapat melakukan transaksi penjualan di loket timbang
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
              <span>Semua data tersimpan otomatis di database sistem gudang.</span>
            </span>
            <span className="font-mono text-gray-400">{formData.tanggal_daftar}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title={isEdit ? 'Konfirmasi Perubahan Data Petani' : 'Konfirmasi Simpan Petani Baru'}
        message={`Apakah Anda yakin ingin ${isEdit ? 'memperbarui' : 'mendaftarkan'} data petani "${formData.nama_petani}" dengan ID ${formData.petani_id}?`}
        variant="primary"
        confirmText={isEdit ? 'Simpan Perubahan' : 'Ya, Daftarkan Petani'}
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

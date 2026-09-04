import re

content = """import React, { useState, useMemo } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Calendar,
  AlertCircle,
  X,
  Save
} from 'lucide-react';
import { TabelHarga, UserRole } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

interface HargaManagementProps {
  hargaList: TabelHarga[];
  userRole: UserRole;
  onSaveNewPrice: (newPrice: TabelHarga, oldPriceIdToArchive?: string) => void;
  onDeleteHarga?: (hargaId: string) => void;
}

export const HargaManagement: React.FC<HargaManagementProps> = ({
  hargaList = [],
  userRole,
  onSaveNewPrice,
  onDeleteHarga,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TabelHarga | null>(null);
  
  // Form State
  const [formKode, setFormKode] = useState('');
  const [formHarga, setFormHarga] = useState<number | ''>('');
  const [formTanggalBerlaku, setFormTanggalBerlaku] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<TabelHarga | null>(null);

  // Filtered List
  const filteredList = useMemo(() => {
    return hargaList.filter((item) => {
      const q = searchTerm.toLowerCase();
      return (
        item.kode_grade.toLowerCase().includes(q) ||
        (item.ketentuan || '').toLowerCase().includes(q)
      );
    });
  }, [hargaList, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormKode('');
    setFormHarga('');
    setFormTanggalBerlaku(new Date().toISOString().split('T')[0]);
    setFormKeterangan('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: TabelHarga) => {
    setEditingItem(item);
    setFormKode(item.kode_grade);
    setFormHarga(item.harga_per_kg);
    setFormTanggalBerlaku(item.tanggal_berlaku || new Date().toISOString().split('T')[0]);
    setFormKeterangan(item.ketentuan || '');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKode.trim()) {
      setErrorMessage('Kode harga beli wajib diisi.');
      return;
    }
    if (formHarga === '' || formHarga <= 0) {
      setErrorMessage('Harga beli tidak valid.');
      return;
    }

    // Check duplicate code
    const isDuplicate = hargaList.some(
      (h) => h.kode_grade.toLowerCase() === formKode.trim().toLowerCase() && h.harga_id !== editingItem?.harga_id
    );
    if (isDuplicate) {
      setErrorMessage(`Kode "${formKode}" sudah terdaftar.`);
      return;
    }

    const newItem: TabelHarga = {
      harga_id: editingItem ? editingItem.harga_id : `HB-${Date.now()}`,
      kode_grade: formKode.trim().toUpperCase(),
      nama_grade: formKode.trim().toUpperCase(),
      warna_badge: editingItem?.warna_badge || 'bg-slate-100 text-slate-800',
      harga_per_kg: Number(formHarga),
      ketentuan: formKeterangan,
      tanggal_berlaku: formTanggalBerlaku,
      rate_potongan_per_bal: editingItem?.rate_potongan_per_bal || 2000,
      berat_standar_kg: editingItem?.berat_standar_kg || 50,
    };

    onSaveNewPrice(newItem, editingItem ? editingItem.harga_id : undefined);
    
    setSuccessToast(editingItem ? 'Data Master Harga Beli berhasil diperbarui' : 'Master Harga Beli baru berhasil ditambahkan');
    setTimeout(() => setSuccessToast(''), 3000);
    
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete && onDeleteHarga) {
      onDeleteHarga(itemToDelete.harga_id);
      setSuccessToast('Data Master Harga Beli berhasil dihapus');
      setTimeout(() => setSuccessToast(''), 3000);
    }
    setItemToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-100 border border-emerald-400 text-emerald-800 px-4 py-3 rounded-xs shadow-lg flex items-center space-x-2 animate-in slide-in-from-right-4 fade-in">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-semibold text-sm">{successToast}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-5 rounded-sm shadow-xs border border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-sm">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Master Harga Beli</h1>
            <p className="text-xs text-gray-500 mt-0.5">Kelola kode harga beli dan kriteria tembakau</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {userRole === 'admin_utama' && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-[#b81d24] hover:bg-[#991b1b] text-white text-xs font-bold rounded-xs flex items-center space-x-2 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Master Harga Beli</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-sm shadow-xs border border-gray-200 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kode atau kriteria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Total: {filteredList.length} Kode
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3 w-40">Kode</th>
                <th className="p-3 w-40">Harga Beli</th>
                <th className="p-3 w-40">Tgl Berlaku</th>
                <th className="p-3 min-w-[200px]">Keterangan (Kriteria Tembakau)</th>
                {userRole === 'admin_utama' && <th className="p-3 w-28 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'admin_utama' ? 5 : 4} className="p-8 text-center">
                    <div className="text-sm font-bold text-gray-700">Tidak ada data Master Harga Beli</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {searchTerm ? 'Coba ubah kata kunci pencarian Anda' : 'Klik tombol Tambah Master Harga Beli untuk membuat data baru'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.harga_id} className="hover:bg-blue-50/50 transition">
                    <td className="p-3 font-mono font-bold text-gray-900">
                      {item.kode_grade}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-700">
                      {formatRupiah(item.harga_per_kg)}/kg
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1.5 text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.tanggal_berlaku || '-'}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-700 leading-relaxed line-clamp-2">
                        {item.ketentuan || '-'}
                      </div>
                    </td>
                    {userRole === 'admin_utama' && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xs transition cursor-pointer"
                            title="Edit Master Harga Beli"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xs transition cursor-pointer"
                            title="Hapus Master Harga Beli"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-md border border-gray-300 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold">
                  {editingItem ? 'Edit Master Harga Beli' : 'Tambah Master Harga Beli Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-5 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-300 text-xs text-red-800 rounded-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Kode */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-800">
                  Kode Harga Beli <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: A, B, C, A-SUPER..."
                  value={formKode}
                  onChange={(e) => setFormKode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xs uppercase focus:ring-1 focus:ring-gray-700"
                  required
                />
              </div>

              {/* Harga Beli */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-800">
                  Harga Beli (Rp / Kg) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-gray-600 font-mono">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 140000"
                    value={formHarga}
                    onChange={(e) => setFormHarga(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-emerald-900 bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                    required
                  />
                  <span className="text-xs text-gray-500">/kg</span>
                </div>
                {formHarga !== '' && Number(formHarga) > 0 && (
                  <p className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                    Terbaca: {formatRupiah(Number(formHarga))} per kilogram
                  </p>
                )}
              </div>

              {/* Tanggal Berlaku */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-800">
                  Tanggal Berlaku <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formTanggalBerlaku}
                  onChange={(e) => setFormTanggalBerlaku(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                  required
                />
              </div>

              {/* Keterangan */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-800">Keterangan (Kriteria Tembakau):</label>
                <textarea
                  rows={3}
                  placeholder="Deskripsikan kriteria untuk harga ini. Misal: Daun atas, warna kuning cerah, tidak ada bercak, aroma tajam..."
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#b81d24] hover:bg-[#991b1b] text-white text-xs font-bold rounded-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <ConfirmModal
          isOpen={true}
          title="Hapus Master Harga Beli"
          message={`Apakah Anda yakin ingin menghapus kode harga beli "${itemToDelete.kode_grade}" (${formatRupiah(itemToDelete.harga_per_kg)}/kg)? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Hapus Data"
          cancelLabel="Batal"
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
          isDanger={true}
        />
      )}
    </div>
  );
};
"""
with open('src/components/harga/HargaManagement.tsx', 'w') as f:
    f.write(content)
print("written")

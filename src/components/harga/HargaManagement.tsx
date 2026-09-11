import React, { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp,  
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
import { Pagination } from '../common/Pagination';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TabelHarga | null>(null);

  // Status counts
  const countActive = useMemo(() => hargaList.filter((h) => h.status === 'aktif').length, [hargaList]);
  const countInactive = useMemo(() => hargaList.filter((h) => h.status === 'nonaktif').length, [hargaList]);
  
  const canManage = userRole === 'superadmin' || userRole === 'admin_utama';
  const [formKode, setFormKode] = useState('');
  const [formHarga, setFormHarga] = useState<number | ''>('');
  const [formTanggalBerlaku, setFormTanggalBerlaku] = useState('');
  const [formStatusAktif, setFormStatusAktif] = useState(true);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<TabelHarga | null>(null);

  // Filtered List
  const filteredList = useMemo(() => {
    return hargaList.filter((item) => {
      if (statusFilter === 'active' && item.status !== 'aktif') return false;
      if (statusFilter === 'inactive' && item.status !== 'nonaktif') return false;

      const q = searchTerm.toLowerCase();
      return (
        item.kode_grade.toLowerCase().includes(q)
      );
    });
  }, [hargaList, searchTerm, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormKode('');
    setFormHarga('');
    setFormTanggalBerlaku(new Date().toISOString().split('T')[0]);
    setFormStatusAktif(true);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: TabelHarga) => {
    setEditingItem(item);
    setFormKode(item.kode_grade);
    setFormHarga(item.harga_per_kg);
    setFormTanggalBerlaku(item.tanggal_berlaku || new Date().toISOString().split('T')[0]);
    setFormStatusAktif(item.status === 'aktif');
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
            tanggal_berlaku: formTanggalBerlaku,
      rate_potongan_per_bal: editingItem?.rate_potongan_per_bal || 2000,
      berat_standar_kg: editingItem?.berat_standar_kg || 50,
      status: formStatusAktif ? 'aktif' : 'nonaktif',
      dibuat_oleh: editingItem?.dibuat_oleh || 'System',
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
    <div className="space-y-4 font-sans text-gray-800">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-100 border border-emerald-400 text-emerald-800 px-4 py-3 rounded-xs shadow-lg flex items-center space-x-2 animate-in slide-in-from-right-4 fade-in">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-semibold text-sm">{successToast}</span>
        </div>
      )}

      {/* 1. Filter Section */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-gray-800 bg-white hover:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <span className="text-[#b81d24] font-black">▼</span>
            <span className="font-bold tracking-wide uppercase text-xs">Filter Harga Beli</span>
          </div>
          {isFilterOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {isFilterOpen && (
          <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-gray-600 font-semibold mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Status ({hargaList.length})</option>
                <option value="active">✓ Hanya Aktif ({countActive})</option>
                <option value="inactive">✕ Nonaktif ({countInactive})</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-sm transition cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {/* Header Actions */}
        <div className="p-3 sm:px-4 sm:py-2.5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">
              Master Data Harga Beli
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-red-50 text-[#b81d24] border border-red-200 rounded-sm">
              {filteredList.length} Grade
            </span>
            {statusFilter !== 'all' && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border ${
                statusFilter === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {statusFilter === 'active' ? 'Filter: Hanya Aktif' : 'Filter: Nonaktif'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {canManage && (
              <button
                onClick={handleOpenAddModal}
                className="px-3 py-1.5 bg-[#b81d24] text-white hover:bg-[#991b1b] text-xs font-bold rounded-sm flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Tambah Master</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Toolbar / Controls */}
        <div className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Tampil</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-sm px-2 py-1 bg-white text-xs text-gray-800 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-gray-600">Data Per Halaman</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-gray-600 font-medium">Pencarian:</span>
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Cari kode..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border border-gray-300 rounded-sm px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-gray-200 text-[11px] font-bold text-gray-700">
                <th className="py-2.5 px-3 border-r border-gray-200 w-12 text-center">No</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-32">Kode</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-40">Harga Beli</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-32">Tgl Berlaku</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-24 text-center">Status</th>
                {canManage && <th className="py-2.5 px-3 text-center w-24">Aksi</th>}
              </tr>
            </thead>
            <tbody className="text-xs text-gray-800">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="py-8 text-center text-gray-500 bg-white">
                    <div className="text-sm font-bold text-gray-700">Tidak ada data Master Harga Beli</div>
                    <div className="mt-1">
                      {statusFilter !== 'all' || searchTerm
                        ? 'Coba sesuaikan kata kunci pencarian atau reset filter status'
                        : 'Klik tombol Tambah Master Harga Beli untuk membuat data baru'}
                    </div>
                    {(statusFilter !== 'all' || searchTerm) && (
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setSearchTerm('');
                          setCurrentPage(1);
                        }}
                        className="mt-3 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs font-medium rounded-sm transition cursor-pointer"
                      >
                        Reset Semua Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, index) => (
                  <tr key={item.harga_id} className="hover:bg-[#f8f9fa] transition-colors border-b border-gray-100 last:border-0">
                    <td className="py-2.5 px-3 border-r border-gray-200 text-center text-gray-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-[#b81d24]">
                      {item.kode_grade}
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-gray-900">
                      {formatRupiah(item.harga_per_kg)}/kg
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200">
                      <div className="flex items-center space-x-1.5 text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.tanggal_berlaku || '-'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                      {item.status === 'aktif' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-sm text-[10px] font-bold flex items-center justify-center space-x-1 w-max mx-auto">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-sm text-[10px] font-bold flex items-center justify-center space-x-1 w-max mx-auto">
                          <XCircle className="w-3 h-3" />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-[#b81d24] hover:text-[#9e161c] hover:bg-rose-50 rounded-xs transition cursor-pointer"
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

        {/* Pagination Controls */}
        <div className="p-3 bg-white border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredList.length}
            itemsPerPage={itemsPerPage}
          />
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


              
              {/* Status Aktif */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-status-aktif-beli"
                  checked={formStatusAktif}
                  onChange={(e) => setFormStatusAktif(e.target.checked)}
                  className="rounded-xs text-[#b81d24] focus:ring-[#b81d24]"
                />
                <label htmlFor="chk-status-aktif-beli" className="text-xs text-gray-700 select-none cursor-pointer">
                  Aktifkan kode harga ini
                </label>
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

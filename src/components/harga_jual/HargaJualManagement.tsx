import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp,  
  DollarSign, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  FileText,
  X,
  Save,
  Check
 } from 'lucide-react';
import { MasterHargaJual } from '../../types';
import { formatRupiah, formatNumber } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import { Pagination } from '../common/Pagination';

interface HargaJualManagementProps {
  hargaJualList: MasterHargaJual[];
  onSaveHargaJual: (item: MasterHargaJual) => void;
  onDeleteHargaJual: (id: string) => void;
}

export const HargaJualManagement: React.FC<HargaJualManagementProps> = ({
  hargaJualList,
  onSaveHargaJual,
  onDeleteHargaJual,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterHargaJual | null>(null);
  
  // Form State
  const [formKode, setFormKode] = useState('');
  const [formHargaJual, setFormHargaJual] = useState<number | ''>('');
  const [formTanggalBerlaku, setFormTanggalBerlaku] = useState('');
  const [formStatusAktif, setFormStatusAktif] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<MasterHargaJual | null>(null);

  // Filtered List
  const filteredList = useMemo(() => {
    return hargaJualList.filter((item) => {
      const isActive = item.status_aktif !== false;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;

      const matchSearch = 
        item.kode.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [hargaJualList, searchTerm, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  // Summary Metrics
  const totalEntries = hargaJualList.length;
  const activeEntries = hargaJualList.filter((h) => h.status_aktif !== false).length;
  const inactiveEntries = hargaJualList.filter((h) => h.status_aktif === false).length;
  const maxPrice = useMemo(() => {
    if (hargaJualList.length === 0) return 0;
    return Math.max(...hargaJualList.map((h) => h.harga_jual));
  }, [hargaJualList]);
  const minPrice = useMemo(() => {
    if (hargaJualList.length === 0) return 0;
    return Math.min(...hargaJualList.map((h) => h.harga_jual));
  }, [hargaJualList]);

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormKode('');
    setFormHargaJual('');
    const today = new Date().toISOString().split('T')[0];
    setFormTanggalBerlaku(today);
    setFormStatusAktif(true);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: MasterHargaJual) => {
    setEditingItem(item);
    setFormKode(item.kode);
    setFormHargaJual(item.harga_jual);
    setFormTanggalBerlaku(item.tanggal_berlaku || new Date().toISOString().split('T')[0]);
    setFormStatusAktif(item.status_aktif !== false);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Save Item
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKode.trim()) {
      setErrorMessage('Kode harga jual wajib diisi!');
      return;
    }
    if (!formHargaJual || Number(formHargaJual) <= 0) {
      setErrorMessage('Harga jual harus lebih dari 0!');
      return;
    }
    if (!formTanggalBerlaku) {
      setErrorMessage('Tanggal berlaku wajib diisi!');
      return;
    }

    // Check duplicate code
    const isDuplicate = hargaJualList.some(
      (h) => h.kode.toLowerCase() === formKode.trim().toLowerCase() && 
             (!editingItem || h.harga_jual_id !== editingItem.harga_jual_id)
    );
    if (isDuplicate) {
      setErrorMessage(`Kode harga jual "${formKode}" sudah terdaftar! Gunakan kode lain.`);
      return;
    }

    const payload: MasterHargaJual = {
      harga_jual_id: editingItem ? editingItem.harga_jual_id : `HJ-${Date.now()}`,
      kode: formKode.trim().toUpperCase(),
      harga_jual: Number(formHargaJual),
      tanggal_berlaku: formTanggalBerlaku,
      status_aktif: formStatusAktif,
    };

    onSaveHargaJual(payload);
    setIsModalOpen(false);
    setSuccessToast(editingItem ? 'Data Master Harga Jual berhasil diperbarui' : 'Master Harga Jual baru berhasil ditambahkan');
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      onDeleteHargaJual(itemToDelete.harga_jual_id);
      setItemToDelete(null);
      setSuccessToast(`Kode "${itemToDelete.kode}" berhasil dihapus`);
      setTimeout(() => setSuccessToast(''), 3500);
    }
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
            <span className="font-bold tracking-wide uppercase text-xs">Filter Harga Jual</span>
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
                <option value="all">Semua Status ({hargaJualList.length})</option>
                <option value="active">✓ Hanya Aktif ({activeEntries})</option>
                <option value="inactive">✕ Nonaktif ({inactiveEntries})</option>
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
              Master Data Harga Jual
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-red-50 text-[#b81d24] border border-red-200 rounded-sm">
              {filteredList.length} Kode
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
            <button
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 bg-[#b81d24] text-white hover:bg-[#991b1b] text-xs font-bold rounded-sm flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Tambah Master</span>
            </button>
          </div>
        </div>

        {/* Table Toolbar / Controls */}
        <div className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5">
              <span className="text-gray-600 font-medium">Tampil</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-sm px-2 py-1 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#b81d24] cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-gray-500">per hal.</span>
            </div>
            {(searchTerm.trim() || statusFilter !== 'all') && (
              <span className="text-[11px] text-gray-500 font-medium">
                Ditemukan: <strong className="text-gray-900">{filteredList.length}</strong> harga jual
              </span>
            )}
          </div>

          {/* Kolom Pencarian Utama */}
          <div className="w-full sm:w-80 md:w-96">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-harga-jual-input"
                type="text"
                placeholder="Cari master harga jual (Kode, Grade)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  id="btn-clear-search-harga-jual"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
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
                <th className="py-2.5 px-3 border-r border-gray-200 w-40">Harga Jual</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-32">Tgl Berlaku</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-24 text-center">Status</th>
                <th className="py-2.5 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-800">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 bg-white">
                    <div className="text-sm font-bold text-gray-700">Tidak ada data Master Harga Jual</div>
                    <div className="mt-1">
                      {statusFilter !== 'all' || searchTerm
                        ? 'Coba sesuaikan kata kunci pencarian atau reset filter status'
                        : 'Klik tombol Tambah Master untuk membuat data baru'}
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
                  <tr key={item.harga_jual_id} className="hover:bg-[#f8f9fa] transition-colors border-b border-gray-100 last:border-0">
                    <td className="py-2.5 px-3 border-r border-gray-200 text-center text-gray-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-[#b81d24]">
                      {item.kode}
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-gray-900">
                      {formatRupiah(item.harga_jual)}/kg
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200">
                      <div className="flex items-center space-x-1.5 text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.tanggal_berlaku || '-'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                      {item.status_aktif !== false ? (
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
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xs transition cursor-pointer"
                          title="Edit Master Harga Jual"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xs transition cursor-pointer"
                          title="Hapus Master Harga Jual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
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
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold">
                  {editingItem ? 'Edit Master Harga Jual' : 'Tambah Master Harga Jual Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition"
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
                  Kode Harga Jual <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: HJ-45, HJ-43, HJ-SUPER-150..."
                  value={formKode}
                  onChange={(e) => setFormKode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xs uppercase focus:ring-1 focus:ring-gray-700"
                  required
                />
                <p className="text-[10px] text-gray-500">
                  Kode ini yang akan muncul pada pilihan dropdown di pengiriman sample & DO.
                </p>
              </div>

              {/* Harga Jual */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-800">
                  Harga Jual (Rp / Kg) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-gray-600 font-mono">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 45000 atau 43000"
                    value={formHargaJual}
                    onChange={(e) => setFormHargaJual(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-emerald-900 bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                    required
                  />
                  <span className="text-xs text-gray-500">/kg</span>
                </div>
                {formHargaJual !== '' && Number(formHargaJual) > 0 && (
                  <p className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                    Terbaca: {formatRupiah(Number(formHargaJual))} per kilogram
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
                  id="chk-status-aktif"
                  checked={formStatusAktif}
                  onChange={(e) => setFormStatusAktif(e.target.checked)}
                  className="rounded-xs text-[#b81d24] focus:ring-[#b81d24]"
                />
                <label htmlFor="chk-status-aktif" className="text-xs text-gray-700 select-none cursor-pointer">
                  Aktifkan kode harga ini (tampil pada dropdown pemilihan)
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
          title="Hapus Master Harga Jual"
          message={`Apakah Anda yakin ingin menghapus kode harga jual "${itemToDelete.kode}" (${formatRupiah(itemToDelete.harga_jual)}/kg)? Tindakan ini tidak dapat dibatalkan.`}
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

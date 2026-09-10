import React, { useState, useMemo } from 'react';
import { 
  Warehouse, 
  Plus, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Edit3, 
  Trash2,
  MapPin, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  CheckCircle,
  Ban
} from 'lucide-react';
import { Gudang, Barang, UserRole } from '../../types';
import { GudangFormModal } from './GudangFormModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { Pagination } from '../common/Pagination';

interface GudangManagementProps {
  gudangList: Gudang[];
  barangList: Barang[];
  userRole: UserRole;
  onSaveGudang: (gudang: Gudang) => void;
  onUpdateGudang: (gudang: Gudang) => void;
  onDeleteGudang?: (gudangId: string) => void;
}

export const GudangManagement: React.FC<GudangManagementProps> = ({
  gudangList = [],
  barangList = [],
  userRole,
  onSaveGudang,
  onUpdateGudang,
  onDeleteGudang,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGudang, setEditingGudang] = useState<Gudang | null>(null);

  // Status counts for quick filter
  const countActive = useMemo(() => gudangList.filter((g) => g.status_aktif).length, [gudangList]);
  const countInactive = useMemo(() => gudangList.filter((g) => !g.status_aktif).length, [gudangList]);

  // Generic Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'primary' | 'success';
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    confirmText: 'Lanjutkan',
    onConfirm: () => {},
  });

  // Calculate live occupancy for each warehouse
  const warehouseStats = useMemo(() => {
    return gudangList.map((g) => {
      const activeBal = barangList.filter(
        (b) =>
          b.status_stok === 'di_gudang' &&
          (b.gudang_id === g.gudang_id ||
            b.lokasi_gudang.toLowerCase().includes((g.nama_gudang || '').toLowerCase()) ||
            b.lokasi_gudang.toLowerCase().includes(g.kode_gudang.toLowerCase()))
      );

      const totalKg = activeBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
      const occupancyPct = g.kapasitas_bal > 0 ? Math.min(Math.round((activeBal.length / g.kapasitas_bal) * 100), 100) : 0;

      return {
        ...g,
        terisi_bal: activeBal.length,
        total_kg: totalKg,
        occupancy_pct: occupancyPct,
      };
    });
  }, [gudangList, barangList]);

  // Filtered List
  const filteredGudang = useMemo(() => {
    return warehouseStats.filter((g) => {
      if (statusFilter === 'active' && !g.status_aktif) return false;
      if (statusFilter === 'inactive' && g.status_aktif) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const matchSearch =
        (g.nama_gudang || '').toLowerCase().includes(q) ||
        g.kode_gudang.toLowerCase().includes(q) ||
        (g.kepala_gudang || '').toLowerCase().includes(q) ||
        (g.alamat || '').toLowerCase().includes(q) ||
        (g.kontak || '').includes(q);

      return matchSearch;
    });
  }, [warehouseStats, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredGudang.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGudang.slice(start, start + itemsPerPage);
  }, [filteredGudang, currentPage, itemsPerPage]);

  const canManageGudang = userRole === 'superadmin' || userRole === 'kepala_gudang';

  const handleEdit = (gudang: Gudang) => {
    setEditingGudang(gudang);
    setIsFormModalOpen(true);
  };

  const handleToggleStatus = (gudang: Gudang) => {
    const updated: Gudang = {
      ...gudang,
      status_aktif: !gudang.status_aktif,
    };
    setConfirmDialog({
      isOpen: true,
      title: gudang.status_aktif ? 'Nonaktifkan Gudang' : 'Aktifkan Fasilitas Gudang',
      message: `Apakah Anda yakin ingin ${
        gudang.status_aktif ? 'menonaktifkan' : 'mengaktifkan'
      } gudang "${gudang.nama_gudang}" (${gudang.kode_gudang})?`,
      variant: gudang.status_aktif ? 'danger' : 'primary',
      confirmText: gudang.status_aktif ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan',
      onConfirm: () => {
        onUpdateGudang(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDelete = (gudang: Gudang) => {
    // Check if any bal is in this gudang
    const balInGudang = barangList.filter(
      (b) => b.lokasi_gudang.toLowerCase().includes(gudang.nama_gudang.toLowerCase()) ||
             b.lokasi_gudang.toLowerCase().includes(gudang.kode_gudang.toLowerCase())
    ).length;

    setConfirmDialog({
      isOpen: true,
      title: 'Konfirmasi Hapus Data Master Gudang',
      message: `Apakah Anda yakin ingin menghapus data fasilitas gudang "${gudang.nama_gudang}" (${gudang.kode_gudang})?`,
      variant: 'danger',
      confirmText: 'Hapus Permanen',
      onConfirm: () => {
        if (onDeleteGudang) {
          onDeleteGudang(gudang.gudang_id);
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* 1. Filter Section */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-gray-800 bg-white hover:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <span className="text-[#b81d24] font-black">▼</span>
            <span className="font-bold tracking-wide uppercase text-xs">Filter Fasilitas Gudang</span>
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
              <label className="block text-gray-600 font-semibold mb-1">Status Fasilitas</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Status Gudang</option>
                <option value="active">Aktif Saja</option>
                <option value="inactive">Nonaktif Saja</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
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
              Master Data Fasilitas Gudang Tembakau
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-red-50 text-[#b81d24] border border-red-200 rounded-sm">
              {filteredGudang.length} Lokasi
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
            {canManageGudang && (
              <button
                onClick={() => {
                  setEditingGudang(null);
                  setIsFormModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Gudang Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Controls (Tampil X Data Per Halaman & Pencarian) */}
        <div className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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
              </select>
              <span className="text-gray-600">Data Per Halaman</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-600 font-medium">Pencarian:</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari Kode, Nama, Penanggung Jawab..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-sm px-2.5 py-1 text-xs text-gray-800 w-52 sm:w-64 focus:outline-none focus:border-[#b81d24]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
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
                <th className="py-2.5 px-3 text-center w-12 border-r border-gray-200">No</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-32 font-mono">Kode Gudang</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Nama Gudang</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Alamat Lengkap</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center w-28">Kapasitas (Bal)</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-44">Penanggung Jawab</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center w-36">Nomor HP</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center w-24">Status</th>
                <th className="py-2.5 px-3 text-center w-28">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 text-xs">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500 bg-white">
                    <div className="text-sm font-bold text-gray-700">Tidak ada data fasilitas gudang</div>
                    <div className="mt-1">
                      {statusFilter !== 'all' || searchQuery
                        ? 'Coba sesuaikan kata kunci pencarian atau reset filter status'
                        : 'Klik tombol Tambah Gudang Baru untuk membuat data baru'}
                    </div>
                    {(statusFilter !== 'all' || searchQuery) && (
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setSearchQuery('');
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
                paginatedData.map((gudang, index) => {
                  const itemNumber = (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <tr key={gudang.gudang_id} className="hover:bg-[#f8f9fa] transition-colors">
                      {/* No */}
                      <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-gray-600">
                        {itemNumber}
                      </td>

                      {/* Kode Gudang */}
                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-[#b81d24]">
                        {gudang.kode_gudang}
                      </td>

                      {/* Nama Gudang */}
                      <td className="py-2.5 px-3 border-r border-gray-200 font-bold text-gray-900">
                        {gudang.nama_gudang}
                      </td>

                      {/* Alamat */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-gray-700 truncate max-w-xs">
                        {gudang.alamat}
                      </td>

                      {/* Kapasitas */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-800">
                        {gudang.kapasitas_bal} Bal
                      </td>

                      {/* Penanggung Jawab */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-gray-800 font-medium">
                        {gudang.kepala_gudang}
                      </td>

                      {/* Nomor HP */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-700">
                        {gudang.kontak}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                          gudang.status_aktif 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {gudang.status_aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {canManageGudang && (
                            <button
                              onClick={() => handleEdit(gudang)}
                              className="w-6 h-6 rounded-full bg-[#b81d24] hover:bg-[#96141a] text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                              title="Edit Fasilitas Gudang"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canManageGudang && (
                            <button
                              onClick={() => handleToggleStatus(gudang)}
                              className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs ${
                                gudang.status_aktif ? 'bg-[#6c757d] hover:bg-[#5a6268]' : 'bg-[#28a745] hover:bg-[#218838]'
                              }`}
                              title={gudang.status_aktif ? 'Nonaktifkan Gudang' : 'Aktifkan Gudang'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canManageGudang && onDeleteGudang && (
                            <button
                              onClick={() => handleDelete(gudang)}
                              className="w-6 h-6 rounded-full bg-[#dc3545] hover:bg-[#c82333] text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                              title="Hapus Fasilitas Gudang"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sliding 3-Number Window Pagination */}
        <div className="p-3 bg-white border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredGudang.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>

      </div>

      {/* Gudang Form Modal */}
      {isFormModalOpen && (
        <GudangFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingGudang(null);
          }}
          onSave={(savedGudang) => {
            if (editingGudang) {
              onUpdateGudang(savedGudang);
            } else {
              onSaveGudang(savedGudang);
            }
          }}
          editingGudang={editingGudang}
          existingGudangList={gudangList}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

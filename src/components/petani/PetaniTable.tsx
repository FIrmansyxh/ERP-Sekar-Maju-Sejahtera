import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Upload, 
  Printer, 
  Edit3, 
  Trash2,
  Info, 
  Ban, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  X,
  Phone,
  MapPin,
  User,
  Filter
} from 'lucide-react';
import { Petani, UserRole } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { canUserPerform } from '../../utils/rbac';
import { Pagination } from '../common/Pagination';
import { ConfirmModal } from '../common/ConfirmModal';

interface PetaniTableProps {
  data: Petani[];
  userRole: UserRole;
  onAddPetani: () => void;
  onEditPetani: (petani: Petani) => void;
  onViewDetail: (petani: Petani) => void;
  onPrintCard: (petani: Petani) => void;
  onToggleStatus: (petani: Petani) => void;
  onResetCardNumber?: (petani: Petani) => void;
  onDeletePetani?: (petani: Petani) => void;
  onOpenImportExport: () => void;
}

export const PetaniTable: React.FC<PetaniTableProps> = ({
  data = [],
  userRole,
  onAddPetani,
  onEditPetani,
  onViewDetail,
  onPrintCard,
  onToggleStatus,
  onResetCardNumber,
  onDeletePetani,
  onOpenImportExport,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>('petani_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deletingPetaniTarget, setDeletingPetaniTarget] = useState<Petani | null>(null);

  const countActive = useMemo(() => data.filter((p) => p.status_aktif).length, [data]);
  const countInactive = useMemo(() => data.filter((p) => !p.status_aktif).length, [data]);

  // Filter & Sort Logic
  const filteredData = useMemo(() => {
    return data
      .filter((p) => {
        if (statusFilter === 'active' && !p.status_aktif) return false;
        if (statusFilter === 'inactive' && p.status_aktif) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.nama_petani.toLowerCase().includes(q);
          const matchId = p.petani_id.toLowerCase().includes(q);
          const matchAddress = (p.alamat || '').toLowerCase().includes(q) || (p.desa_kecamatan || '').toLowerCase().includes(q);
          const matchPhone = (p.no_hp || '').includes(q);
          return matchName || matchId || matchAddress || matchPhone;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'nama') cmp = a.nama_petani.localeCompare(b.nama_petani);
        else if (sortBy === 'petani_id') cmp = a.petani_id.localeCompare(b.petani_id);
        else if (sortBy === 'tanggal') cmp = (a.tanggal_daftar || '').localeCompare(b.tanggal_daftar || '');
        else if (sortBy === 'setoran') {
          const balA = a.statistik?.total_setoran_bal || 0;
          const balB = b.statistik?.total_setoran_bal || 0;
          cmp = balA - balB;
        } else {
          cmp = a.petani_id.localeCompare(b.petani_id);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [data, searchQuery, statusFilter, sortBy, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Render clean single sort arrow indicator
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return null;
    }
    return (
      <span className="text-xs font-black text-[#b81d24] ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const canManagePetani = canUserPerform(userRole, 'canCreatePetani');

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
            <span className="font-bold tracking-wide uppercase text-xs">Filter Data Petani</span>
          </div>
          {isFilterOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isFilterOpen && (
          <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Status Filter */}
            <div>
              <label className="block text-gray-600 font-semibold mb-1">Status Kemitraan</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif Saja</option>
                <option value="inactive">Nonaktif Saja</option>
              </select>
            </div>

            {/* Urutan */}
            <div>
              <label className="block text-gray-600 font-semibold mb-1">Urutkan Berdasarkan</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="petani_id">Petani ID (PTN-YYYY-XXX)</option>
                <option value="nama">Nama Petani (A - Z)</option>
                <option value="tanggal">Tanggal Pendaftaran</option>
                <option value="setoran">Total Setoran Bal</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSortBy('petani_id');
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">
              Master Data Petani Tembakau
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-red-50 text-[#b81d24] border border-red-200 rounded-sm">
              {filteredData.length} Petani
            </span>
            {statusFilter === 'active' && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>Filter: Hanya Aktif</span>
              </span>
            )}
            {statusFilter === 'inactive' && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded-sm flex items-center space-x-1">
                <Ban className="w-3 h-3 text-red-600" />
                <span>Filter: Nonaktif</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenImportExport}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-gray-500" />
              <span>Import / Export</span>
            </button>

            {canManagePetani && (
              <button
                onClick={onAddPetani}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Petani Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Controls (Tampil X Data Per Halaman, Quick Filter Status & Pencarian) */}
        <div className="p-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Tampil X Data Per Halaman */}
            <div className="flex items-center space-x-1.5">
              <span className="text-gray-600 font-medium">Tampil</span>
              <select
                id="select-items-per-page-petani"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-sm px-2 py-1 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#b81d24] cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={data.length || 1000}>All</option>
              </select>
            </div>

            {/* Dropdown Filter Status Cepat Petani */}
            <div className="flex items-center space-x-2 pl-0 sm:pl-3 sm:border-l sm:border-gray-200">
              <label htmlFor="filter-petani-status-quick" className="text-gray-700 font-semibold flex items-center space-x-1 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <span>Status:</span>
              </label>
              <div className="relative inline-block">
                <select
                  id="filter-petani-status-quick"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                    setCurrentPage(1);
                  }}
                  className={`border rounded-sm pl-2.5 pr-7 py-1 text-xs font-semibold appearance-none cursor-pointer focus:outline-none transition ${
                    statusFilter === 'active'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 focus:border-emerald-600 shadow-xs'
                      : statusFilter === 'inactive'
                      ? 'border-red-400 bg-red-50 text-red-800 focus:border-red-500 shadow-xs'
                      : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400 focus:border-[#b81d24]'
                  }`}
                >
                  <option value="all">Semua Status ({data.length})</option>
                  <option value="active">✓ Hanya Aktif ({countActive})</option>
                  <option value="inactive">✕ Nonaktif ({countInactive})</option>
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {statusFilter !== 'all' && (
                <button
                  type="button"
                  id="btn-reset-filter-status-petani"
                  onClick={() => {
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-[11px] font-medium text-gray-600 hover:text-red-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-sm transition cursor-pointer flex items-center space-x-1"
                  title="Kembalikan filter ke Semua Status"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-600 font-medium">Pencarian:</span>
            <div className="relative">
              <input
                id="search-petani-input"
                type="text"
                placeholder="Cari ID, Nama, No. HP, Alamat..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-sm px-2.5 py-1 text-xs text-gray-800 w-52 sm:w-64 focus:outline-none focus:border-[#b81d24]"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="btn-clear-search-petani"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
                <th 
                  onClick={() => handleSort('petani_id')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 select-none w-36"
                >
                  <div className="flex items-center justify-between">
                    <span>Petani ID</span>
                    {renderSortIcon('petani_id')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nama')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center justify-between">
                    <span>Nama Petani</span>
                    {renderSortIcon('nama')}
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-36 text-center">Nomor HP</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Alamat Lengkap</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center w-24">Status</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center w-24">Total Bal</th>
                <th className="py-2.5 px-3 text-center w-28">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 text-xs">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    <div>Tidak ada data petani yang sesuai dengan kriteria filter atau pencarian.</div>
                    {(statusFilter !== 'all' || searchQuery.trim() !== '') && (
                      <button
                        type="button"
                        id="btn-empty-state-reset-filter"
                        onClick={() => {
                          setStatusFilter('all');
                          setSearchQuery('');
                          setCurrentPage(1);
                        }}
                        className="mt-2 inline-flex items-center space-x-1 text-xs text-[#b81d24] hover:underline font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Tampilkan Semua Petani (Reset Filter)</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedData.map((petani, index) => {
                  const itemNumber = (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <tr 
                      key={petani.petani_id}
                      className={`transition-colors hover:bg-amber-50/60 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}
                    >
                      {/* No */}
                      <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-gray-600">
                        {itemNumber}
                      </td>

                      {/* Petani ID */}
                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-[#b81d24]">
                        {petani.petani_id}
                      </td>

                      {/* Nama Petani */}
                      <td className="py-2.5 px-3 border-r border-gray-200 font-bold text-gray-900">
                        {petani.nama_petani}
                      </td>

                      {/* No HP */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-700">
                        {petani.no_hp || '-'}
                      </td>

                      {/* Alamat */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-gray-700 truncate max-w-xs">
                        {petani.alamat || petani.desa_kecamatan || '-'}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                          petani.status_aktif 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {petani.status_aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Total Bal */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-medium text-gray-800">
                        {petani.statistik?.total_setoran_bal || 0} Bal
                      </td>

                      {/* Action Buttons */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Info Button */}
                          <button
                            onClick={() => onViewDetail(petani)}
                            className="w-6 h-6 rounded-full bg-[#6c757d] hover:bg-[#5a6268] text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                            title="Detail Petani"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          {/* Print ID Card Button */}
                          <button
                            onClick={() => onPrintCard(petani)}
                            className="w-6 h-6 rounded-full bg-[#17a2b8] hover:bg-[#138496] text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                            title="Cetak ID Card Petani"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          {canManagePetani && (
                            <button
                              onClick={() => onEditPetani(petani)}
                              className="w-6 h-6 rounded-full bg-[#b81d24] hover:bg-[#96141a] text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                              title="Edit Data"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Status Toggle Button */}
                          {canManagePetani && (
                            <button
                              onClick={() => onToggleStatus(petani)}
                              className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs ${
                                petani.status_aktif ? 'bg-[#c82333] hover:bg-[#bd2130]' : 'bg-[#28a745] hover:bg-[#218838]'
                              }`}
                              title={petani.status_aktif ? 'Nonaktifkan Petani' : 'Aktifkan Kembali'}
                            >
                              {petani.status_aktif ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            </button>
                          )}
                          {/* Delete Petani Button */}
                          {canManagePetani && onDeletePetani && (
                            <button
                              onClick={() => setDeletingPetaniTarget(petani)}
                              className="w-6 h-6 rounded-full bg-[#dc3545] hover:bg-[#c82333] text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                              title="Hapus Data Petani"
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
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>

      </div>

      {/* Confirmation Modal Delete Petani */}
      <ConfirmModal
        isOpen={Boolean(deletingPetaniTarget)}
        title="Konfirmasi Hapus Data Petani"
        message={`Apakah Anda yakin ingin menghapus data petani "${deletingPetaniTarget?.nama_petani}" (${deletingPetaniTarget?.nomor_kartu}) dari Master Petani?`}
        detail="Perhatian: Tindakan ini akan menghapus data registrasi petani dari sistem master data."
        variant="danger"
        confirmText="Hapus Permanen"
        onConfirm={() => {
          if (deletingPetaniTarget && onDeletePetani) {
            onDeletePetani(deletingPetaniTarget);
          }
          setDeletingPetaniTarget(null);
        }}
        onCancel={() => setDeletingPetaniTarget(null)}
      />

    </div>
  );
};

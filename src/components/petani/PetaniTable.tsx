import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Upload, 
  Printer, 
  Edit3, 
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
  Filter,
  Zap,
  FileText,
  ArrowUp,
  Sparkles
} from 'lucide-react';
import { Petani, UserRole, TransaksiPembelian } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { canUserPerform } from '../../utils/rbac';
import { Pagination } from '../common/Pagination';
import { SortIcon } from '../common/SortIcon';

interface PetaniTableProps {
  data: Petani[];
  userRole: UserRole;
  transaksiList?: TransaksiPembelian[];
  onAddPetani: () => void;
  onEditPetani: (petani: Petani) => void;
  onViewDetail: (petani: Petani) => void;
  onPrintCard: (petani: Petani) => void;
  onToggleStatus: (petani: Petani) => void;
  onResetCardNumber?: (petani: Petani) => void;
  onOpenImportExport: () => void;
}

export const PetaniTable: React.FC<PetaniTableProps> = ({
  transaksiList = [],
  data = [],
  userRole,
  onAddPetani,
  onEditPetani,
  onViewDetail,
  onPrintCard,
  onToggleStatus,
  onResetCardNumber,
  onOpenImportExport,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>('terbaru');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Auto-reset ke halaman 1 saat jumlah data petani bertambah (misal baru disimpan)
  const prevDataLengthRef = useRef(data.length);
  useEffect(() => {
    if (data.length > prevDataLengthRef.current) {
      setCurrentPage(1);
    }
    prevDataLengthRef.current = data.length;
  }, [data.length]);

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
        if (sortBy === 'terbaru') {
          // Data baru berada di awal array `data` (index 0)
          const idxA = data.indexOf(a);
          const idxB = data.indexOf(b);
          cmp = idxA - idxB;
        } else if (sortBy === 'nama') {
          cmp = a.nama_petani.localeCompare(b.nama_petani);
        } else if (sortBy === 'petani_id') {
          cmp = a.petani_id.localeCompare(b.petani_id);
        } else if (sortBy === 'tanggal') {
          cmp = (a.tanggal_daftar || '').localeCompare(b.tanggal_daftar || '');
        } else if (sortBy === 'setoran') {
          const balA = a.statistik?.total_setoran_bal || 0;
          const balB = b.statistik?.total_setoran_bal || 0;
          cmp = balA - balB;
        } else {
          const idxA = data.indexOf(a);
          const idxB = data.indexOf(b);
          cmp = idxA - idxB;
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

  const displayItems = useMemo(() => {
    return paginatedData.map((petani, idx) => ({
      petani,
      itemNumber: (currentPage - 1) * itemsPerPage + idx + 1,
    }));
  }, [paginatedData, currentPage, itemsPerPage]);

  // Render clean single sort arrow indicator
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: string) => <SortIcon aktif={sortBy === field} arah={sortOrder} />;

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
                <option value="terbaru">Terbaru Ditambahkan (Paling Baru)</option>
                <option value="petani_id">ID Petani (PTN-YYYY-XXX)</option>
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
                  setSortBy('terbaru');
                  setSortOrder('asc');
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

          <div className="flex flex-wrap items-center gap-2">
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

        {/* Table Controls (Mode Switcher, Tampil X Data, Quick Filter Status & Kolom Pencarian Utama) */}
        <div className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
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
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
              <span className="text-gray-500 hidden sm:inline">per hal.</span>
            </div>
            {searchQuery.trim() && (
              <span className="text-[11px] text-gray-500 font-medium">
                Ditemukan: <strong className="text-gray-900">{filteredData.length}</strong> data
              </span>
            )}
          </div>

          {/* Kolom Pencarian (Search Bar) Utama Petani */}
          <div className="w-full sm:w-80 md:w-96">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-petani-input"
                type="text"
                placeholder="Cari petani (Nama, ID, No. HP, Alamat)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="btn-clear-search-petani"
                  onClick={() => {
                    setSearchQuery('');
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
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80">
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 text-center w-14">No</th>
                <th 
                  onClick={() => handleSort('petani_id')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70 select-none w-36 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>ID Petani</span>
                    {renderSortIcon('petani_id')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nama')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70 select-none transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>Nama Petani</span>
                    {renderSortIcon('nama')}
                  </div>
                </th>
                <th className="py-3 px-4 w-36 text-center">Nomor HP</th>
                <th className="py-3 px-4">Alamat Lengkap</th>
                <th className="py-3 px-4 text-center w-24">Status</th>
                <th className="py-3 px-4 text-center w-24">Total Bal</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
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
                        className="mt-2 inline-flex items-center space-x-1 text-xs text-slate-800 hover:text-slate-900 hover:underline font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Tampilkan Semua Petani (Reset Filter)</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                <>
                  {displayItems.map(({ petani, itemNumber }, index) => {
                    return (
                      <tr 
                        key={petani.petani_id}
                        className={`transition-colors hover:bg-slate-50/80 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                      >
                        {/* No */}
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {itemNumber}
                        </td>

                        {/* ID Petani */}
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {petani.petani_id}
                        </td>

                        {/* Nama Petani */}
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{petani.nama_petani}</span>
                            {petani.tanggal_daftar === new Date().toISOString().split('T')[0] && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-sm">
                                Baru
                              </span>
                            )}
                          </div>
                        </td>

                        {/* No HP */}
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {petani.no_hp || '-'}
                        </td>

                        {/* Alamat */}
                        <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                          {petani.alamat || petani.desa_kecamatan || '-'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 text-[11px] font-medium rounded-sm border ${
                            petani.status_aktif 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {petani.status_aktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>

                        {/* Total Bal */}
                        <td className="py-3 px-4 text-center font-mono font-medium text-slate-800">
                          {(() => {
                            const realTransactions = transaksiList.filter((tx) => tx.petani_id === petani.petani_id);
                            const totalBal = realTransactions.reduce((acc, tx) => acc + (tx.total_bal || (tx.items ? tx.items.length : 0)), 0);
                            return totalBal;
                          })()} Bal
                        </td>

                        {/* Action Buttons */}
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Info Button */}
                            <button
                              onClick={() => onViewDetail(petani)}
                              className="w-7 h-7 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center text-[10px] transition-colors cursor-pointer border border-slate-200 hover:border-slate-300"
                              title="Detail Petani"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            {/* Print ID Card Button (Warna merah korporat PR. Sekar Maju Sejahtera) */}
                            <button
                              onClick={() => onPrintCard(petani)}
                              className="w-7 h-7 rounded bg-red-50/70 hover:bg-red-100 text-[#b81d24] flex items-center justify-center text-[10px] transition-colors cursor-pointer border border-red-200/80 hover:border-red-300"
                              title="Cetak ID Card Petani"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button (Harmonis dengan palet slate, tanpa kotak hitam pekat) */}
                            {canManagePetani && (
                              <button
                                onClick={() => onEditPetani(petani)}
                                className="w-7 h-7 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center text-[10px] transition-colors cursor-pointer border border-slate-200 hover:border-slate-300"
                                title="Edit Data Petani"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Status Toggle Button */}
                            {canManagePetani && (
                              <button
                                onClick={() => onToggleStatus(petani)}
                                className={`w-7 h-7 rounded flex items-center justify-center text-[10px] transition-colors cursor-pointer border ${
                                  petani.status_aktif 
                                    ? 'bg-amber-50/70 hover:bg-amber-100 text-amber-700 border-amber-200/80 hover:border-amber-300' 
                                    : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 border-emerald-200/80 hover:border-emerald-300'
                                }`}
                                title={petani.status_aktif ? 'Nonaktifkan Petani' : 'Aktifkan Kembali'}
                              >
                                {petani.status_aktif ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination */}
        <div className="p-3 bg-white border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
            showQuickJumper={true}
            showFirstLast={true}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>

      </div>

    </div>
  );
};

import { SearchableSelect } from '../common/SearchableSelect';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  X, 
  MapPin, 
  Edit3,
  Plus,
  Zap,
  FileText,
  ArrowUp,
  Sparkles
} from 'lucide-react';
import { Barang, StatusStokBarang, UserRole } from '../../types';
import { BarangEditLocationModal } from './BarangEditLocationModal';
import { Pagination } from '../common/Pagination';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface BarangManagementProps {
  barangList: Barang[];
  userRole: UserRole;
  onUpdateBarang: (updated: Barang) => void;
  onNavigateToSample?: () => void;
  onNavigateToPengiriman?: () => void;
  onNavigateToTransaksi?: () => void;
}

export const BarangManagement: React.FC<BarangManagementProps> = ({
  barangList = [],
  userRole,
  onUpdateBarang,
  onNavigateToSample,
  onNavigateToPengiriman,
  onNavigateToTransaksi,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Status counts
  const countDiGudang = useMemo(() => barangList.filter((b) => b.status_stok === 'di_gudang').length, [barangList]);
  const countSample = useMemo(() => barangList.filter((b) => b.status_stok === 'terkirim_sample').length, [barangList]);
  const countKeluar = useMemo(() => barangList.filter((b) => b.status_stok === 'keluar').length, [barangList]);

  // Modals
  const [editingLocationBarang, setEditingLocationBarang] = useState<Barang | null>(null);

  // Filter logic
  const filteredItems = useMemo(() => {
    return barangList.filter((b) => {
      const matchSearch =
        searchQuery === '' ||
        b.no_bal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.barang_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.nama_petani && b.nama_petani.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.lokasi_gudang && b.lokasi_gudang.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchGrade = selectedGrade === 'all' || b.kode_grade === selectedGrade;
      const matchStatus = selectedStatus === 'all' || b.status_stok === selectedStatus;
      const matchGdg =
        selectedWarehouse === 'all' ||
        b.lokasi_gudang.toLowerCase().includes(selectedWarehouse.toLowerCase());

      return matchSearch && matchGrade && matchStatus && matchGdg;
    });
  }, [barangList, searchQuery, selectedGrade, selectedStatus, selectedWarehouse]);

  // Hook scanner: when barcode scanner reads a bal number on this page, fill search query automatically
  useBarcodeScanner((scannedNoBal) => {
    setSearchQuery(scannedNoBal);
    setCurrentPage(1);
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const displayItems = useMemo(() => {
    return paginatedData.map((barang, idx) => ({
      barang,
      itemNumber: (currentPage - 1) * itemsPerPage + idx + 1,
    }));
  }, [paginatedData, currentPage, itemsPerPage]);

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
            <span className="font-bold tracking-wide uppercase text-xs">Filter Inventaris Bal Tembakau</span>
          </div>
          {isFilterOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isFilterOpen && (
          <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs">
            <div>
              <label className="block text-gray-600 font-semibold mb-1">Grade Tembakau</label>
              <select
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Grade</option>
                <option value="A">Grade A (Super)</option>
                <option value="B">Grade B (Standar)</option>
                <option value="C">Grade C (Medium)</option>
                <option value="D">Grade D (Cacah)</option>
                <option value="E">Grade E (Campuran)</option>
                <option value="F">Grade F (Afkir)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-600 font-semibold mb-1">Status Stok Bal</label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Status</option>
                <option value="di_gudang">Di Gudang (Siap Kirim)</option>
                <option value="terkirim_sample">Sample Diuji QC</option>
                <option value="keluar">Keluar / Terkirim Pabrik</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-600 font-semibold mb-1">Lokasi Fasilitas Gudang</label>
              <SearchableSelect
                value={selectedWarehouse}
                onChange={(val) => {
                  setSelectedWarehouse(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'Semua Gudang' },
                  ...Array.from(new Set(barangList.map(b => b.lokasi_gudang))).filter(Boolean).sort().map(loc => ({ value: loc, label: loc }))
                ]}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGrade('all');
                  setSelectedStatus('all');
                  setSelectedWarehouse('all');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-sm transition cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        
        {/* Header */}
        <div className="p-3 sm:px-4 sm:py-2.5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">
              Daftar Inventaris Stok Bal Tembakau
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-red-50 text-[#b81d24] border border-red-200 rounded-sm">
              {filteredItems.length} Bal
            </span>
            {selectedStatus !== 'all' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-sm border bg-emerald-50 text-emerald-700 border-emerald-200">
                Filter: {selectedStatus === 'di_gudang' ? 'Di Gudang' : selectedStatus === 'terkirim_sample' ? 'Sample QC' : 'Keluar'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {onNavigateToTransaksi && (
              <button
                onClick={onNavigateToTransaksi}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Beli Bal Baru (Timbang)</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Controls (Mode Switcher, Tampil X Data, Quick Status Filter & Pencarian) */}
        <div className="p-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Tampil X Data Per Halaman */}
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
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
              <span className="text-gray-500 hidden sm:inline">per hal.</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-600 font-medium">Pencarian:</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari No Bal, Petani..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-sm px-2.5 py-1 text-xs text-gray-800 w-52 sm:w-64 focus:outline-none focus:border-[#b81d24]"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
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
            <thead className="bg-[#f8f9fa]">
              <tr className="border-b border-gray-200 text-[11px] font-bold text-gray-700">
                <th className="py-2.5 px-3 text-center w-12 border-r border-gray-200">No</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-28 font-mono">No Bal</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center w-20">Grade</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right w-28">Berat Netto</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Petani Pemasok</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Lokasi Gudang</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center w-28">Tgl Masuk</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center w-28">Status Stok</th>
                <th className="py-2.5 px-3 text-center w-20">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 text-xs">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500 bg-white">
                    <div className="text-sm font-bold text-gray-700">Tidak ada data bal tembakau</div>
                    <div className="mt-1">
                      {selectedStatus !== 'all' || searchQuery || selectedGrade !== 'all' || selectedWarehouse !== 'all'
                        ? 'Coba sesuaikan kata kunci pencarian atau reset filter status'
                        : 'Belum ada data stok bal yang tersimpan'}
                    </div>
                    {(selectedStatus !== 'all' || searchQuery || selectedGrade !== 'all' || selectedWarehouse !== 'all') && (
                      <button
                        onClick={() => {
                          setSelectedStatus('all');
                          setSelectedGrade('all');
                          setSelectedWarehouse('all');
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
                <>
                  {displayItems.map(({ barang: b, itemNumber }) => {
                    let statusBadge = (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-green-50 text-green-700 border border-green-200">
                        Di Gudang
                      </span>
                    );
                    if (b.status_stok === 'terkirim_sample') {
                      statusBadge = (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Sample QC
                        </span>
                      );
                    } else if (b.status_stok === 'keluar') {
                      statusBadge = (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600 border border-gray-200">
                          Terkirim
                        </span>
                      );
                    }

                    return (
                      <tr key={b.barang_id} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-gray-600">
                          {itemNumber}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-gray-900 w-28">
                          {b.no_bal}
                          <span className="block text-[10px] text-gray-400 font-normal">{b.barang_id}</span>
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                          <span className="px-2 py-0.5 font-bold font-mono text-xs bg-gray-800 text-white rounded-sm">
                            {b.kode_grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-gray-900">
                          {b.berat_kg} kg
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-gray-800 font-medium">
                          {b.nama_petani || '-'}
                          <span className="block text-[10px] font-mono text-gray-400">{b.petani_id}</span>
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-gray-700">
                          {b.lokasi_gudang}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-600">
                          {b.tanggal_masuk}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                          {statusBadge}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => setEditingLocationBarang(b)}
                            className="w-6 h-6 rounded-full bg-[#545b62] hover:bg-[#464c52] text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs mx-auto"
                            title="Ubah Lokasi Gudang"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            showQuickJumper={true}
            showFirstLast={true}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* Edit Location Modal */}
      {editingLocationBarang && (
        <BarangEditLocationModal
          isOpen={Boolean(editingLocationBarang)}
          onClose={() => setEditingLocationBarang(null)}
          barang={editingLocationBarang}
          onSaveLocation={(updated) => {
            onUpdateBarang(updated);
            setEditingLocationBarang(null);
          }}
        />
      )}

    </div>
  );
};

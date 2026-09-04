import React, { useState, useMemo } from 'react';
import { 
  Factory, 
  Plus, 
  Search, 
  RefreshCw, 
  X, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Building2, 
  Calendar,
  Layers,
  Scale,
  Filter
} from 'lucide-react';
import { PengirimanBarang, Barang, UserRole } from '../../types';
import { PemakaianProduksiFormModal } from './PemakaianProduksiFormModal';
import { BonProduksiPrintModal } from './BonProduksiPrintModal';
import { Pagination } from '../common/Pagination';

interface PemakaianProduksiManagementProps {
  pengirimanList: PengirimanBarang[];
  barangList: Barang[];
  userRole: UserRole;
  onSaveNewPengeluaran: (pengeluaran: PengirimanBarang, updatedBarangIds: string[]) => void;
}

export const PemakaianProduksiManagement: React.FC<PemakaianProduksiManagementProps> = ({
  pengirimanList = [],
  barangList = [],
  userRole,
  onSaveNewPengeluaran,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingBon, setViewingBon] = useState<PengirimanBarang | null>(null);

  // Filter internal production dispatches
  const internalDispatches = useMemo(() => {
    return pengirimanList.filter(
      (p) =>
        p.jenis_pengeluaran === 'produksi_sendiri' ||
        p.tujuan.toLowerCase().includes('sekar anom') ||
        p.tujuan.toLowerCase().includes('produksi') ||
        p.no_surat_jalan.startsWith('BPP')
    );
  }, [pengirimanList]);

  // Overall Statistics for PR. Sekar Anom internal production
  const productionStats = useMemo(() => {
    const totalBon = internalDispatches.length;
    const totalBal = internalDispatches.reduce((acc, p) => acc + (p.total_bal || 0), 0);
    const totalKg = internalDispatches.reduce((acc, p) => acc + (p.total_berat_kg || 0), 0);
    return { totalBon, totalBal, totalKg };
  }, [internalDispatches]);

  // Filtered
  const filteredData = useMemo(() => {
    return internalDispatches.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        p.no_surat_jalan.toLowerCase().includes(q) ||
        p.tujuan.toLowerCase().includes(q) ||
        (p.unit_produksi && p.unit_produksi.toLowerCase().includes(q)) ||
        (p.mandor_produksi && p.mandor_produksi.toLowerCase().includes(q)) ||
        (p.catatan && p.catatan.toLowerCase().includes(q));

      const matchUnit =
        selectedUnitFilter === 'all' ||
        (p.unit_produksi && p.unit_produksi.includes(selectedUnitFilter)) ||
        p.tujuan.includes(selectedUnitFilter);

      return matchSearch && matchUnit;
    });
  }, [internalDispatches, searchQuery, selectedUnitFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  return (
    <div className="space-y-2.5 font-sans text-gray-800">
      
      {/* 3 Summary Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-semibold block uppercase">
              Total Bon Pengeluaran Produksi
            </span>
            <div className="text-xl font-bold font-mono text-[#b81d24] mt-0.5">
              {productionStats.totalBon} Dokumen
            </div>
            <span className="text-[10px] text-gray-400">Pabrik Rokok PR. Sekar Anom</span>
          </div>
          <div className="w-10 h-10 bg-red-50 rounded-sm flex items-center justify-center text-[#b81d24]">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-semibold block uppercase">
              Total Bal Masuk Lini Produksi
            </span>
            <div className="text-xl font-bold font-mono text-gray-900 mt-0.5">
              {productionStats.totalBal} Bal
            </div>
            <span className="text-[10px] text-gray-400">Pelintingan SKT & SKM</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-sm flex items-center justify-center text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-semibold block uppercase">
              Total Tonase Bahan Baku
            </span>
            <div className="text-xl font-bold font-mono text-gray-900 mt-0.5">
              {productionStats.totalKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} KG
            </div>
            <span className="text-[10px] text-gray-400">Pemakaian Tembakau Rajang</span>
          </div>
          <div className="w-10 h-10 bg-amber-50 rounded-sm flex items-center justify-center text-amber-600">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center space-x-2">
            <Factory className="w-4 h-4 text-[#b81d24]" />
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">
              Daftar Bon Pengeluaran Bahan Baku Produksi Rokok PR. Sekar Anom (Internal)
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedUnitFilter('all');
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#545b62] hover:bg-[#464c52] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Bon Pemakaian Produksi Baru</span>
            </button>
          </div>
        </div>

        {/* Table Controls with Search and Lini/Unit Produksi Filter */}
        <div className="p-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
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

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Lini / Unit Produksi directly in table toolbar */}
            <div className="flex items-center space-x-1.5">
              <span className="text-gray-600 font-medium whitespace-nowrap flex items-center gap-1">
                <Filter className="w-3 h-3 text-gray-400" />
                Lini / Unit:
              </span>
              <select
                value={selectedUnitFilter}
                onChange={(e) => {
                  setSelectedUnitFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-sm px-2.5 py-1 bg-white text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Lini Produksi</option>
                <option value="SKT Lini 1">Unit Pelintingan SKT Lini 1</option>
                <option value="SKT Lini 2">Unit Pelintingan SKT Lini 2</option>
                <option value="SKM">Unit Pelintingan SKM Filter</option>
                <option value="Blending">Unit Blending & Casing Flavoring</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="flex items-center space-x-1.5">
              <span className="text-gray-600 font-medium whitespace-nowrap">Pencarian:</span>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Ketik No Bon, Mandor..."
                  className="border border-gray-300 rounded-sm px-2.5 py-1 text-xs text-gray-800 w-44 sm:w-56 focus:outline-none focus:border-[#b81d24]"
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
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-gray-200 text-xs font-bold text-gray-700">
                <th className="py-2.5 px-3 text-center border-r border-gray-200 w-12">No</th>
                <th className="py-2.5 px-3 border-r border-gray-200">No. Bon Produksi (SPBB)</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Tanggal Keluar</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Unit Produksi / Lini Penerima</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Mandor / Penerima</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Jumlah Bal</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right">Total Berat</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Status</th>
                <th className="py-2.5 px-3 text-center w-28">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 text-xs">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Tidak ada catatan pengeluaran tembakau untuk produksi rokok.
                  </td>
                </tr>
              ) : (
                paginatedData.map((p, index) => {
                  const itemNumber = (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <tr 
                      key={p.pengiriman_id}
                      className="hover:bg-[#f8f9fa] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-gray-600">
                        {itemNumber}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200">
                        <div className="font-bold text-gray-900 font-mono">{p.no_surat_jalan}</div>
                        <span className="inline-block px-1.5 py-0.2 bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold uppercase">
                          Produksi Sendiri
                        </span>
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-gray-700">
                        {p.tanggal_kirim}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200">
                        <div className="font-bold text-gray-900">{p.unit_produksi || p.tujuan}</div>
                        {p.catatan && (
                          <div className="text-[11px] text-gray-500 line-clamp-1 italic">
                            {p.catatan}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200">
                        <div className="font-semibold text-gray-800">
                          {p.mandor_produksi || p.driver_nama || '-'}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {p.plat_nomor || 'Hand-Trolley'}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-900">
                        {p.total_bal} Bal
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-[#b81d24]">
                        {p.total_berat_kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-medium text-gray-800">
                        Diterima Pabrik
                      </td>

                      {/* Action Icon */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => setViewingBon(p)}
                          className="w-6 h-6 rounded-full bg-[#b81d24] hover:bg-[#a0181e] text-white inline-flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                          title="Cetak / Unduh Bon Pengeluaran Produksi"
                        >
                          <Printer className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="p-3 bg-white border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
          />
        </div>

      </div>

      {/* Pemakaian Produksi Form Modal */}
      <PemakaianProduksiFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        barangList={barangList}
        onSavePengeluaran={onSaveNewPengeluaran}
      />

      {/* Bon Produksi Print & Download Modal */}
      <BonProduksiPrintModal
        isOpen={Boolean(viewingBon)}
        onClose={() => setViewingBon(null)}
        pengeluaran={viewingBon}
        barangList={barangList}
      />

    </div>
  );
};

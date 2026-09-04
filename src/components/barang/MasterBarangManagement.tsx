import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Power,
  Boxes, 
  ArrowRight,
  Info
} from 'lucide-react';
import { MasterBarang, Barang, UserRole } from '../../types';
import { GRADE_COLOR_MAP } from '../../data/initialHargaData';
import { formatRupiah } from '../../utils/formatters';
import { MasterBarangFormModal } from './MasterBarangFormModal';
import { ConfirmModal } from '../common/ConfirmModal';

interface MasterBarangManagementProps {
  masterBarangList: MasterBarang[];
  barangList: Barang[];
  onSaveMasterBarang: (item: MasterBarang) => void;
  onDeleteMasterBarang?: (masterId: string) => void;
  userRole: UserRole;
  onNavigateToStock?: (gradeFilter?: string) => void;
}

export const MasterBarangManagement: React.FC<MasterBarangManagementProps> = ({
  masterBarangList,
  barangList,
  onSaveMasterBarang,
  onDeleteMasterBarang,
  userRole,
  onNavigateToStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterBarang | null>(null);

  // Confirmation modal states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    detail?: string;
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

  // Map how many physical bal currently exist for each grade
  const balCountByGrade = useMemo(() => {
    const map: Record<string, { totalBal: number; totalKg: number }> = {};
    barangList.forEach((b) => {
      if (b.status_stok === 'di_gudang') {
        if (!map[b.kode_grade]) {
          map[b.kode_grade] = { totalBal: 0, totalKg: 0 };
        }
        map[b.kode_grade].totalBal += 1;
        map[b.kode_grade].totalKg += (b.berat_kg || 0);
      }
    });
    return map;
  }, [barangList]);

  // Dynamic available grades from master data
  const availableGrades = useMemo(() => {
    const grades = new Set<string>();
    masterBarangList.forEach((item) => {
      if (item.kode_grade) {
        grades.add(item.kode_grade.toUpperCase());
      }
    });
    return Array.from(grades).sort();
  }, [masterBarangList]);

  // Filtered master items
  const filteredItems = useMemo(() => {
    return masterBarangList.filter((item) => {
      const matchSearch =
        item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.varietas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode_grade.toLowerCase().includes(searchTerm.toLowerCase());

      const matchGrade = selectedGrade === 'all' || item.kode_grade.toUpperCase() === selectedGrade.toUpperCase();

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.status_aktif !== false) ||
        (statusFilter === 'inactive' && item.status_aktif === false);

      return matchSearch && matchGrade && matchStatus;
    });
  }, [masterBarangList, searchTerm, selectedGrade, statusFilter]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MasterBarang) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Konfirmasi Buka Form Edit Master Barang',
      message: `Apakah Anda ingin mengedit master data SKU "${item.kode_barang}" (${item.nama_barang})?`,
      detail: `Kode: ${item.kode_barang} | Grade: ${item.kode_grade} | Standard: ${item.berat_standar_kg} Kg`,
      variant: 'primary',
      confirmText: 'Buka Editor',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setEditingItem(item);
        setIsModalOpen(true);
      },
    });
  };

  const handleToggleStatus = (item: MasterBarang) => {
    const isActivating = item.status_aktif === false;
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Konfirmasi Aktivasi Master SKU' : 'Konfirmasi Nonaktifkan Master SKU',
      message: isActivating
        ? `Apakah Anda yakin ingin mengaktifkan kembali SKU "${item.kode_barang}" untuk intake dan produksi?`
        : `Apakah Anda yakin ingin menonaktifkan SKU "${item.kode_barang}"? SKU ini tidak akan muncul pada pilihan pembelian baru.`,
      detail: `Kode: ${item.kode_barang} | Deskripsi: ${item.nama_barang}`,
      variant: isActivating ? 'success' : 'warning',
      confirmText: isActivating ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan',
      onConfirm: () => {
        const updated: MasterBarang = {
          ...item,
          status_aktif: isActivating,
        };
        onSaveMasterBarang(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteItem = (item: MasterBarang) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Konfirmasi Hapus Master Data Barang',
      message: `Apakah Anda yakin ingin menghapus permanen SKU "${item.kode_barang}" (${item.nama_barang}) dari master katalog?`,
      detail: `Perhatian: Tindakan ini tidak dapat dibatalkan. Pastikan tidak ada transaksi aktif yang bergantung pada SKU ini.`,
      variant: 'danger',
      confirmText: 'Hapus Permanen',
      onConfirm: () => {
        if (onDeleteMasterBarang) {
          onDeleteMasterBarang(item.master_id);
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleSave = (item: MasterBarang) => {
    onSaveMasterBarang(item);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const totalMasterCount = masterBarangList.length;
  const activeMasterCount = masterBarangList.filter((m) => m.status_aktif !== false).length;
  const totalPhysicalBal = barangList.filter((b) => b.status_stok === 'di_gudang').length;
  const totalPhysicalKg = barangList
    .filter((b) => b.status_stok === 'di_gudang')
    .reduce((sum, b) => sum + (b.berat_kg || 0), 0);

  return (
    <div className="space-y-2.5 font-sans text-xs text-gray-800 animate-in fade-in duration-150">
      
      {/* Header Banner */}
      <div className="bg-white border border-gray-300 p-3 sm:p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#b81d24]/10 text-[#b81d24] border border-[#b81d24]/20 rounded-xs">
              Master Data ERP
            </span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-[11px] text-gray-500 font-mono">MD-02 • PR. SEKAR ANOM PAMEKASAN</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight mt-0.5 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#b81d24]" />
            Master Data Barang / Bal Tembakau Madura
          </h1>
          <p className="text-gray-600 text-xs mt-0.5">
            Registri definisi SKU master, standar mutu grade tembakau Madura, berat acuan, dan harga referensi bahan baku pabrik.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToStock && (
            <button
              onClick={() => onNavigateToStock()}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-sm border border-gray-300 flex items-center space-x-1.5 transition cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Boxes className="w-3.5 h-3.5 text-gray-600" />
              <span>Buka Menu Stok & Opname</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-[#b81d24] hover:bg-[#a0181e] text-white font-bold rounded-sm flex items-center space-x-1.5 transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Master Barang Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 border border-gray-300 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Master SKU</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-gray-900">{totalMasterCount}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Katalog Terdaftar</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-300 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">SKU Status Aktif</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">{activeMasterCount}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Siap Transaksi & Intake</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-300 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Stok Fisik</span>
            <Boxes className="w-4 h-4 text-[#b81d24]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#b81d24]">{totalPhysicalBal} Bal</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Tersimpan di Gudang</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-300 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Berat Riil</span>
            <span className="text-[11px] font-bold text-gray-400 font-mono">KG</span>
          </div>
          <div className="text-xl font-bold font-mono text-gray-900">{totalPhysicalKg.toLocaleString('id-ID')} Kg</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Berat Timbang Akumulasi</div>
        </div>
      </div>

      {/* Filter & Table Container */}
      <div className="bg-white border border-gray-300 shadow-xs">
        
        {/* Toolbar */}
        <div className="p-3 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-[#fcfcfc]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kode SKU, nama varietas, atau kategori..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-sm focus:border-[#b81d24] focus:outline-none text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 font-semibold text-[11px]">Grade:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-white border border-gray-300 rounded-sm px-2.5 py-1 text-xs font-semibold focus:border-[#b81d24] focus:outline-none"
              >
                <option value="all">Semua Grade ({availableGrades.length})</option>
                {availableGrades.map((gr) => (
                  <option key={gr} value={gr}>
                    Grade {gr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-gray-500 font-semibold text-[11px]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-gray-300 rounded-sm px-2.5 py-1 text-xs font-semibold focus:border-[#b81d24] focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif Saja</option>
                <option value="inactive">Nonaktif Saja</option>
              </select>
            </div>
          </div>
        </div>

        {/* Master Barang Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-300 text-gray-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 whitespace-nowrap">Kode SKU</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Grade</th>
                <th className="py-2.5 px-3 min-w-[240px]">Nama Master Barang / Deskripsi Varietas</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Kategori</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Berat Std</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Harga Ref (Rp/Kg)</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Stok Di Gudang</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Aksi Terkelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold">Tidak ada master barang yang sesuai dengan filter.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Klik "Tambah Master Barang Baru" untuk mendaftarkan SKU tembakau.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const gradeBadge = GRADE_COLOR_MAP[item.kode_grade] || {
                    bg: 'bg-gray-100',
                    text: 'text-gray-800',
                    border: 'border-gray-300',
                    badge: 'bg-gray-600 text-white',
                  };
                  const liveStock = balCountByGrade[item.kode_grade] || { totalBal: 0, totalKg: 0 };

                  return (
                    <tr key={item.master_id} className="hover:bg-gray-50/80 transition">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-300 inline-block tracking-tight text-xs">
                          {item.kode_barang}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 font-bold font-mono text-xs rounded border whitespace-nowrap shadow-2xs ${gradeBadge.bg} ${gradeBadge.text} ${gradeBadge.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${gradeBadge.badge.split(' ')[0]}`}></span>
                          <span>Grade {item.kode_grade}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900 text-xs">{item.nama_barang}</div>
                        {item.keterangan && (
                          <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {item.keterangan}
                          </div>
                        )}
                        {item.lokasi_default_gudang && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            Default: {item.lokasi_default_gudang}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-gray-800">{item.kategori}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{item.varietas}</div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                        {item.berat_standar_kg} <span className="text-[10px] font-normal text-gray-500">Kg/{item.satuan || 'Bal'}</span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                        {formatRupiah(item.harga_referensi_kg)} <span className="text-[10px] font-normal text-gray-500">/Kg</span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold rounded-xs text-[11px]">
                            {liveStock.totalBal} Bal
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {liveStock.totalKg.toFixed(1)} Kg
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-medium">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className="cursor-pointer transition hover:underline"
                          title="Klik untuk ubah status aktif/nonaktif SKU"
                        >
                          <span className={item.status_aktif !== false ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
                            {item.status_aktif !== false ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Master Barang (dengan konfirmasi)"
                            className="p-1.5 text-gray-600 hover:text-[#b81d24] hover:bg-gray-100 rounded-sm transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(item)}
                            title={item.status_aktif !== false ? 'Nonaktifkan SKU' : 'Aktifkan SKU'}
                            className={`p-1.5 rounded-sm transition cursor-pointer ${
                              item.status_aktif !== false
                                ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {onDeleteMasterBarang && (
                            <button
                              onClick={() => handleDeleteItem(item)}
                              title="Hapus Master Barang"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-sm transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onNavigateToStock && (
                            <button
                              onClick={() => onNavigateToStock(item.kode_grade)}
                              title={`Lihat Stok Fisik Grade ${item.kode_grade}`}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-sm transition cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
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

        {/* Table Footer */}
        <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <div>
            Menampilkan <span className="font-bold text-gray-800">{filteredItems.length}</span> dari{' '}
            <span className="font-bold text-gray-800">{masterBarangList.length}</span> master item SKU Tembakau Madura.
          </div>
          <div className="flex items-center space-x-1">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span>Master data digunakan sebagai katalog referensi intake pembelian & produksi.</span>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      <MasterBarangFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
        existingItems={masterBarangList}
      />

      {/* Reusable Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        detail={confirmDialog.detail}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        cancelText="Batal"
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

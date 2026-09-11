import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Scale, 
  Search, 
  Plus, 
  Printer, 
  Calendar, 
  DollarSign, 
  User, 
  Package, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  Trash2,
  Receipt,
  Tag,
  Scan,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Filter,
  AlertTriangle,
  Building,
  Check,
  Sparkles,
  CalendarDays,
  ListFilter,
  Edit3,
  Lock
} from 'lucide-react';
import { TransaksiPembelian, Petani, TabelHarga, Barang, UserRole, Gudang, User as UserType } from '../../types';
import { formatRupiah, formatDateHariBulanTahun } from '../../utils/formatters';
import { TransaksiFormModal } from './TransaksiFormModal';
import { TransaksiDetailModal } from './TransaksiDetailModal';
import { TransaksiEditModal } from './TransaksiEditModal';
import { Proses1SortirModal } from './Proses1SortirModal';
import { Proses2TimbangModal } from './Proses2TimbangModal';
import { Pagination } from '../common/Pagination';
import { ConfirmModal } from '../common/ConfirmModal';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { openPrintDocument } from '../../utils/openDedicatedPrint';

interface TransaksiManagementProps {
  transaksiList: TransaksiPembelian[];
  petaniList: Petani[];
  hargaList: TabelHarga[];
  barangList: Barang[];
  gudangList?: Gudang[];
  userRole: UserRole;
  currentUser?: UserType | null;
  onSaveTransaksi: (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[]) => void;
  onDeleteTransaksi?: (transaksiId: string, alasan?: string) => void;
}

type TabType = 'semua' | 'sortir' | 'timbang' | 'kasir';

export const TransaksiManagement: React.FC<TransaksiManagementProps> = ({
  transaksiList = [],
  petaniList = [],
  hargaList = [],
  barangList = [],
  gudangList = [],
  userRole,
  currentUser,
  onSaveTransaksi,
  onDeleteTransaksi,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('semua');
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupByDate, setGroupByDate] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Standby scanner input in main view
  const [standbyBarcode, setStandbyBarcode] = useState('');
  const [standbyFeedback, setStandbyFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const standbyInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isSortirModalOpen, setIsSortirModalOpen] = useState(false);
  const [isTimbangModalOpen, setIsTimbangModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedTxForTimbang, setSelectedTxForTimbang] = useState<TransaksiPembelian | null>(null);
  const [selectedBarcodeForTimbang, setSelectedBarcodeForTimbang] = useState<string | undefined>(undefined);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<TransaksiPembelian | null>(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<TransaksiPembelian | null>(null);
  const [txToDelete, setTxToDelete] = useState<TransaksiPembelian | null>(null);
  const [alasanHapus, setAlasanHapus] = useState<string>('');

  // In-memory update for nota print status
  const [localPrintedTxIds, setLocalPrintedTxIds] = useState<Set<string>>(new Set());

  const handleUpdateNotaStatus = (txId: string) => {
    setLocalPrintedTxIds((prev) => new Set([...prev, txId]));
  };

  // Focus standby input when timbang tab is active
  useEffect(() => {
    if (activeTab === 'timbang') {
      setTimeout(() => {
        if (standbyInputRef.current) {
          standbyInputRef.current.focus();
        }
      }, 200);
    }
  }, [activeTab]);

  // Counts for workflow badges
  const countSortirQueue = useMemo(() => {
    return transaksiList.filter((t) => t.status_transaksi === 'menunggu' || (t.items || []).some((it) => (it.berat_kg || 0) <= 0)).length;
  }, [transaksiList]);

  const countSiapNota = useMemo(() => {
    return transaksiList.filter((t) => t.status_transaksi === 'lengkap' && (t.items || []).every((it) => (it.berat_kg || 0) > 0)).length;
  }, [transaksiList]);

  // Real-time Filter & Search Logic (including Date Filter)
  const filteredData = useMemo(() => {
    return transaksiList.filter((tx) => {
      // Tab filter
      if (activeTab === 'sortir') {
        const hasUnweighed = (tx.items || []).some((it) => (it.berat_kg || 0) <= 0);
        if (tx.status_transaksi !== 'menunggu' && !hasUnweighed) return false;
      }
      if (activeTab === 'timbang') {
        const hasPendingBal = (tx.items || []).some((it) => (it.berat_kg || 0) <= 0);
        if (!hasPendingBal && tx.status_transaksi === 'lengkap') return false;
      }
      if (activeTab === 'kasir') {
        const isComplete = tx.status_transaksi === 'lengkap' && (tx.items || []).every((it) => (it.berat_kg || 0) > 0);
        if (!isComplete) return false;
      }

      // Date Range Filter
      if (startDate || endDate) {
        const txDate = tx.tanggal_transaksi ? tx.tanggal_transaksi.split(' ')[0].split('T')[0] : '';
        if (startDate && txDate < startDate) return false;
        if (endDate && txDate > endDate) return false;
      }

      // Grade filter
      if (gradeFilter !== 'all' && tx.kode_grade !== gradeFilter) return false;

      // Status filter
      if (statusFilter === 'lengkap' && tx.status_transaksi !== 'lengkap') return false;
      if (statusFilter === 'menunggu' && tx.status_transaksi !== 'menunggu') return false;
      if (statusFilter === 'sudah_cetak' && !localPrintedTxIds.has(tx.transaksi_id) && tx.status_nota !== 'sudah_cetak') return false;
      if (statusFilter === 'belum_cetak' && (localPrintedTxIds.has(tx.transaksi_id) || tx.status_nota === 'sudah_cetak')) return false;

      // Real-time Search query across multiple attributes
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchId = tx.transaksi_id.toLowerCase().includes(q);
        const matchNama = (tx.nama_petani || '').toLowerCase().includes(q);
        const matchKartu = (tx.petani_id || '').toLowerCase().includes(q);
        const matchBal = (tx.no_bal || '').toLowerCase().includes(q);
        const matchKupon = (tx.no_kupon || '').toLowerCase().includes(q);
        const matchDesa = (tx.desa_kecamatan || '').toLowerCase().includes(q);
        const matchGrade = (tx.kode_grade || '').toLowerCase().includes(q);
        const matchItemBal = (tx.items || []).some(
          (it) =>
            (it.no_bal && it.no_bal.toLowerCase().includes(q)) ||
            (it.barcode && it.barcode.toLowerCase().includes(q)) ||
            (it.kode_grade && it.kode_grade.toLowerCase().includes(q))
        );
        return matchId || matchNama || matchKartu || matchBal || matchKupon || matchDesa || matchGrade || matchItemBal;
      }
      return true;
    });
  }, [transaksiList, activeTab, startDate, endDate, gradeFilter, statusFilter, searchQuery, localPrintedTxIds]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Grouped paginated data by Date (for chronological grouping view)
  const groupedPaginatedData = useMemo(() => {
    const groups: { date: string; items: { tx: TransaksiPembelian; itemNumber: number }[] }[] = [];
    paginatedData.forEach((tx, idx) => {
      const itemNumber = (currentPage - 1) * itemsPerPage + idx + 1;
      const dateKey = tx.tanggal_transaksi ? tx.tanggal_transaksi.split(' ')[0].split('T')[0] : 'Tidak Ada Tanggal';
      let existingGroup = groups.find((g) => g.date === dateKey);
      if (!existingGroup) {
        existingGroup = { date: dateKey, items: [] };
        groups.push(existingGroup);
      }
      existingGroup.items.push({ tx, itemNumber });
    });
    return groups;
  }, [paginatedData, currentPage, itemsPerPage]);

  const handleOpenTimbangForTx = (tx: TransaksiPembelian, specificBalCode?: string) => {
    setSelectedTxForTimbang(tx);
    setSelectedBarcodeForTimbang(specificBalCode);
    setIsTimbangModalOpen(true);
  };

  // Process a scanned No Bal
  const processScannedNoBal = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    let foundTx: TransaksiPembelian | undefined;
    for (const tx of transaksiList) {
      const match = (tx.items || []).some(
        (it) => it.no_bal && it.no_bal.toUpperCase() === cleanCode
      );
      if (match) {
        foundTx = tx;
        break;
      }
    }

    if (foundTx) {
      setStandbyFeedback({
        text: `✓ No Bal "${cleanCode}" COCOK! Membuka workstation penimbangan Petani ${foundTx.nama_petani}...`,
        isError: false,
      });
      setStandbyBarcode('');
      handleOpenTimbangForTx(foundTx, cleanCode);
    } else {
      setStandbyFeedback({
        text: `✗ No Bal "${cleanCode}" tidak ditemukan di antrian. Pastikan sudah diinput pada Proses 1 Sortir.`,
        isError: true,
      });
      setStandbyBarcode('');
    }
  };

  // Hardware barcode scanner hook for TransaksiManagement
  useBarcodeScanner((scannedBal) => {
    if (activeTab === 'timbang') {
      processScannedNoBal(scannedBal);
    } else {
      setSearchQuery(scannedBal);
      setCurrentPage(1);
    }
  });

  // Handle standby scanner submit in main weighing view
  const handleStandbyScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    processScannedNoBal(standbyBarcode);
  };

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* Workflow Navigation Sub-tabs */}
      <div className="bg-white border border-gray-200 p-2 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          <div className="flex items-center space-x-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('semua');
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer rounded-xs whitespace-nowrap ${
                activeTab === 'semua'
                  ? 'bg-[#b81d24] text-white shadow-xs'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Transaksi & Intake</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'semua' ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-800'
              }`}>
                {transaksiList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('sortir');
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer rounded-xs whitespace-nowrap ${
                activeTab === 'sortir'
                  ? 'bg-[#b81d24] text-white shadow-xs'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Proses 1: Meja Sortir & Sampel</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'sortir' ? 'bg-white/20 text-white' : 'bg-red-200 text-red-900 font-bold'
              }`}>
                {countSortirQueue}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('timbang');
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer rounded-xs whitespace-nowrap ${
                activeTab === 'timbang'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Proses 2: Meja Timbang & Blok Gudang</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'timbang' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900 font-bold'
              }`}>
                {countSortirQueue}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('kasir');
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer rounded-xs whitespace-nowrap ${
                activeTab === 'kasir'
                  ? 'bg-[#b81d24] text-white shadow-xs'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Loket Kasir & Cetak Nota</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'kasir' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900 font-bold'
              }`}>
                {countSiapNota}
              </span>
            </button>
          </div>

          {/* Quick Trigger Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsSortirModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Input Meja Sortir (Proses 1)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTxForTimbang(null);
                setSelectedBarcodeForTimbang(undefined);
                setIsTimbangModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Buka Meja Timbang (Proses 2)</span>
            </button>
          </div>

        </div>
      </div>

      {/* Standby Scanner Gun Bar (Active on Meja Timbang / Standby Mode) */}
      {activeTab === 'timbang' && (
        <div className="bg-[#b81d24] text-white p-4 border border-slate-700 shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="bg-[#b81d24] text-slate-200 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider">
                  STANDBY MEJA TIMBANGAN (SCANNER AKTIF)
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Auto-Open Data Tembakau Sesuai No Bal
                </span>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Scan atau Input No Bal (misal: A0001)
              </h3>
              <p className="text-[11px] text-slate-300 max-w-xl">
                Alat scanner barcode akan otomatis membaca nomor bal dan membuka form penimbangan serta mengarahkan kursor ke input berat timbangan.
              </p>
            </div>

            <div className="w-full md:w-auto flex-1 max-w-md">
              <form onSubmit={handleStandbyScanSubmit} className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    ref={standbyInputRef}
                    type="text"
                    value={standbyBarcode}
                    onChange={(e) => setStandbyBarcode(e.target.value)}
                    placeholder="Scan atau ketik No Bal..."
                    className="w-full bg-slate-950 border border-slate-600 font-mono font-bold text-sm text-white px-3 py-2 rounded-none focus:outline-none focus:border-slate-400 placeholder:text-slate-500"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 font-mono">
                    ↵ Enter
                  </span>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs rounded-none transition cursor-pointer shrink-0"
                >
                  Panggil Bal
                </button>
              </form>
            </div>
          </div>

          {standbyFeedback && (
            <div className={`mt-3 px-3 py-1.5 rounded-none text-xs font-bold flex items-center space-x-2 ${
              standbyFeedback.isError 
                ? 'bg-red-950 text-red-300 border border-red-800' 
                : 'bg-[#b81d24] text-slate-200 border border-slate-600'
            }`}>
              {standbyFeedback.isError ? (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span>{standbyFeedback.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Role-based Workflow Context Information */}
      <div className="bg-white border border-gray-200 p-3.5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-start space-x-2.5">
          <div className="w-7 h-7 rounded-none bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-gray-700" />
          </div>
          <div>
            <div className="font-bold text-gray-900 flex items-center space-x-2">
              <span>Alur Operasional Intake (Sortir ➔ Timbang ➔ Blok Gudang ➔ Kasir):</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-800 font-mono text-[10px] rounded-none font-bold">
                Standard ERP
              </span>
            </div>
            <p className="text-gray-600 text-[11px] mt-0.5 leading-relaxed">
              <strong>Sortir (Admin 1/2/3):</strong> Input / scan nomor bal ➔ Input grade & harga (berat kosong) ➔ Centang Ganti Tikar jika ada (+Potongan Nominal Rp) ➔ Simpan sample QC. <br />
              <strong>Timbang & Gudang:</strong> Standby scan no. bal di timbangan ➔ Otomatis buka bal & input berat ➔ Tentukan Blok Simpan (Blok A/B/C/D) ➔ Masuk inventaris & Nota siap dicetak kasir.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border border-gray-200 rounded-none shadow-xs">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-gray-800 bg-white hover:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-[#b81d24]" />
            <span className="font-bold tracking-wide uppercase text-xs">Filter & Pencarian Data</span>
          </div>
          {isFilterOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isFilterOpen && (
          <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            
            {/* Real-time Search Input */}
            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1 flex items-center justify-between">
                <span>Pencarian Real-Time</span>
                {searchQuery && (
                  <span className="text-[10px] text-emerald-600 font-normal">Aktif</span>
                )}
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari Kupon, ID, Petani, No Bal, Desa..."
                  className="w-full bg-white border border-gray-300 rounded-sm pl-8 pr-7 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Dari Tanggal</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
                />
              </div>
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Sampai Tanggal</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
                />
              </div>
            </div>

            {/* Grade Filter */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Grade Tembakau</label>
              <input
                type="text"
                list="transaksi-grade-list"
                value={gradeFilter === 'all' ? '' : gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value || 'all');
                  setCurrentPage(1);
                }}
                placeholder="Semua Grade..."
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              />
              <datalist id="transaksi-grade-list">
                <option value="A">Grade A (Super)</option>
                <option value="B">Grade B (Standar)</option>
                <option value="C">Grade C (Medium)</option>
                <option value="D">Grade D (Cacah)</option>
                <option value="E">Grade E (Campuran)</option>
                <option value="F">Grade F (Afkir)</option>
              </datalist>
            </div>

            {/* Status Nota Filter */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Status Nota & Timbang</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Status</option>
                <option value="lengkap">Selesai Timbang (Siap Nota)</option>
                <option value="menunggu">Menunggu Timbang (Sortir Selesai)</option>
                <option value="sudah_cetak">Nota Sudah Dicetak</option>
                <option value="belum_cetak">Nota Belum Dicetak</option>
              </select>
            </div>

          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-none shadow-xs">
        
        {/* Card Header with Grouping Toggle & Quick Controls */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">
              {activeTab === 'semua' && 'Daftar Transaksi Intake Pembelian Tembakau'}
              {activeTab === 'sortir' && 'Antrian Hasil Meja Sortir & Label Sampel QC'}
              {activeTab === 'timbang' && 'Antrian Meja Timbang & Alokasi Blok Gudang'}
              {activeTab === 'kasir' && 'Rekapitulasi Pembayaran Kasir & Status Nota'}
            </h2>
            <span className="text-xs text-gray-500 font-mono">
              ({filteredData.length} data)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Group By Date Toggle Button */}
            <button
              type="button"
              onClick={() => setGroupByDate(!groupByDate)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs border ${
                groupByDate
                  ? 'bg-[#b81d24] text-white border-[#b81d24]'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
              }`}
              title="Kelompokkan data berdasarkan tanggal transaksi"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{groupByDate ? 'Group Tanggal: Aktif' : 'Group Tanggal: Nonaktif'}</span>
            </button>

            {/* Reset / Reload Button */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
                setGradeFilter('all');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Reset semua filter & muat ulang"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Table Pagination Size Control & Live Count */}
        <div className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-gray-100">
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
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-gray-600">Data Per Halaman</span>
          </div>

          <div className="text-[11px] text-gray-500">
            {startDate || endDate || searchQuery || gradeFilter !== 'all' || statusFilter !== 'all' ? (
              <span className="text-[#b81d24] font-medium">
                Filter aktif • Menampilkan {filteredData.length} transaksi
              </span>
            ) : (
              <span className="italic">* Format Tanggal YYYY-MM-DD • Pengelompokan tanggal rapi & kronologis</span>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-gray-200 text-xs font-bold text-gray-700">
                <th className="py-2.5 px-2.5 text-center border-r border-gray-200 w-10">No</th>
                <th className="py-2.5 px-3 border-r border-gray-200 whitespace-nowrap">No. Kupon</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Tanggal</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Customer / Petani</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Grade / Bal</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Netto (Kg)</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Status Timbang</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Status Nota</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right">Total Bersih (Rp)</th>
                <th className="py-2.5 px-3 text-center w-40">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-700 text-xs">Tidak ada data transaksi yang cocok</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Silakan sesuaikan kata kunci pencarian real-time atau rentang tanggal pada filter di atas.
                    </p>
                  </td>
                </tr>
              ) : groupByDate ? (
                // GROUPED BY DATE VIEW
                groupedPaginatedData.map((group) => {
                  const groupTotalNetto = group.items.reduce((acc, curr) => acc + (curr.tx.berat_kg || 0), 0);
                  const groupTotalBayar = group.items.reduce((acc, curr) => acc + (curr.tx.harga_final || 0), 0);
                  const groupTotalBal = group.items.reduce(
                    (acc, curr) => acc + (curr.tx.total_bal || (curr.tx.items ? curr.tx.items.length : 1)),
                    0
                  );

                  return (
                    <React.Fragment key={`group-${group.date}`}>
                      {/* Date Group Header Banner */}
                      <tr className="bg-slate-100/90 border-y border-slate-300 text-slate-800 font-semibold">
                        <td colSpan={10} className="py-2 px-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-[#b81d24]" />
                              <span className="font-bold text-gray-900 font-mono text-xs">
                                Tanggal: {formatDateHariBulanTahun(group.date)}
                              </span>
                              <span className="px-2 py-0.5 bg-white border border-slate-300 rounded-xs text-[10px] font-semibold text-slate-700">
                                {group.items.length} Transaksi
                              </span>
                              <span className="px-2 py-0.5 bg-white border border-slate-300 rounded-xs text-[10px] font-semibold text-slate-700">
                                {groupTotalBal} Bal
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] font-mono">
                              <span>
                                Subtotal Netto: <strong className="text-gray-900">{groupTotalNetto.toFixed(1)} Kg</strong>
                              </span>
                              <span className="text-gray-300">|</span>
                              <span>
                                Subtotal Nilai: <strong className="text-emerald-700">{formatRupiah(groupTotalBayar)}</strong>
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Items in this date group */}
                      {group.items.map(({ tx, itemNumber }) => {
                        const isWeighingDone = (tx.items || []).length > 0
                          ? (tx.items || []).every((it) => (it.berat_kg || 0) > 0)
                          : (tx.berat_kg || 0) > 0;
                        const isTxLunas = tx.status_pembayaran === 'lunas' || tx.metode_pembayaran === 'cash';
                        const canPrintNota = isWeighingDone && isTxLunas;

                        const isPrinted = localPrintedTxIds.has(tx.transaksi_id) || tx.status_nota === 'sudah_cetak';
                        const dateOnly = formatDateHariBulanTahun(tx.tanggal_transaksi);

                        return (
                          <tr 
                            key={tx.transaksi_id}
                            className="hover:bg-[#f8f9fa] transition-colors"
                          >
                            {/* No */}
                            <td className="py-2.5 px-2.5 text-center border-r border-gray-200 font-mono text-gray-600">
                              {itemNumber}
                            </td>

                            {/* No Kupon */}
                            <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-gray-900 whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded-xs font-mono font-bold text-[#b81d24] whitespace-nowrap">
                                {tx.no_kupon || tx.transaksi_id}
                              </span>
                            </td>

                            {/* Tanggal */}
                            <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-gray-700 whitespace-nowrap">
                              {dateOnly}
                            </td>

                            {/* Customer / Petani */}
                            <td className="py-2.5 px-3 border-r border-gray-200">
                              <div className="font-bold text-gray-900">{tx.nama_petani}</div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                {tx.petani_id} • {tx.desa_kecamatan || '-'}
                              </div>
                              {tx.terakhir_diubah_oleh && (
                                <div 
                                  className="mt-1 inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-xs border border-slate-300 font-sans" 
                                  title={`Diubah oleh: ${tx.terakhir_diubah_oleh}${tx.terakhir_diubah_pada ? ` (${new Date(tx.terakhir_diubah_pada).toLocaleString('id-ID')})` : ''}${tx.alasan_perubahan_terakhir ? ` - "${tx.alasan_perubahan_terakhir}"` : ''}`}
                                >
                                  <Edit3 className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                  <span className="truncate max-w-[130px]">Diedit: {tx.terakhir_diubah_oleh.split(' ')[0]}</span>
                                </div>
                              )}
                            </td>

                            {/* Grade / Bal */}
                            <td className="py-2.5 px-3 border-r border-gray-200">
                              <div className="font-bold text-gray-800">
                                Grade {tx.kode_grade}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate max-w-[160px]" title={tx.no_bal}>
                                {tx.total_bal || tx.items?.length || 1} Bal: {tx.no_bal}
                              </div>
                            </td>

                            {/* Netto (Kg) */}
                            <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-900 whitespace-nowrap">
                              {isWeighingDone ? (
                                <span className="text-emerald-800 font-black">{tx.berat_kg} kg</span>
                              ) : (
                                <span className="text-amber-600 font-bold text-[11px]">0 kg (Menunggu)</span>
                              )}
                            </td>

                            {/* Status Timbang */}
                            <td className="py-2.5 px-3 border-r border-gray-200 text-center whitespace-nowrap">
                              {isWeighingDone ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-xs inline-flex items-center space-x-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>Selesai Timbang</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenTimbangForTx(tx)}
                                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold rounded-xs inline-flex items-center space-x-1 cursor-pointer transition"
                                  title="Klik untuk menimbang bal sekarang"
                                >
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Menunggu Timbang ➔</span>
                                </button>
                              )}
                            </td>

                            {/* Status Nota */}
                            <td className="py-2.5 px-3 border-r border-gray-200 text-center whitespace-nowrap">
                              {isPrinted ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-xs inline-flex items-center space-x-1">
                                  <Check className="w-3 h-3 text-rose-700" />
                                  <span>Sudah Dicetak</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-xs">
                                  Belum Dicetak
                                </span>
                              )}
                            </td>

                            {/* Total Bersih */}
                            <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                              {isWeighingDone ? (
                                formatRupiah(tx.harga_final)
                              ) : (
                                <span className="text-gray-400 font-mono">Rp 0 (Pending)</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-1.5">
                                
                                {/* 1. Tombol Meja Timbang (Emerald) */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenTimbangForTx(tx)}
                                  className={`w-7 h-7 rounded-sm flex items-center justify-center text-white transition cursor-pointer shadow-xs ${
                                    isWeighingDone ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-600 hover:bg-amber-700 animate-pulse'
                                  }`}
                                  title="Proses 2: Timbang & Alokasi Blok Gudang"
                                >
                                  <Scale className="w-3.5 h-3.5" />
                                </button>

                                {/* 3. Buka Halaman Cetak Nota */}
                                <button
                                  type="button"
                                  onClick={() => openPrintDocument('nota', tx.transaksi_id)}
                                  className={`w-7 h-7 rounded-sm flex items-center justify-center text-white transition cursor-pointer shadow-xs ${!isWeighingDone ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#b81d24] hover:bg-[#9e161c]'}`}
                                  title={!isWeighingDone ? "Cetak Nota (Draft / Belum Selesai Timbang)" : "Buka Dialog Cetak / Simpan PDF Nota"}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* 3.1. Lihat Detail Transaksi & Nota Timbang (Teal) */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedTxForDetail(tx)}
                                  className={`w-7 h-7 rounded-sm flex items-center justify-center text-white transition cursor-pointer shadow-xs ${
                                    isWeighingDone 
                                      ? 'bg-[#17a2b8] hover:bg-[#138496]' 
                                      : 'bg-gray-300 text-gray-500 cursor-pointer'
                                  }`}
                                  title="Lihat Detail Transaksi & Nota Timbang"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>

                                {/* 3.5. Edit / Koreksi Transaksi (Slate) */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedTxForEdit(tx)}
                                  className="w-7 h-7 rounded-sm bg-slate-700 hover:bg-[#b81d24] text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                                  title="Edit & Koreksi Data Transaksi (Petani, Bal, Grade, Berat, Harga)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* 4. Delete Transaction (Red) */}
                                {onDeleteTransaksi && (
                                  <button
                                    type="button"
                                    onClick={() => setTxToDelete(tx)}
                                    className="w-7 h-7 rounded-sm bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                // FLAT TABLE VIEW
                paginatedData.map((tx, index) => {
                  const itemNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  
                  // Validation: All items must have price and weight > 0
                  const isWeighingDone = (tx.items || []).length > 0
                    ? (tx.items || []).every((it) => (it.berat_kg || 0) > 0)
                    : (tx.berat_kg || 0) > 0;
                  const isTxLunas = tx.status_pembayaran === 'lunas' || tx.metode_pembayaran === 'cash';
                  const canPrintNota = isWeighingDone && isTxLunas;

                  const isPrinted = localPrintedTxIds.has(tx.transaksi_id) || tx.status_nota === 'sudah_cetak';
                  const dateOnly = formatDateHariBulanTahun(tx.tanggal_transaksi);

                  return (
                    <tr 
                      key={tx.transaksi_id}
                      className="hover:bg-[#f8f9fa] transition-colors"
                    >
                      {/* No */}
                      <td className="py-2.5 px-2.5 text-center border-r border-gray-200 font-mono text-gray-600">
                        {itemNumber}
                      </td>

                      {/* No Kupon (Full 1 row, never wrapped) */}
                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-gray-900 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded-xs font-mono font-bold text-[#b81d24] whitespace-nowrap">
                          {tx.no_kupon || tx.transaksi_id}
                        </span>
                      </td>

                      {/* Tanggal (YYYY-MM-DD without hour) */}
                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-gray-700 whitespace-nowrap">
                        {dateOnly}
                      </td>

                      {/* Customer / Petani */}
                      <td className="py-2.5 px-3 border-r border-gray-200">
                        <div className="font-bold text-gray-900">{tx.nama_petani}</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {tx.petani_id} • {tx.desa_kecamatan || '-'}
                        </div>
                        {tx.terakhir_diubah_oleh && (
                          <div 
                            className="mt-1 inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-xs border border-slate-300 font-sans" 
                            title={`Diubah oleh: ${tx.terakhir_diubah_oleh}${tx.terakhir_diubah_pada ? ` (${new Date(tx.terakhir_diubah_pada).toLocaleString('id-ID')})` : ''}${tx.alasan_perubahan_terakhir ? ` - "${tx.alasan_perubahan_terakhir}"` : ''}`}
                          >
                            <Edit3 className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[130px]">Diedit: {tx.terakhir_diubah_oleh.split(' ')[0]}</span>
                          </div>
                        )}
                      </td>

                      {/* Grade / Bal */}
                      <td className="py-2.5 px-3 border-r border-gray-200">
                        <div className="font-bold text-gray-800">
                          Grade {tx.kode_grade}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[160px]" title={tx.no_bal}>
                          {tx.total_bal || tx.items?.length || 1} Bal: {tx.no_bal}
                        </div>
                      </td>

                      {/* Netto (Kg) */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-900 whitespace-nowrap">
                        {isWeighingDone ? (
                          <span className="text-emerald-800 font-black">{tx.berat_kg} kg</span>
                        ) : (
                          <span className="text-amber-600 font-bold text-[11px]">0 kg (Menunggu)</span>
                        )}
                      </td>

                      {/* Status Timbang */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center whitespace-nowrap">
                        {isWeighingDone ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-xs inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Selesai Timbang</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenTimbangForTx(tx)}
                            className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold rounded-xs inline-flex items-center space-x-1 cursor-pointer transition"
                            title="Klik untuk menimbang bal sekarang"
                          >
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>Menunggu Timbang ➔</span>
                          </button>
                        )}
                      </td>

                      {/* Status Nota */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center whitespace-nowrap">
                        {isPrinted ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-xs inline-flex items-center space-x-1">
                            <Check className="w-3 h-3 text-rose-700" />
                            <span>Sudah Dicetak</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-xs">
                            Belum Dicetak
                          </span>
                        )}
                      </td>

                      {/* Total Bersih */}
                      <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        {isWeighingDone ? (
                          formatRupiah(tx.harga_final)
                        ) : (
                          <span className="text-gray-400 font-mono">Rp 0 (Pending)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          
                          {/* 1. Tombol Meja Timbang (Emerald) */}
                          <button
                            type="button"
                            onClick={() => handleOpenTimbangForTx(tx)}
                            className={`w-7 h-7 rounded-sm flex items-center justify-center text-white transition cursor-pointer shadow-xs ${
                              isWeighingDone ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-600 hover:bg-amber-700 animate-pulse'
                            }`}
                            title="Proses 2: Timbang & Alokasi Blok Gudang"
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Buka Halaman Cetak Nota */}
                          <button
                            type="button"
                            onClick={() => openPrintDocument('nota', tx.transaksi_id)}
                            className={`w-7 h-7 rounded-sm flex items-center justify-center text-white transition cursor-pointer shadow-xs ${!isWeighingDone ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#b81d24] hover:bg-[#9e161c]'}`}
                            title={!isWeighingDone ? "Cetak Nota (Draft / Belum Selesai Timbang)" : "Buka Dialog Cetak / Simpan PDF Nota"}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* 3.1. Lihat Detail Transaksi & Nota Timbang (Teal) */}
                          <button
                            type="button"
                            onClick={() => setSelectedTxForDetail(tx)}
                            className={`w-7 h-7 rounded-sm flex items-center justify-center text-white transition cursor-pointer shadow-xs ${
                              isWeighingDone 
                                ? 'bg-[#17a2b8] hover:bg-[#138496]' 
                                : 'bg-gray-300 text-gray-500 cursor-pointer'
                            }`}
                            title="Lihat Detail Transaksi & Nota Timbang"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          {/* 3.5. Edit / Koreksi Transaksi (Slate) */}
                          <button
                            type="button"
                            onClick={() => setSelectedTxForEdit(tx)}
                            className="w-7 h-7 rounded-sm bg-slate-700 hover:bg-[#b81d24] text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                            title="Edit & Koreksi Data Transaksi (Petani, Bal, Grade, Berat, Harga)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. Delete Transaction (Red) */}
                          {onDeleteTransaksi && (
                            <button
                              type="button"
                              onClick={() => setTxToDelete(tx)}
                              className="w-7 h-7 rounded-sm bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                              title="Hapus Transaksi"
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

      {/* Modal Proses 1: Meja Sortir & Label QC (Admin 1, 2, 3) */}
      <Proses1SortirModal
        isOpen={isSortirModalOpen}
        onClose={() => setIsSortirModalOpen(false)}
        petaniList={petaniList}
        hargaList={hargaList}
        gudangList={gudangList}
        barangList={barangList}
        currentUser={currentUser}
        onSaveSortir={(newTx) => { onSaveTransaksi(newTx, []); setIsSortirModalOpen(false); }}
      />

      {/* Modal Proses 2: Meja Timbang & Blok Gudang */}
      <Proses2TimbangModal
        isOpen={isTimbangModalOpen}
        onClose={() => {
          setIsTimbangModalOpen(false);
          setSelectedTxForTimbang(null);
          setSelectedBarcodeForTimbang(undefined);
        }}
        transaksiList={transaksiList}
        gudangList={gudangList}
        currentUser={currentUser}
        initialTransaksi={selectedTxForTimbang}
        initialBarcodeToSelect={selectedBarcodeForTimbang}
        onSaveTimbang={(updatedTx, generatedBarangList) => {
          onSaveTransaksi(updatedTx, generatedBarangList);
          setIsTimbangModalOpen(false);
          setSelectedTxForTimbang(null);
          setSelectedBarcodeForTimbang(undefined);
        }}
      />

      {/* Modal Detail & Nota Timbang Transaksi (Dengan Validasi Selesai Timbang) */}
      {selectedTxForDetail && (
        <TransaksiDetailModal
          isOpen={Boolean(selectedTxForDetail)}
          onClose={() => setSelectedTxForDetail(null)}
          transaksi={selectedTxForDetail}
          onUpdateNotaStatus={handleUpdateNotaStatus}
          onOpenEditModal={(tx) => setSelectedTxForEdit(tx)}
          onDeleteTransaksi={onDeleteTransaksi ? (id, alasan) => {
            onDeleteTransaksi(id, alasan);
            setSelectedTxForDetail(null);
          } : undefined}
        />
      )}

      {/* Modal Edit & Koreksi Transaksi */}
      {selectedTxForEdit && (
        <TransaksiEditModal
          isOpen={Boolean(selectedTxForEdit)}
          onClose={() => setSelectedTxForEdit(null)}
          transaksi={selectedTxForEdit}
          petaniList={petaniList}
          hargaList={hargaList}
          barangList={barangList}
          gudangList={gudangList}
          currentUser={currentUser}
          onSaveTransaksi={(newTx, generatedBarang) => {
            onSaveTransaksi(newTx, generatedBarang);
            if (selectedTxForDetail && selectedTxForDetail.transaksi_id === newTx.transaksi_id) {
              setSelectedTxForDetail(newTx);
            }
          }}
        />
      )}

      {/* Modal Tambah Transaksi Batch Form */}
      <TransaksiFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        petaniList={petaniList}
        hargaList={hargaList}
        barangList={barangList}
        gudangList={gudangList}
        onSaveTransaksi={onSaveTransaksi}
      />

      {/* Konfirmasi Hapus Transaksi dengan Alasan Audit Trail */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-rose-200 rounded-sm shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Transaksi</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {txToDelete.no_kupon} ({txToDelete.transaksi_id})
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xs text-xs text-rose-950 space-y-1">
              <p>
                Apakah Anda yakin ingin menghapus transaksi milik Petani <strong>{txToDelete.nama_petani}</strong>?
              </p>
              <p className="text-[11px] text-rose-700">
                • Berat Netto: {txToDelete.berat_kg} Kg ({txToDelete.total_bal || (txToDelete.items ? txToDelete.items.length : 1)} Bal)
                <br />
                • Total Nilai: {formatRupiah(txToDelete.harga_final || txToDelete.total_harga_beli)}
                <br />
                • Data bal inventaris gudang terkait transaksi ini juga akan dihapus dari stok aktif.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Alasan Penghapusan (Wajib untuk Audit Trail Admin):</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Salah input nomor kupon / Duplikasi / Dibatalkan petani"
                value={alasanHapus}
                onChange={(e) => setAlasanHapus(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] focus:outline-none"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {['Salah input nomor kupon', 'Duplikasi transaksi timbangan', 'Dibatalkan oleh petani penyetor', 'Koreksi administratif'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAlasanHapus(preset)}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xs border border-slate-200 transition cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setTxToDelete(null);
                  setAlasanHapus('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTransaksi && txToDelete) {
                    onDeleteTransaksi(txToDelete.transaksi_id, alasanHapus.trim() || 'Dihapus via antarmuka transaksi pembelian');
                  }
                  setTxToDelete(null);
                  setAlasanHapus('');
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xs transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus & Rekam Audit Log</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

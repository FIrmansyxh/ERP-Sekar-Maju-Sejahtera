import { formatDateHariBulanTahun } from '../../utils/formatters';
import React, { useState, useMemo, useRef } from 'react';
import { 
  Warehouse, 
  Search, 
  RotateCcw, 
  Download, 
  Calendar, 
  Tag, 
  User, 
  Package, 
  Filter, 
  CheckCircle2, 
  TrendingUp, 
  X,
  Layers, 
  MapPin, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  BarChart3,
  Percent,
  Eye,
  EyeOff
} from 'lucide-react';
import { Gudang, Barang, Petani, TransaksiPembelian, UserRole } from '../../types';
import { GRADE_COLOR_MAP } from '../../data/initialHargaData';
import { downloadCsvFile, downloadElementAsPdf } from '../../utils/printDownload';
import { Pagination } from '../common/Pagination';

interface LaporanGudangViewProps {
  gudangList: Gudang[];
  barangList: Barang[];
  petaniList?: Petani[];
  transaksiList?: TransaksiPembelian[];
  userRole?: UserRole;
  onNavigateToGudang?: () => void;
  onNavigateToBarang?: () => void;
}

export const LaporanGudangView: React.FC<LaporanGudangViewProps> = ({
  gudangList = [],
  barangList = [],
  petaniList = [],
  transaksiList = [],
  userRole = 'superadmin',
  onNavigateToGudang,
  onNavigateToBarang,
}) => {
  // Filter States
  const [filterGudangId, setFilterGudangId] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterStatusStok, setFilterStatusStok] = useState<string>('di_gudang');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Applied Filter
  const [appliedFilters, setAppliedFilters] = useState({
    gudangId: 'ALL',
    grade: 'ALL',
    statusStok: 'di_gudang',
    startDate: '',
    endDate: '',
    search: '',
  });

  // UI States
  const [showSummaryCards, setShowSummaryCards] = useState<boolean>(true);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const printDocumentRef = useRef<HTMLDivElement>(null);

  // Apply filters
  const handleApplyFilter = () => {
    setAppliedFilters({
      gudangId: filterGudangId,
      grade: filterGrade,
      statusStok: filterStatusStok,
      startDate: filterStartDate,
      endDate: filterEndDate,
      search: searchQuery,
    });
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setFilterGudangId('ALL');
    setFilterGrade('ALL');
    setFilterStatusStok('di_gudang');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
    setAppliedFilters({
      gudangId: 'ALL',
      grade: 'ALL',
      statusStok: 'di_gudang',
      startDate: '',
      endDate: '',
      search: '',
    });
    setCurrentPage(1);
  };

  // Helper matching barang to gudang
  const isBarangInGudang = (b: Barang, g: Gudang) => {
    if (b.gudang_id && b.gudang_id === g.gudang_id) return true;
    const loc = (b.lokasi_gudang || '').toLowerCase();
    const gName = (g.nama_gudang || g.nama_lokasi || '').toLowerCase();
    const gCode = (g.kode_gudang || '').toLowerCase();
    if (gCode && loc.includes(gCode)) return true;
    if (gName && loc.includes(gName)) return true;
    return false;
  };

  // 1. Warehouse level metrics calculation
  const warehouseStats = useMemo(() => {
    return gudangList.map((g) => {
      // All bales assigned to this warehouse
      const allAssignedBales = barangList.filter((b) => isBarangInGudang(b, g));
      
      // Active in warehouse
      const activeBales = allAssignedBales.filter((b) => b.status_stok === 'di_gudang');
      
      // Ready to ship
      const readyBales = allAssignedBales.filter((b) => b.status_stok === 'siap_kirim');

      // Shipped / Out
      // Active Pengiriman mapping
      const activePengirimanIds = new Set(
        (window as any).pengirimanList?.filter((p: any) => p.status !== 'diterima' && p.status !== 'selesai').map((p: any) => p.pengiriman_id) || []
      );

      // A bale is considered in warehouse if it's literally there, OR if it's on a truck (keluar) but the DO is not yet selesai, OR if it's in lab (terkirim_sample).
      const actuallyInWarehouseBales = allAssignedBales.filter(b => {
        if (b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim' || b.status_stok === 'terkirim_sample') return true;
        if (b.status_stok === 'keluar' && b.pengiriman_id && activePengirimanIds.has(b.pengiriman_id)) return true;
        return false;
      });

      const outBales = allAssignedBales.filter((b) => !actuallyInWarehouseBales.includes(b));
      
      const totalMasukBal = allAssignedBales.length;
      const currentOccupiedBal = actuallyInWarehouseBales.length;
      
      const currentKg = actuallyInWarehouseBales.reduce((acc, b) => acc + (b.berat_kg || 0), 0);

      const capacity = g.kapasitas_bal || 1000;
      const occupancyPct = capacity > 0 ? (currentOccupiedBal / capacity) * 100 : 0;
      const roundedPct = Math.round(occupancyPct * 10) / 10;
      const sisaKapasitas = Math.max(0, capacity - currentOccupiedBal);

      // Grade breakdown in this warehouse (for active stock)
      const gradesMap: Record<string, { bal: number; kg: number }> = {};
      activeBales.forEach((b) => {
        const gr = (b.kode_grade || 'LAIN').toUpperCase();
        if (!gradesMap[gr]) gradesMap[gr] = { bal: 0, kg: 0 };
        gradesMap[gr].bal += 1;
        gradesMap[gr].kg += b.berat_kg || 0;
      });

      return {
        ...g,
        totalMasukBal,
        currentOccupiedBal,
        activeBalCount: activeBales.length,
        readyBalCount: readyBales.length,
        outBalCount: outBales.length,
        currentKg,
        capacity,
        occupancyPct: roundedPct,
        sisaKapasitas,
        gradesMap,
      };
    });
  }, [gudangList, barangList]);

  // Overall totals across all warehouses
  const overallTotals = useMemo(() => {
    const totalCapacity = warehouseStats.reduce((sum, g) => sum + g.capacity, 0);
    const totalActiveBal = warehouseStats.reduce((sum, g) => sum + g.currentOccupiedBal, 0);
    const totalBalMasuk = warehouseStats.reduce((sum, g) => sum + g.totalMasukBal, 0);
    const totalBalKeluar = warehouseStats.reduce((sum, g) => sum + g.outBalCount, 0);
    const totalKg = warehouseStats.reduce((sum, g) => sum + g.currentKg, 0);
    const overallOccupancyPct = totalCapacity > 0 ? Math.round((totalActiveBal / totalCapacity) * 1000) / 10 : 0;
    const totalSisaKapasitas = Math.max(0, totalCapacity - totalActiveBal);

    return {
      totalCapacity,
      totalActiveBal,
      totalBalMasuk,
      totalBalKeluar,
      totalKg,
      overallOccupancyPct,
      totalSisaKapasitas,
      gudangCount: gudangList.length,
    };
  }, [warehouseStats, gudangList]);

  // 2. Filtered specific bales list (Informasi tembakau mana saja yang ada di gudang tersebut)
  const filteredBarangList = useMemo(() => {
    return barangList.filter((b) => {
      // Filter by Gudang
      if (appliedFilters.gudangId !== 'ALL') {
        const targetG = gudangList.find((g) => g.gudang_id === appliedFilters.gudangId);
        if (targetG && !isBarangInGudang(b, targetG)) {
          return false;
        }
      }

      // Filter by Grade
      if (appliedFilters.grade !== 'ALL') {
        if ((b.kode_grade || '').toUpperCase() !== appliedFilters.grade.toUpperCase()) {
          return false;
        }
      }

      // Filter by Status Stok
      if (appliedFilters.statusStok !== 'ALL') {
        if (b.status_stok !== appliedFilters.statusStok) {
          return false;
        }
      }

      // Filter by Date Range (tanggal_masuk)
      if (appliedFilters.startDate) {
        const bDate = (b.tanggal_masuk || '').split('T')[0];
        if (bDate < appliedFilters.startDate) return false;
      }
      if (appliedFilters.endDate) {
        const bDate = (b.tanggal_masuk || '').split('T')[0];
        if (bDate > appliedFilters.endDate) return false;
      }

      // Filter by Search Query
      if (appliedFilters.search) {
        const q = appliedFilters.search.toLowerCase().trim();
        const matchBal = (b.no_bal || '').toLowerCase().includes(q);
        const matchBalId = (b.barang_id || '').toLowerCase().includes(q);
        const matchGrade = (b.kode_grade || '').toLowerCase().includes(q);
        const matchPetani = (b.nama_petani || '').toLowerCase().includes(q);
        const matchDesa = (b.desa_kecamatan || '').toLowerCase().includes(q);
        const matchLokasi = (b.lokasi_gudang || '').toLowerCase().includes(q);
        if (!matchBal && !matchBalId && !matchGrade && !matchPetani && !matchDesa && !matchLokasi) {
          return false;
        }
      }

      return true;
    });
  }, [barangList, appliedFilters, gudangList]);

  // Aggregate stats of currently filtered tobacco list
  const filteredBarangSummary = useMemo(() => {
    const totalBal = filteredBarangList.length;
    const totalKg = filteredBarangList.reduce((sum, b) => sum + (b.berat_kg || 0), 0);

    // Grade composition in filtered view
    const gradeBreakdown: Record<string, { bal: number; kg: number }> = {};
    filteredBarangList.forEach((b) => {
      const g = (b.kode_grade || 'LAIN').toUpperCase();
      if (!gradeBreakdown[g]) gradeBreakdown[g] = { bal: 0, kg: 0 };
      gradeBreakdown[g].bal += 1;
      gradeBreakdown[g].kg += b.berat_kg || 0;
    });

    // Farmer distribution
    const petaniBreakdown: Record<string, { count: number; kg: number }> = {};
    filteredBarangList.forEach((b) => {
      const pName = b.nama_petani || 'Petani Belum Terdata';
      if (!petaniBreakdown[pName]) petaniBreakdown[pName] = { count: 0, kg: 0 };
      petaniBreakdown[pName].count += 1;
      petaniBreakdown[pName].kg += b.berat_kg || 0;
    });

    return {
      totalBal,
      totalKg,
      gradeBreakdown,
      petaniBreakdown,
    };
  }, [filteredBarangList]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBarangList.length / itemsPerPage) || 1;
  const paginatedBarang = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBarangList.slice(start, start + itemsPerPage);
  }, [filteredBarangList, currentPage, itemsPerPage]);

  // Selected warehouse object if specific one is selected
  const selectedWarehouse = useMemo(() => {
    if (appliedFilters.gudangId === 'ALL') return null;
    return warehouseStats.find((g) => g.gudang_id === appliedFilters.gudangId) || null;
  }, [warehouseStats, appliedFilters.gudangId]);

  // Export to CSV / Excel
  const handleExportCSV = () => {
    const filename = `Laporan_Okupansi_Gudang_${new Date().toISOString().slice(0, 10)}.csv`;
    
    // Header section
    const headers = [
      'No',
      'No Bal',
      'ID Bal',
      'Lokasi Gudang / Rak',
      'Kode Grade',
      'Berat Netto (Kg)',
      'Petani Asal',
      'Desa / Kecamatan',
      'Tanggal Masuk',
      'Status Stok',
    ];

    const rows: (string | number)[][] = filteredBarangList.map((b, idx) => [
      idx + 1,
      b.no_bal || '-',
      b.barang_id || '-',
      b.lokasi_gudang || '-',
      b.kode_grade || '-',
      b.berat_kg || 0,
      b.nama_petani || '-',
      b.desa_kecamatan || '-',
      b.tanggal_masuk ? b.tanggal_masuk.split('T')[0] : '-',
      b.status_stok === 'di_gudang' ? 'Di Gudang (Stok Aktif)' : b.status_stok === 'siap_kirim' ? 'Siap Kirim' : 'Keluar / DO',
    ]);

    // Summary row
    rows.push(['', '', '', '', '', '', '', '', '', '']);
    rows.push(['', '', '', 'TOTAL BAL TERDATA', filteredBarangSummary.totalBal + ' Bal', filteredBarangSummary.totalKg + ' Kg', '', '', '', '']);

    downloadCsvFile(filename, headers, rows);
  };

  // PDF Triggers (Direct Download)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdfReport = async () => {
    if (!printDocumentRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(
        printDocumentRef.current,
        `Laporan_Okupansi_Gudang_${new Date().toISOString().slice(0, 10)}.pdf`,
        { orientation: 'portrait' }
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Helper for Occupancy color badge
  const getOccupancyColor = (pct: number) => {
    if (pct >= 85) return { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300', bar: 'bg-red-600', status: 'Kritis / Penuh' };
    if (pct >= 70) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', bar: 'bg-amber-500', status: 'Mendekati Penuh' };
    return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', bar: 'bg-emerald-600', status: 'Tersedia & Optimal' };
  };

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* 1. Header & Actions Bar */}
      <div className="bg-white border border-gray-200 p-4 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-sm bg-red-50 border border-red-200 flex items-center justify-center text-[#b81d24] shrink-0 shadow-2xs">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Laporan Okupansi & Stok Inventaris Gudang
              
            </h1>
            
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowSummaryCards(!showSummaryCards)}
            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xs transition flex items-center space-x-1.5 cursor-pointer"
            title={showSummaryCards ? 'Sembunyikan Ringkasan' : 'Tampilkan Ringkasan'}
          >
            {showSummaryCards ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-gray-600" />
                <span>Sembunyikan Ringkasan</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-gray-600" />
                <span>Tampilkan Ringkasan</span>
              </>
            )}
          </button>

          <button
            onClick={handleResetFilter}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="Muat Ulang / Reset Filter"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="Unduh Data CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor Excel/CSV</span>
          </button>

          <button
            onClick={handleDownloadPdfReport}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:opacity-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="Download PDF Laporan Gudang"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download Rekapitulasi (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Cards */}
      {showSummaryCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Card 1: Total Bal Tersimpan (Stok Aktif) */}
          <div className="bg-white border border-gray-200 p-3.5 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Bal Tersimpan (Stok Aktif)
              </p>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-black text-gray-900 font-mono">
                  {overallTotals.totalActiveBal.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-bold text-gray-500">Bal</span>
              </div>
              <p className="text-[11px] text-gray-600 font-medium">
                Total Berat: <strong className="text-gray-900 font-mono">{overallTotals.totalKg.toLocaleString('id-ID')} Kg</strong> ({(overallTotals.totalKg / 1000).toFixed(1)} Ton)
              </p>
            </div>
            <div className="w-9 h-9 rounded-sm bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>

          {/* Card 2: Kapasitas Total Penampungan */}
          <div className="bg-white border border-gray-200 p-3.5 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Total Kapasitas Tampung
              </p>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-black text-gray-900 font-mono">
                  {overallTotals.totalCapacity.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-bold text-gray-500">Bal</span>
              </div>
              <p className="text-[11px] text-gray-600 font-medium">
                Sisa Ruang: <strong className="text-emerald-700 font-mono">{overallTotals.totalSisaKapasitas.toLocaleString('id-ID')} Bal</strong>
              </p>
            </div>
            <div className="w-9 h-9 rounded-sm bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
              <Warehouse className="w-4.5 h-4.5" />
            </div>
          </div>

          {/* Card 3: % Okupansi Terisi Rata-Rata */}
          <div className="bg-white border border-gray-200 p-3.5 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between">
            <div className="space-y-0.5 flex-1 pr-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                % Okupansi Gudang Terisi
              </p>
              <div className="flex items-baseline space-x-2">
                <span className={`text-xl font-black font-mono ${getOccupancyColor(overallTotals.overallOccupancyPct).text}`}>
                  {overallTotals.overallOccupancyPct}%
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-xs bg-gray-100 text-gray-700 border border-gray-200">
                  {getOccupancyColor(overallTotals.overallOccupancyPct).status}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div 
                  className={`h-full ${getOccupancyColor(overallTotals.overallOccupancyPct).bar}`}
                  style={{ width: `${Math.min(overallTotals.overallOccupancyPct, 100)}%` }}
                />
              </div>
            </div>
            <div className="w-9 h-9 rounded-sm bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Percent className="w-4.5 h-4.5" />
            </div>
          </div>

          {/* Card 4: Akumulasi Bal Masuk & Fasilitas */}
          <div className="bg-white border border-gray-200 p-3.5 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Total Bal Masuk (Akumulasi)
              </p>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-black text-gray-900 font-mono">
                  {overallTotals.totalBalMasuk.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-bold text-gray-500">Bal</span>
              </div>
              <p className="text-[11px] text-gray-600 font-medium">
                Bal Terkirim Pabrik: <strong className="text-blue-700 font-mono">{overallTotals.totalBalKeluar} Bal</strong>
              </p>
            </div>
            <div className="w-9 h-9 rounded-sm bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>

        </div>
      )}

      {/* 3. Filter Section */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-gray-800 bg-white hover:bg-gray-50 transition cursor-pointer border-b border-gray-200"
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-[#b81d24]" />
            <span>Filter Parameter Laporan Gudang & Stok Tembakau</span>
            {(appliedFilters.gudangId !== 'ALL' || appliedFilters.grade !== 'ALL' || appliedFilters.statusStok !== 'di_gudang' || appliedFilters.startDate || appliedFilters.search) && (
              <span className="ml-2 px-2 py-0.5 text-[10px] bg-red-100 text-[#b81d24] font-bold rounded-full">
                Filter Aktif
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-500 font-normal">
            {isFilterPanelOpen ? 'Tutup Filter ▲' : 'Buka Filter ▼'}
          </span>
        </button>

        {isFilterPanelOpen && (
          <div className="p-4 space-y-3 bg-[#fafafa]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              
              {/* Gudang Selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Fasilitas Gudang:
                </label>
                <select
                  value={filterGudangId}
                  onChange={(e) => setFilterGudangId(e.target.value)}
                  className="w-full border border-gray-300 rounded-sm px-2.5 py-1.5 bg-white text-gray-800 font-medium focus:outline-none focus:border-[#b81d24]"
                >
                  <option value="ALL">-- Semua Fasilitas Gudang ({gudangList.length}) --</option>
                  {gudangList.map((g) => (
                    <option key={g.gudang_id} value={g.gudang_id}>
                      {g.kode_gudang} - {g.nama_gudang || g.nama_lokasi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade Tembakau Filter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Grade Tembakau:
                </label>
                <input
                  type="text"
                  list="gudang-grade-list"
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  placeholder="Ketik/Pilih Grade..."
                  className="w-full border border-gray-300 rounded-sm px-2.5 py-1.5 bg-white text-gray-800 font-medium focus:outline-none focus:border-[#b81d24]"
                />
                <datalist id="gudang-grade-list">
                  <option value="ALL">Semua Grade</option>
                  {['A', 'B', 'C', 'D', 'E', 'F'].map((gr) => (
                    <option key={gr} value={gr}>Grade {gr}</option>
                  ))}
                </datalist>
              </div>

              {/* Status Stok Filter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Status Stok Bal:
                </label>
                <select
                  value={filterStatusStok}
                  onChange={(e) => setFilterStatusStok(e.target.value)}
                  className="w-full border border-gray-300 rounded-sm px-2.5 py-1.5 bg-white text-gray-800 font-medium focus:outline-none focus:border-[#b81d24]"
                >
                  <option value="ALL">-- Semua Status Stok --</option>
                  <option value="di_gudang">Di Gudang (Stok Aktif)</option>
                  <option value="siap_kirim">Siap Kirim (Staging DO)</option>
                  <option value="keluar">Keluar / Terkirim ke Pabrik</option>
                </select>
              </div>

              {/* Tanggal Mulai */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Dari Tanggal Masuk:
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-sm px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:border-[#b81d24]"
                />
              </div>

              {/* Tanggal Akhir */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Sampai Tanggal:
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-sm px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:border-[#b81d24]"
                />
              </div>

            </div>

            {/* Row 2: Search Query & Apply Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-200">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari No Bal, Petani, Desa, Lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-none bg-white focus:outline-none focus:border-gray-800"
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

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer"
                >
                  Reset Filter
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilter}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Terapkan Filter</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Rekapitulasi Kapasitas & Okupansi Per Fasilitas Gudang (Table) */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#f8f9fa]">
          <div className="flex items-center space-x-2">
            <Warehouse className="w-4 h-4 text-[#b81d24]" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Rekapitulasi Kapasitas & Okupansi Per Fasilitas Gudang
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-gray-600 border border-gray-300 rounded-xs">
              {warehouseStats.length} Fasilitas
            </span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium">
            Klik nama gudang untuk memfilter stok tembakau secara spesifik
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f1f3f5] border-b border-gray-200 text-gray-700 font-bold">
                <th className="py-2.5 px-3 text-center border-r border-gray-200 w-10">No</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Kode & Nama Fasilitas Gudang</th>
                <th className="py-2.5 px-3 border-r border-gray-200">PJ / Kepala Gudang</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Kapasitas (Bal)</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Total Bal Masuk</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Stok Aktif (Bal)</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Bal Keluar/DO</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right">Total Berat (Kg)</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-44">Tingkat Okupansi (%)</th>
                <th className="py-2.5 px-3 text-center w-28">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {warehouseStats.map((g, index) => {
                const colorInfo = getOccupancyColor(g.occupancyPct);
                const isSelected = appliedFilters.gudangId === g.gudang_id;

                return (
                  <tr 
                    key={g.gudang_id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-red-50/30 transition-colors ${isSelected ? 'bg-red-50/60 font-medium' : ''}`}
                  >
                    <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-gray-600">
                      {index + 1}
                    </td>

                    <td className="py-2.5 px-3 border-r border-gray-200">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="font-mono text-[#b81d24]">{g.kode_gudang}</span>
                        <span>-</span>
                        <span>{g.nama_gudang || g.nama_lokasi}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-xs">{g.alamat || 'Pamekasan, Madura'}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 border-r border-gray-200">
                      <div className="font-semibold text-gray-800">{g.kepala_gudang || '-'}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{g.kontak || '-'}</div>
                    </td>

                    <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-800">
                      {g.capacity.toLocaleString('id-ID')}
                    </td>

                    <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-medium text-gray-700">
                      {g.totalMasukBal}
                    </td>

                    <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-blue-700">
                      {g.activeBalCount}
                    </td>

                    <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-600">
                      {g.outBalCount}
                    </td>

                    <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-gray-900">
                      {g.currentKg.toLocaleString('id-ID')}
                    </td>

                    <td className="py-2.5 px-3 border-r border-gray-200">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-bold font-mono ${colorInfo.text}`}>
                            {g.occupancyPct}%
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Sisa: {g.sisaKapasitas} Bal
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colorInfo.bar}`}
                            style={{ width: `${Math.min(g.occupancyPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => {
                          setFilterGudangId(g.gudang_id);
                          setAppliedFilters((prev) => ({ ...prev, gudangId: g.gudang_id }));
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition cursor-pointer border ${
                          isSelected
                            ? 'bg-[#b81d24] text-white border-[#b81d24]'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                        }`}
                      >
                        {isSelected ? 'Terpilih ✓' : 'Lihat Stok'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer Total */}
            <tfoot>
              <tr className="bg-[#e9ecef] font-bold text-gray-900 border-t-2 border-gray-300">
                <td colSpan={3} className="py-2.5 px-3 text-right uppercase border-r border-gray-300">
                  TOTAL REKAPITULASI SEMUA GUDANG:
                </td>
                <td className="py-2.5 px-3 text-center font-mono border-r border-gray-300">
                  {overallTotals.totalCapacity.toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 text-center font-mono border-r border-gray-300">
                  {overallTotals.totalBalMasuk.toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-blue-800 border-r border-gray-300">
                  {overallTotals.totalActiveBal.toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 text-center font-mono border-r border-gray-300">
                  {overallTotals.totalBalKeluar.toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-gray-300">
                  {overallTotals.totalKg.toLocaleString('id-ID')} Kg
                </td>
                <td className="py-2.5 px-3 font-mono border-r border-gray-300">
                  <span className={`font-bold ${getOccupancyColor(overallTotals.overallOccupancyPct).text}`}>
                    Rata-rata: {overallTotals.overallOccupancyPct}%
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center text-[10px] text-gray-500 font-mono">
                  Sisa: {overallTotals.totalSisaKapasitas} Bal
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Breakdown Komposisi Grade Tembakau di Gudang Terpilih */}
      <div className="bg-white border border-gray-200 p-4 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-[#b81d24]" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Komposisi Grade Kualitas Tembakau ({selectedWarehouse ? selectedWarehouse.nama_gudang : 'Semua Fasilitas Gudang'})
            </h3>
          </div>
          <div className="text-xs text-gray-600 font-medium">
            Total Tembakau Terfilter: <strong className="text-gray-900 font-mono">{filteredBarangSummary.totalBal} Bal</strong> ({filteredBarangSummary.totalKg.toLocaleString('id-ID')} Kg)
          </div>
        </div>

        {/* Grade Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {['A', 'B', 'C', 'D', 'E', 'F'].map((grade) => {
            const data = filteredBarangSummary.gradeBreakdown[grade] || { bal: 0, kg: 0 };
            const pct = filteredBarangSummary.totalBal > 0 
              ? Math.round((data.bal / filteredBarangSummary.totalBal) * 1000) / 10 
              : 0;

            const colorClass = GRADE_COLOR_MAP[grade] || 'bg-gray-100 text-gray-800 border-gray-300';

            return (
              <div 
                key={grade}
                className="bg-[#fafafa] border border-gray-200 p-2.5 rounded-sm flex flex-col justify-between space-y-1 hover:border-gray-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-xs border ${colorClass}`}>
                    Grade {grade}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-gray-500">
                    {pct}%
                  </span>
                </div>
                <div className="pt-1">
                  <div className="text-sm font-black text-gray-900 font-mono">
                    {data.bal} <span className="text-[10px] font-normal text-gray-500">Bal</span>
                  </div>
                  <div className="text-[11px] text-gray-600 font-mono">
                    {data.kg.toLocaleString('id-ID')} Kg
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Daftar Inventaris Detail Tembakau di Gudang */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#f8f9fa]">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#b81d24]" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Informasi Detail Bal Tembakau Tersimpan di Gudang
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-gray-600 border border-gray-300 rounded-xs">
              {filteredBarangList.length} Bal Terdata
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-500 font-medium">Tampil</span>
            <select
              value={itemsPerPage >= 100000 ? 'ALL' : itemsPerPage}
              onChange={(e) => {
                const val = e.target.value;
                setItemsPerPage(val === 'ALL' ? 100000 : Number(val));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-sm px-2 py-1 bg-white text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="ALL">Semua</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f1f3f5] border-b border-gray-200 text-gray-700 font-bold">
                <th className="py-2.5 px-3 text-center border-r border-gray-200 w-10">No</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-28 whitespace-nowrap">No Bal</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-32 whitespace-nowrap">ID Bal</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Lokasi / Fasilitas Gudang</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Grade</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-right">Berat Netto (Kg)</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Petani Asal & Desa</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Tanggal Masuk</th>
                <th className="py-2.5 px-3 text-center">Status Stok</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {paginatedBarang.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Package className="w-8 h-8 text-gray-300" />
                      <p className="text-xs font-semibold text-gray-600">
                        Tidak ada data bal tembakau yang cocok dengan filter.
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Silakan atur filter gudang, grade kualitas, atau kata kunci pencarian.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBarang.map((b, idx) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const gradeColor = GRADE_COLOR_MAP[b.kode_grade] || 'bg-gray-100 text-gray-800 border-gray-300';

                  return (
                    <tr 
                      key={b.barang_id || idx}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-[#f8f9fa] transition-colors`}
                    >
                      <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-gray-600">
                        {rowNumber}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-gray-900 w-28 whitespace-nowrap">
                        {b.no_bal}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-gray-600 w-32 whitespace-nowrap">
                        {b.barang_id}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-medium text-gray-800">
                        {b.lokasi_gudang || '-'}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-xs border ${gradeColor}`}>
                          Grade {b.kode_grade}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-gray-900">
                        {b.berat_kg} kg
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200">
                        <div className="font-medium text-gray-900">{b.nama_petani || '-'}</div>
                        {b.desa_kecamatan && (
                          <div className="text-[10px] text-gray-500">{b.desa_kecamatan}</div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-gray-600">
                        {b.tanggal_masuk ? b.tanggal_masuk.split('T')[0] : '-'}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {b.status_stok === 'di_gudang' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-xs bg-emerald-50 text-emerald-800 border border-emerald-300">
                            Di Gudang (Aktif)
                          </span>
                        )}
                        {b.status_stok === 'siap_kirim' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-xs bg-amber-50 text-amber-800 border border-amber-300">
                            Siap Kirim (DO)
                          </span>
                        )}
                        {(() => {
                          let label = '';
                          let color = '';
                          
                          if (b.status_stok === 'terkirim_sample') {
                             label = 'Diuji Lab (Sample)';
                             color = 'bg-purple-50 text-purple-800 border-purple-300';
                          } else if (b.status_stok === 'keluar') {
                             const doId = b.pengiriman_id;
                             const isActive = false;
                             if (isActive) {
                               label = 'Dimuat di Truk';
                               color = 'bg-orange-50 text-orange-800 border-orange-300';
                             } else {
                               label = 'Terjual / Diterima Pabrik';
                               color = 'bg-blue-50 text-blue-800 border-blue-300';
                             }
                          }
                          
                          if (label) {
                            return (
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-xs border ${color}`}>
                                {label}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Table Total */}
            {filteredBarangList.length > 0 && (
              <tfoot>
                <tr className="bg-[#e9ecef] font-bold text-gray-900 border-t-2 border-gray-300">
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase border-r border-gray-300">
                    TOTAL BAL TEMBAKAU DALAM LAPORAN:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono border-r border-gray-300">
                    {filteredBarangSummary.totalKg.toLocaleString('id-ID')} Kg
                  </td>
                  <td colSpan={3} className="py-2.5 px-3 font-mono text-gray-700">
                    {filteredBarangSummary.totalBal.toLocaleString('id-ID')} Bal
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {filteredBarangList.length > 0 && (
          <div className="p-3 border-t border-gray-200 bg-white">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredBarangList.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* Hidden Container for Direct PDF Export */}
      <div className="hidden">
        <div 
          ref={printDocumentRef}
          id="printable-laporan-gudang"
          className="w-full max-w-3xl bg-white p-6 space-y-5 text-gray-900 font-sans text-xs"
        >
          {/* Kop Surat */}
          <div className="text-center border-b-2 border-gray-800 pb-4 space-y-1">
            <span className="text-[10px] font-black tracking-widest text-[#b81d24] uppercase block">
              PR. SEKAR MAJU SEJAHTERA • PUSAT PAMEKASAN MADURA
            </span>
            <h3 className="text-base font-black tracking-tight text-gray-900 uppercase">
              LAPORAN STATUS OKUPANSI & STOK INVENTARIS GUDANG
            </h3>
            <p className="text-[10px] text-gray-600 font-medium">
              Jl. Raya Tlanakan No. 45, Pamekasan, Madura - Jawa Timur | Telp: (0324) 321888
            </p>
          </div>

          {/* Metadata Laporan */}
          <div className="grid grid-cols-2 gap-4 text-[11px] bg-gray-50 p-3 border border-gray-200">
            <div>
              <div>Tanggal Cetak: <strong className="font-mono">{formatDateHariBulanTahun(new Date().toISOString()) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</strong></div>
              <div>Fasilitas Gudang: <strong>{selectedWarehouse ? `${selectedWarehouse.kode_gudang} - ${selectedWarehouse.nama_gudang}` : 'Semua Fasilitas Pergudangan'}</strong></div>
            </div>
            <div className="text-right">
              <div>Total Bal Tersimpan: <strong className="font-mono">{overallTotals.totalActiveBal} Bal</strong> ({overallTotals.totalKg.toLocaleString('id-ID')} Kg)</div>
              <div>Rata-rata Okupansi: <strong className="font-mono">{overallTotals.overallOccupancyPct}%</strong></div>
            </div>
          </div>

          {/* Tabel 1: Rekapitulasi Pergudangan */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold text-gray-900 uppercase">
              1. Rekapitulasi Kapasitas & Okupansi Fasilitas Gudang
            </h4>
            <table className="w-full text-left border-collapse text-[10px] border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-800">
                  <th className="p-1.5 border-r border-gray-300">Kode & Nama Gudang</th>
                  <th className="p-1.5 border-r border-gray-300">PJ / Kontak</th>
                  <th className="p-1.5 text-center border-r border-gray-300">Kapasitas</th>
                  <th className="p-1.5 text-center border-r border-gray-300">Bal Masuk</th>
                  <th className="p-1.5 text-center border-r border-gray-300">Stok Aktif</th>
                  <th className="p-1.5 text-right border-r border-gray-300">Total Berat (Kg)</th>
                  <th className="p-1.5 text-center">% Okupansi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {warehouseStats.map((g) => (
                  <tr key={g.gudang_id}>
                    <td className="p-1.5 border-r border-gray-300 font-medium">
                      {g.kode_gudang} - {g.nama_gudang}
                    </td>
                    <td className="p-1.5 border-r border-gray-300">{g.kepala_gudang}</td>
                    <td className="p-1.5 text-center font-mono border-r border-gray-300">{g.capacity}</td>
                    <td className="p-1.5 text-center font-mono border-r border-gray-300">{g.totalMasukBal}</td>
                    <td className="p-1.5 text-center font-mono font-bold border-r border-gray-300">{g.activeBalCount}</td>
                    <td className="p-1.5 text-right font-mono border-r border-gray-300">{g.currentKg.toLocaleString('id-ID')}</td>
                    <td className="p-1.5 text-center font-mono font-bold">{g.occupancyPct}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                  <td colSpan={2} className="p-1.5 text-right border-r border-gray-300">TOTAL:</td>
                  <td className="p-1.5 text-center font-mono border-r border-gray-300">{overallTotals.totalCapacity}</td>
                  <td className="p-1.5 text-center font-mono border-r border-gray-300">{overallTotals.totalBalMasuk}</td>
                  <td className="p-1.5 text-center font-mono border-r border-gray-300">{overallTotals.totalActiveBal}</td>
                  <td className="p-1.5 text-right font-mono border-r border-gray-300">{overallTotals.totalKg.toLocaleString('id-ID')} Kg</td>
                  <td className="p-1.5 text-center font-mono">{overallTotals.overallOccupancyPct}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tabel 2: Daftar Bal Tembakau Tersimpan */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold text-gray-900 uppercase">
              2. Daftar Bal Tembakau Tersimpan ({filteredBarangList.length} Bal Total)
            </h4>
            <table className="w-full text-left border-collapse text-[10px] border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-800">
                  <th className="p-1.5 text-center border-r border-gray-300 w-8">No</th>
                  <th className="p-1.5 border-r border-gray-300 w-20">No Bal</th>
                  <th className="p-1.5 border-r border-gray-300">Lokasi Gudang</th>
                  <th className="p-1.5 text-center border-r border-gray-300">Grade</th>
                  <th className="p-1.5 text-right border-r border-gray-300">Berat (Kg)</th>
                  <th className="p-1.5 border-r border-gray-300">Petani Asal</th>
                  <th className="p-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {filteredBarangList.map((b, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 text-center border-r border-gray-300 font-mono">{idx + 1}</td>
                    <td className="p-1.5 border-r border-gray-300 font-mono font-bold">{b.no_bal}</td>
                    <td className="p-1.5 border-r border-gray-300">{b.lokasi_gudang}</td>
                    <td className="p-1.5 text-center font-bold border-r border-gray-300">Grade {b.kode_grade}</td>
                    <td className="p-1.5 text-right font-mono border-r border-gray-300">{b.berat_kg} kg</td>
                    <td className="p-1.5 border-r border-gray-300">{b.nama_petani || '-'}</td>
                    <td className="p-1.5 text-center">{b.status_stok === 'di_gudang' ? 'Di Gudang' : b.status_stok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kolom Tanda Tangan */}
          <div className="pt-6 grid grid-cols-3 text-center text-[10px] text-gray-800">
            <div className="space-y-12">
              <p className="font-semibold">Petugas Logistik Gudang,</p>
              <p className="font-bold underline min-h-[16px]">&nbsp;</p>
            </div>
            <div className="space-y-12">
              <p className="font-semibold">QC / Mutu Tembakau,</p>
              <p className="font-bold underline min-h-[16px]">&nbsp;</p>
            </div>
            <div className="space-y-12">
              <p className="font-semibold">Kepala Gudang Utama,</p>
              <p className="font-bold underline">Bambang Sutrisno, S.T.</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

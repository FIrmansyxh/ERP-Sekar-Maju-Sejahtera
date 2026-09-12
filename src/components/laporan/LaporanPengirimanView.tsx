import { formatDateHariBulanTahun } from '../../utils/formatters';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Truck, 
  Search, 
  RotateCcw, 
  Download, 
  Calendar, 
  MapPin, 
  Package, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Filter, 
  ChevronRight, 
  X, 
  FileText, 
  FileSpreadsheet, 
  ExternalLink,
  FlaskConical,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  UserCheck,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PengirimanBarang, PengirimanSample, Barang, Gudang, UserRole } from '../../types';
import { downloadCsvFile, downloadElementAsPdf } from '../../utils/printDownload';
import { Pagination } from '../common/Pagination';

interface LaporanPengirimanViewProps {
  pengirimanList: PengirimanBarang[];
  sampleList?: PengirimanSample[];
  barangList?: Barang[];
  gudangList?: Gudang[];
  userRole?: UserRole;
  onNavigateToSample?: () => void;
  onNavigateToBarang?: () => void;
}

export const LaporanPengirimanView: React.FC<LaporanPengirimanViewProps> = ({
  pengirimanList = [],
  sampleList = [],
  barangList = [],
  gudangList = [],
  userRole = 'superadmin',
  onNavigateToSample,
  onNavigateToBarang,
}) => {
  // Tabs: 'surat-jalan' | 'rekap-pabrik' | 'sample-qc' | 'log-bal'
  const [activeTab, setActiveTab] = useState<'surat-jalan' | 'rekap-pabrik' | 'sample-qc' | 'log-bal'>('surat-jalan');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPabrik, setFilterPabrik] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'tanggal_desc' | 'tanggal_asc' | 'bal_desc' | 'kg_desc'>('tanggal_desc');

  // Live Table Search for Tab 1
  const [tableSearch, setTableSearch] = useState('');

  // Applied Filter State
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    pabrik: '',
    status: 'ALL',
    startDate: '',
    endDate: '',
    sortBy: 'tanggal_desc',
  });

  // UI & Drawer States
  const [showSummaryCards, setShowSummaryCards] = useState(true);
  const [selectedDOForDetail, setSelectedDOForDetail] = useState<PengirimanBarang | null>(null);
  
  // Tab 1 (Surat Jalan DO) Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Tab 3 (Pengiriman Sample QC) Pagination
  const [sampleCurrentPage, setSampleCurrentPage] = useState(1);
  const [sampleItemsPerPage, setSampleItemsPerPage] = useState(10);

  // Tab 4 (Log Bal Fisik Terkirim) Pagination
  const [balCurrentPage, setBalCurrentPage] = useState(1);
  const [balItemsPerPage, setBalItemsPerPage] = useState(10);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Scroll Position State for Scroll-To-Top and Scroll-To-Bottom buttons (seperti pada menu Laporan Pembelian)
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );

      // Sembunyikan ketika di paling atas (<= 100px) ATAU ketika sudah di paling bawah (>= docHeight - 80px)
      // Muncul kembali ketika di-scroll ke atas dari bawah atau di-scroll ke bawah dari atas
      const isAtTop = scrollY <= 100;
      const isAtBottom = scrollY + windowHeight >= docHeight - 80;

      setShowScrollButtons(!isAtTop && !isAtBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      behavior: 'smooth',
    });
  };

  const printDocumentRef = useRef<HTMLDivElement>(null);

  // List of Unique Pabrik Destinations for Filter
  const uniquePabrikList = useMemo(() => {
    const set = new Set<string>();
    pengirimanList.forEach((p) => {
      if (p.tujuan) set.add(p.tujuan.trim());
    });
    return Array.from(set).sort();
  }, [pengirimanList]);

  // Filtered Pengiriman DO List
  const filteredPengirimanList = useMemo(() => {
    let result = pengirimanList.filter((p) => {
      // Date Filter
      if (p.tanggal_kirim) {
        const pDate = p.tanggal_kirim.split('T')[0];
        if (appliedFilters.startDate && pDate < appliedFilters.startDate) return false;
        if (appliedFilters.endDate && pDate > appliedFilters.endDate) return false;
      }

      // Pabrik Destination Filter
      if (appliedFilters.pabrik && appliedFilters.pabrik !== 'ALL') {
        if (!p.tujuan.toLowerCase().includes(appliedFilters.pabrik.toLowerCase())) {
          return false;
        }
      }

      // Status Filter
      if (appliedFilters.status !== 'ALL') {
        if (p.status !== appliedFilters.status) return false;
      }

      // Search Query (No SJ, Sopir, Plat, Catatan, Kontrak)
      if (appliedFilters.search) {
        const q = appliedFilters.search.toLowerCase();
        const matchSJ = (p.no_surat_jalan || '').toLowerCase().includes(q);
        const matchDriver = (p.driver_nama || '').toLowerCase().includes(q);
        const matchPlat = (p.plat_nomor || '').toLowerCase().includes(q);
        const matchTujuan = (p.tujuan || '').toLowerCase().includes(q);
        const matchKontrak = (p.nomor_kontrak || '').toLowerCase().includes(q);
        const matchPetugas = (p.petugas || p.dibuat_oleh || '').toLowerCase().includes(q);
        if (!matchSJ && !matchDriver && !matchPlat && !matchTujuan && !matchKontrak && !matchPetugas) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (appliedFilters.sortBy === 'tanggal_desc') {
        return (b.tanggal_kirim || '').localeCompare(a.tanggal_kirim || '');
      }
      if (appliedFilters.sortBy === 'tanggal_asc') {
        return (a.tanggal_kirim || '').localeCompare(b.tanggal_kirim || '');
      }
      if (appliedFilters.sortBy === 'bal_desc') {
        return (b.total_bal || 0) - (a.total_bal || 0);
      }
      if (appliedFilters.sortBy === 'kg_desc') {
        return (b.total_berat_kg || 0) - (a.total_berat_kg || 0);
      }
      return 0;
    });

    return result;
  }, [pengirimanList, appliedFilters]);

  // Executive KPI Aggregations
  const overallKPIs = useMemo(() => {
    const totalDO = pengirimanList.length;
    const totalBalKirim = filteredPengirimanList.reduce((sum, p) => sum + (p.total_bal || 0), 0);
    const totalKgKirim = filteredPengirimanList.reduce((sum, p) => sum + (p.total_berat_kg || 0), 0);
    
    const countDiterima = filteredPengirimanList.filter((p) => p.status === 'diterima' || p.status === 'selesai').length;
    const countDalamPerjalanan = filteredPengirimanList.filter((p) => p.status === 'dalam_perjalanan').length;
    const countDimuat = filteredPengirimanList.filter((p) => p.status === 'dimuat').length;

    const totalSample = sampleList.length;
    const sampleApproved = sampleList.filter((s) => s.status === 'disetujui').length;

    return {
      totalDO,
      totalBalKirim,
      totalKgKirim,
      countDiterima,
      countDalamPerjalanan,
      countDimuat,
      totalSample,
      sampleApproved,
    };
  }, [pengirimanList, filteredPengirimanList, sampleList]);

  // Aggregation per Pabrik Buyer (Tab 2)
  const pabrikAggregates = useMemo(() => {
    const map = new Map<string, { pabrik: string; countDO: number; totalBal: number; totalKg: number; diterimaCount: number; pendingCount: number }>();

    filteredPengirimanList.forEach((p) => {
      const pabrik = p.tujuan || 'Pabrik Lainnya';
      const existing = map.get(pabrik) || { pabrik, countDO: 0, totalBal: 0, totalKg: 0, diterimaCount: 0, pendingCount: 0 };
      existing.countDO += 1;
      existing.totalBal += (p.total_bal || 0);
      existing.totalKg += (p.total_berat_kg || 0);
      if (p.status === 'diterima' || p.status === 'selesai') {
        existing.diterimaCount += 1;
      } else {
        existing.pendingCount += 1;
      }
      map.set(pabrik, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredPengirimanList]);

  // Log Bal Fisik Keluar (Tab 4)
  const balKeluarList = useMemo(() => {
    return barangList.filter((b) => b.status_stok === 'keluar');
  }, [barangList]);

  // Handle Apply Filter
  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      search: searchQuery,
      pabrik: filterPabrik,
      status: filterStatus,
      startDate: filterStartDate,
      endDate: filterEndDate,
      sortBy: sortBy,
    });
    setCurrentPage(1);
  };

  // Handle Reset Filter
  const handleResetFilter = () => {
    setSearchQuery('');
    setFilterPabrik('ALL');
    setFilterStatus('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
    setSortBy('tanggal_desc');
    setAppliedFilters({
      search: '',
      pabrik: 'ALL',
      status: 'ALL',
      startDate: '',
      endDate: '',
      sortBy: 'tanggal_desc',
    });
    setCurrentPage(1);
  };

  // Download CSV
  const handleDownloadCsv = () => {
    const headers = [
      'No',
      'No Surat Jalan',
      'Tanggal Kirim',
      'Pabrik Tujuan',
      'Nama Sopir',
      'Plat Kendaraan',
      'Total Bal',
      'Total Berat Netto (Kg)',
      'Status Pengiriman',
      'Nomor Kontrak',
      'Tanggal Diterima',
      'Petugas Logistik',
    ];

    const rows = filteredPengirimanList.map((p, idx) => [
      idx + 1,
      p.no_surat_jalan,
      p.tanggal_kirim ? p.tanggal_kirim.split('T')[0] : '-',
      p.tujuan,
      p.driver_nama,
      p.plat_nomor,
      p.total_bal,
      p.total_berat_kg,
      p.status,
      p.nomor_kontrak || '-',
      p.tanggal_diterima || '-',
      p.petugas || p.dibuat_oleh || '-',
    ]);

    downloadCsvFile(`Laporan_Pengiriman_DO_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  // Download PDF (Direct Download)
  const handleDownloadPdf = async () => {
    if (!printDocumentRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(
        printDocumentRef.current,
        `Laporan_Pengiriman_Tembakau_${new Date().toISOString().slice(0, 10)}.pdf`,
        { orientation: 'landscape' }
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'diterima':
      case 'dikirim':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xs text-[10px] font-bold">
            Diterima Pabrik
          </span>
        );
      case 'dalam_perjalanan':
        return (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xs text-[10px] font-bold">
            Dalam Perjalanan
          </span>
        );
      case 'dimuat':
      default:
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xs text-[10px] font-bold">
            Sedang Dimuat
          </span>
        );
    }
  };

  // Search within filtered results for Tab 1
  const searchedPengirimanList = useMemo(() => {
    if (!tableSearch.trim()) return filteredPengirimanList;
    const q = tableSearch.toLowerCase().trim();
    return filteredPengirimanList.filter((p) => {
      const matchSJ = (p.no_surat_jalan || '').toLowerCase().includes(q);
      const matchDriver = (p.driver_nama || '').toLowerCase().includes(q);
      const matchPlat = (p.plat_nomor || '').toLowerCase().includes(q);
      const matchTujuan = (p.tujuan || '').toLowerCase().includes(q);
      const matchKontrak = (p.nomor_kontrak || '').toLowerCase().includes(q);
      const matchPetugas = (p.petugas || p.dibuat_oleh || '').toLowerCase().includes(q);
      return matchSJ || matchDriver || matchPlat || matchTujuan || matchKontrak || matchPetugas;
    });
  }, [filteredPengirimanList, tableSearch]);

  // Tab 1: Paginated Data & Total Pages
  const paginatedData = useMemo(() => {
    if (itemsPerPage >= 100000) {
      return searchedPengirimanList;
    }
    const start = (currentPage - 1) * itemsPerPage;
    return searchedPengirimanList.slice(start, start + itemsPerPage);
  }, [searchedPengirimanList, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (itemsPerPage >= 100000 || searchedPengirimanList.length === 0) return 1;
    return Math.ceil(searchedPengirimanList.length / itemsPerPage);
  }, [searchedPengirimanList.length, itemsPerPage]);

  // Tab 3: Paginated Sample Data & Total Pages
  const paginatedSampleData = useMemo(() => {
    if (sampleItemsPerPage >= 100000) {
      return sampleList;
    }
    const start = (sampleCurrentPage - 1) * sampleItemsPerPage;
    return sampleList.slice(start, start + sampleItemsPerPage);
  }, [sampleList, sampleCurrentPage, sampleItemsPerPage]);

  const sampleTotalPages = useMemo(() => {
    if (sampleItemsPerPage >= 100000 || sampleList.length === 0) return 1;
    return Math.ceil(sampleList.length / sampleItemsPerPage);
  }, [sampleList.length, sampleItemsPerPage]);

  // Tab 4: Paginated Bal Keluar Data & Total Pages
  const paginatedBalKeluarData = useMemo(() => {
    if (balItemsPerPage >= 100000) {
      return balKeluarList;
    }
    const start = (balCurrentPage - 1) * balItemsPerPage;
    return balKeluarList.slice(start, start + balItemsPerPage);
  }, [balKeluarList, balCurrentPage, balItemsPerPage]);

  const balTotalPages = useMemo(() => {
    if (balItemsPerPage >= 100000 || balKeluarList.length === 0) return 1;
    return Math.ceil(balKeluarList.length / balItemsPerPage);
  }, [balKeluarList.length, balItemsPerPage]);

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* 1. Header Navigation Bar */}
      <div className="bg-white border border-gray-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-[#b81d24]" />
            <h1 className="text-base font-bold text-gray-900 tracking-tight">
              Laporan Pengiriman & Distribusi Tembakau (DO)
            </h1>
          </div>
          
        </div>

        {/* Action Controls: Unduh CSV & Unduh PDF */}
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handleDownloadCsv}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xs transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Download Spreadsheet CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-gray-600" />
            <span>Unduh CSV</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3 py-1.5 bg-[#b81d24] hover:bg-[#991b1b] text-white text-xs font-bold rounded-xs transition flex items-center space-x-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Unduh Laporan Dokumen PDF Resmi"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Memproses PDF...' : 'Unduh PDF Resmi'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      {showSummaryCards && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Surat Jalan
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-gray-900">
                {overallKPIs.totalDO} DO
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                Trip Pengiriman
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Bal Terkirim
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-gray-900">
                {overallKPIs.totalBalKirim.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                Bal Keluar Gudang
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Tonase Keluar
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-blue-900">
                {overallKPIs.totalKgKirim.toLocaleString('id-ID')} kg
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                {(overallKPIs.totalKgKirim / 1000).toFixed(2)} Ton Netto
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Diterima Pabrik
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-emerald-600">
                {overallKPIs.countDiterima} DO
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                Pengiriman Sukses
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Dalam Perjalanan
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-amber-600">
                {overallKPIs.countDalamPerjalanan + overallKPIs.countDimuat} DO
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                Proses Distribusi
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Sample QC Lab
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-purple-900">
                {overallKPIs.totalSample} Sample
              </div>
              <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                {overallKPIs.sampleApproved} Disetujui Pabrik
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filter Controls Panel */}
      <form onSubmit={handleApplyFilter} className="bg-white p-3.5 border border-gray-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filter Data & Parameter Pengiriman Barang</span>
          </div>
          <span className="text-[11px] text-gray-500">
            Ditemukan <strong>{filteredPengirimanList.length}</strong> pengiriman sesuai filter
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          {/* 1. Search Query */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Pencarian Pengiriman</label>
            <div className="relative">
              <input
                type="text"
                placeholder="No SJ / Driver / Plat / Kontrak..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
            </div>
          </div>

          {/* 2. Pabrik Tujuan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Pabrik Tujuan</label>
            <input
              type="text"
              list="pabrik-tujuan-list"
              value={filterPabrik}
              onChange={(e) => setFilterPabrik(e.target.value)}
              placeholder="Ketik/Pilih Pabrik Tujuan..."
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            />
            <datalist id="pabrik-tujuan-list">
              <option value="ALL">Semua Pabrik Tujuan</option>
              {uniquePabrikList.map((pabrik) => (
                <option key={pabrik} value={pabrik}>
                  {pabrik}
                </option>
              ))}
            </datalist>
          </div>

          {/* 3. Status Pengiriman */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Status Pengiriman</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            >
              <option value="ALL">Semua Status</option>
              <option value="diterima">Diterima Pabrik</option>
              <option value="dalam_perjalanan">Dalam Perjalanan</option>
              <option value="dimuat">Sedang Dimuat</option>
            </select>
          </div>

          {/* 4. Tanggal Kirim Dari */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Tanggal Kirim Dari</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            />
          </div>

          {/* 5. Tanggal Kirim Sampai */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Tanggal Kirim Sampai</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            />
          </div>

          {/* 6. Urutan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Urutkan Berdasarkan</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            >
              <option value="tanggal_desc">Tanggal Kirim Terbaru</option>
              <option value="tanggal_asc">Tanggal Kirim Terlama</option>
              <option value="bal_desc">Jumlah Bal Terbanyak</option>
              <option value="kg_desc">Tonase Terbesar (Kg)</option>
            </select>
          </div>

        </div>

        <div className="flex items-center justify-end space-x-2 pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={handleResetFilter}
            className="px-3 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xs transition flex items-center space-x-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
          <button
            type="submit"
            className="px-4 py-1 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xs transition flex items-center space-x-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Terapkan Filter</span>
          </button>
        </div>
      </form>

      {/* 4. Tab Navigation */}
      <div className="flex items-center space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('surat-jalan')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer transition border-b-2 ${
            activeTab === 'surat-jalan'
              ? 'border-[#b81d24] text-[#b81d24] bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Daftar Surat Jalan DO ({filteredPengirimanList.length})
        </button>

        <button
          onClick={() => setActiveTab('rekap-pabrik')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer transition border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'rekap-pabrik'
              ? 'border-[#b81d24] text-[#b81d24] bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Rekapitulasi per Pabrik Buyer ({pabrikAggregates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sample-qc')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer transition border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'sample-qc'
              ? 'border-[#b81d24] text-[#b81d24] bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Pengiriman Sample ({sampleList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('log-bal')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer transition border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'log-bal'
              ? 'border-[#b81d24] text-[#b81d24] bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Log Bal Fisik Terkirim ({balKeluarList.length})</span>
        </button>
      </div>

      {/* 5. Tab Content 1: Surat Jalan Table */}
      {activeTab === 'surat-jalan' && (
        <div className="bg-white border border-gray-200 shadow-2xs overflow-hidden">
          {/* Table Toolbar (Tampil X Data & Kolom Pencarian Utama Pengiriman) */}
          <div className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Tampil X Data Per Halaman */}
              <div className="flex items-center space-x-1.5">
                <span className="text-gray-600 font-medium">Tampil</span>
                <select
                  value={itemsPerPage >= 100000 ? 'all' : itemsPerPage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemsPerPage(val === 'all' ? 100000 : Number(val));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-sm px-2 py-1 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#b81d24] cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">All</option>
                </select>
                <span className="text-gray-500 hidden sm:inline">per hal.</span>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                {tableSearch.trim() ? (
                  <>Ditemukan: <strong className="text-gray-900">{searchedPengirimanList.length}</strong> dari {filteredPengirimanList.length} data</>
                ) : (
                  <>Total: <strong className="text-gray-900">{filteredPengirimanList.length}</strong> surat jalan</>
                )}
              </span>
            </div>

            {/* Kolom Pencarian (Search Bar) Utama Pengiriman */}
            <div className="w-full sm:w-80 md:w-96">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  id="search-laporan-pengiriman-input"
                  type="text"
                  placeholder="Cari cepat (No SJ, Pabrik, Driver, Plat)..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
                />
                {tableSearch && (
                  <button
                    type="button"
                    id="btn-clear-search-laporan-pengiriman"
                    onClick={() => {
                      setTableSearch('');
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 border-r border-gray-200 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">No. Surat Jalan</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Tanggal Kirim</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Pabrik Rekanan / Tujuan</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Armada & Driver</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">Total Bal</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right">Netto (Kg)</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">Status</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Petugas</th>
                  <th className="py-2.5 px-2 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-500 italic">
                      Tidak ada data pengiriman surat jalan yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((p, idx) => {
                    const effectiveLimit = itemsPerPage >= 100000 ? filteredPengirimanList.length : itemsPerPage;
                    const rowNumber = (currentPage - 1) * effectiveLimit + idx + 1;
                    return (
                      <tr 
                        key={p.pengiriman_id}
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-gray-100/80 transition-colors cursor-pointer`}
                        onClick={() => setSelectedDOForDetail(p)}
                      >
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-500">
                          {rowNumber}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200">
                          <div className="font-bold font-mono text-gray-900">{p.no_surat_jalan}</div>
                          {p.nomor_kontrak && (
                            <div className="text-[10px] text-gray-500 font-mono">Kontrak: {p.nomor_kontrak}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-gray-700">
                          {p.tanggal_kirim ? p.tanggal_kirim.split('T')[0] : '-'}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 font-semibold text-gray-900">
                          {p.tujuan}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200">
                          <div className="font-semibold text-gray-800">{p.driver_nama}</div>
                          <div className="text-[10px] font-mono text-gray-500">{p.plat_nomor}</div>
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-900">
                          {p.total_bal} Bal
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-blue-900">
                          {p.total_berat_kg.toLocaleString('id-ID')} kg
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                          {renderStatusBadge(p.status)}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-gray-600 text-[11px]">
                          {p.petugas || p.dibuat_oleh || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedDOForDetail(p)}
                            className="px-2 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xs transition cursor-pointer"
                          >
                            Surat Jalan
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {searchedPengirimanList.length > 0 && (
            <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-gray-600">
                  Menampilkan <strong>{(currentPage - 1) * (itemsPerPage >= 100000 ? searchedPengirimanList.length : itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * (itemsPerPage >= 100000 ? searchedPengirimanList.length : itemsPerPage), searchedPengirimanList.length)}</strong> dari <strong>{searchedPengirimanList.length}</strong> pengiriman
                </div>
                {itemsPerPage >= 100000 && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200 font-semibold">
                    Semua {searchedPengirimanList.length} data ditampilkan dalam 1 halaman
                  </span>
                )}
              </div>

              {itemsPerPage < 100000 && totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={searchedPengirimanList.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. Tab Content 2: Rekapitulasi per Pabrik Buyer */}
      {activeTab === 'rekap-pabrik' && (
        <div className="bg-white border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Rekapitulasi Volume Pasokan per Pabrik Rekanan (Buyer)
            </h3>
            <span className="text-xs text-gray-500">
              Total {pabrikAggregates.length} Pabrik Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center w-12">No</th>
                  <th className="py-2.5 px-4 border-r border-gray-200">Pabrik Rekanan Tujuan</th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-center">Frekuensi DO</th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-center">Total Bal Terkirim</th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right">Total Netto (Kg)</th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right">Rata-rata Tonase/Trip</th>
                  <th className="py-2.5 px-4 text-center">Realisasi Penerimaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pabrikAggregates.map((item, idx) => {
                  const rataKg = item.countDO > 0 ? Math.round(item.totalKg / item.countDO) : 0;
                  const totalAllKg = overallKPIs.totalKgKirim || 1;
                  const persen = ((item.totalKg / totalAllKg) * 100).toFixed(1);
                  return (
                    <tr key={item.pabrik} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-gray-100/80 transition-colors`}>
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 font-bold text-gray-900">
                        {item.pabrik}
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-center font-mono font-medium text-gray-700">
                        {item.countDO} Trip (DO)
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-center font-mono font-bold text-gray-900">
                        {item.totalBal} Bal
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-mono font-bold text-blue-900">
                        {item.totalKg.toLocaleString('id-ID')} kg
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-mono text-gray-700">
                        ~ {rataKg.toLocaleString('id-ID')} kg
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-20 bg-gray-200 h-2 rounded-xs overflow-hidden">
                            <div className="bg-emerald-600 h-full" style={{ width: `${persen}%` }}></div>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-800 font-bold">{persen}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Tab Content 3: Pengiriman Sample */}
      {activeTab === 'sample-qc' && (
        <div className="bg-white border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Log Pengiriman Sampel Uji Laboratorium & Quality Control ({sampleList.length} Data)
            </h3>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                <span className="font-medium">Tampil</span>
                <select
                  value={sampleItemsPerPage >= 100000 ? 'all' : sampleItemsPerPage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSampleItemsPerPage(val === 'all' ? 100000 : Number(val));
                    setSampleCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-xs px-2 py-1 bg-white text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#b81d24]"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">All</option>
                </select>
              </div>
              {onNavigateToSample && (
                <button
                  onClick={onNavigateToSample}
                  className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xs transition flex items-center space-x-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Modul Sample QC</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center w-10">No</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">ID Sample</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Grade / Mutu</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Tanggal Kirim</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Tujuan Lab / Pabrik</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right">Berat Sample</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">Status Pengujian</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Petugas QC</th>
                  <th className="py-2.5 px-3">Catatan / Respon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sampleList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500 italic">
                      Belum ada data pengiriman sampel laboratorium tercatat.
                    </td>
                  </tr>
                ) : (
                  paginatedSampleData.map((s, idx) => {
                    const effectiveLimit = sampleItemsPerPage >= 100000 ? sampleList.length : sampleItemsPerPage;
                    const rowNumber = (sampleCurrentPage - 1) * effectiveLimit + idx + 1;
                    return (
                      <tr key={s.sample_id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-gray-100/80 transition-colors`}>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-500">{rowNumber}</td>
                        <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-gray-900">{s.sample_id}</td>
                        <td className="py-2.5 px-3 border-r border-gray-200">
                          <span className="px-2 py-0.5 bg-zinc-900 text-white rounded-xs text-[10px] font-bold">
                            Grade {s.kode_grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-gray-700">
                          {s.tanggal_kirim ? s.tanggal_kirim.split('T')[0] : '-'}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 font-semibold text-gray-800">{s.tujuan}</td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-gray-900">
                          {s.berat_sample_gram} gram
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                          {s.status === 'disetujui' ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xs text-[10px] font-bold">
                              Disetujui Lab
                            </span>
                          ) : s.status === 'ditolak' ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-xs text-[10px] font-bold">
                              Ditolak
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xs text-[10px] font-bold">
                              Dalam Pengujian
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-gray-600">{s.dikirim_oleh}</td>
                        <td className="py-2.5 px-3 text-gray-500 text-[11px] italic">{s.catatan || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Sample QC Pagination Controls */}
          {sampleList.length > 0 && (
            <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <span className="font-medium">Tampil</span>
                  <select
                    value={sampleItemsPerPage >= 100000 ? 'all' : sampleItemsPerPage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSampleItemsPerPage(val === 'all' ? 100000 : Number(val));
                      setSampleCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-xs px-2 py-1 bg-white text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#b81d24]"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div className="text-xs text-gray-600">
                  Menampilkan <strong>{(sampleCurrentPage - 1) * (sampleItemsPerPage >= 100000 ? sampleList.length : sampleItemsPerPage) + 1}</strong> - <strong>{Math.min(sampleCurrentPage * (sampleItemsPerPage >= 100000 ? sampleList.length : sampleItemsPerPage), sampleList.length)}</strong> dari <strong>{sampleList.length}</strong> sampel
                </div>
                {sampleItemsPerPage >= 100000 && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200 font-semibold">
                    Semua {sampleList.length} data sampel ditampilkan dalam 1 halaman
                  </span>
                )}
              </div>

              {sampleItemsPerPage < 100000 && sampleTotalPages > 1 && (
                <Pagination
                  currentPage={sampleCurrentPage}
                  totalPages={sampleTotalPages}
                  totalItems={sampleList.length}
                  itemsPerPage={sampleItemsPerPage}
                  onPageChange={(page) => setSampleCurrentPage(page)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 8. Tab Content 4: Log Bal Fisik Terkirim */}
      {activeTab === 'log-bal' && (
        <div className="bg-white border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Log Seluruh Bal Fisik Berstatus Keluar (Terkirim Pabrik) ({balKeluarList.length} Data)
            </h3>
            <div className="flex items-center space-x-1.5 text-xs text-gray-600">
              <span className="font-medium">Tampil</span>
              <select
                value={balItemsPerPage >= 100000 ? 'all' : balItemsPerPage}
                onChange={(e) => {
                  const val = e.target.value;
                  setBalItemsPerPage(val === 'all' ? 100000 : Number(val));
                  setBalCurrentPage(1);
                }}
                className="border border-gray-300 rounded-xs px-2 py-1 bg-white text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#b81d24]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center w-10">No</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">No Bal</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">No Bal Fisik</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">Grade</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right">Berat Netto (Kg)</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Petani Asal</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Lokasi Asal Gudang</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">Tanggal Keluar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {balKeluarList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500 italic">
                      Belum ada catatan bal fisik yang berstatus keluar.
                    </td>
                  </tr>
                ) : (
                  paginatedBalKeluarData.map((b, idx) => {
                    const effectiveLimit = balItemsPerPage >= 100000 ? balKeluarList.length : balItemsPerPage;
                    const rowNumber = (balCurrentPage - 1) * effectiveLimit + idx + 1;
                    return (
                      <tr key={b.barang_id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-gray-100/80 transition-colors`}>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-500">{rowNumber}</td>
                        <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-gray-900">{b.barang_id}</td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-800">{b.no_bal}</td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                          <span className="px-2 py-0.5 bg-zinc-900 text-white rounded-none text-[10px] font-bold">
                            Grade {b.kode_grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-gray-900">
                          {b.berat_kg} kg
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 font-semibold text-gray-800">
                          {b.nama_petani || '-'}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-gray-600">{b.lokasi_gudang}</td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-600">
                          {b.tanggal_keluar || b.tanggal_masuk}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bal Keluar Pagination Controls */}
          {balKeluarList.length > 0 && (
            <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <span className="font-medium">Tampil</span>
                  <select
                    value={balItemsPerPage >= 100000 ? 'all' : balItemsPerPage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBalItemsPerPage(val === 'all' ? 100000 : Number(val));
                      setBalCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-xs px-2 py-1 bg-white text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#b81d24]"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div className="text-xs text-gray-600">
                  Menampilkan <strong>{(balCurrentPage - 1) * (balItemsPerPage >= 100000 ? balKeluarList.length : balItemsPerPage) + 1}</strong> - <strong>{Math.min(balCurrentPage * (balItemsPerPage >= 100000 ? balKeluarList.length : balItemsPerPage), balKeluarList.length)}</strong> dari <strong>{balKeluarList.length}</strong> bal fisik
                </div>
                {balItemsPerPage >= 100000 && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200 font-semibold">
                    Semua {balKeluarList.length} bal ditampilkan dalam 1 halaman
                  </span>
                )}
              </div>

              {balItemsPerPage < 100000 && balTotalPages > 1 && (
                <Pagination
                  currentPage={balCurrentPage}
                  totalPages={balTotalPages}
                  totalItems={balKeluarList.length}
                  itemsPerPage={balItemsPerPage}
                  onPageChange={(page) => setBalCurrentPage(page)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Scroll Controls (Otomatis Geser ke Paling Atas & Paling Bawah seperti pada Laporan Pembelian) */}
      <div 
        className={`fixed bottom-6 right-6 z-40 flex flex-col items-center space-y-2 transition-all duration-300 ${
          showScrollButtons ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={scrollToTop}
          className="p-2.5 bg-white/90 hover:bg-white text-gray-600 hover:text-[#b81d24] rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.1)] border border-gray-200 hover:border-red-200 backdrop-blur-sm transition-all cursor-pointer group flex items-center justify-center hover:scale-110 active:scale-95"
          title="Geser ke Paling Atas"
        >
          <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="sr-only">Geser ke Paling Atas</span>
        </button>
        <button
          type="button"
          onClick={scrollToBottom}
          className="p-2.5 bg-white/90 hover:bg-white text-gray-600 hover:text-[#b81d24] rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.1)] border border-gray-200 hover:border-red-200 backdrop-blur-sm transition-all cursor-pointer group flex items-center justify-center hover:scale-110 active:scale-95"
          title="Geser ke Paling Bawah"
        >
          <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          <span className="sr-only">Geser ke Paling Bawah</span>
        </button>
      </div>

      {/* 9. Modal: Detail Surat Jalan Delivery Order */}
      {selectedDOForDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-300 shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    Surat Jalan: {selectedDOForDetail.no_surat_jalan}
                  </h3>
                  {renderStatusBadge(selectedDOForDetail.status)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tujuan: <strong className="text-gray-800">{selectedDOForDetail.tujuan}</strong> • 
                  Tgl Kirim: <span className="font-mono text-gray-700">{selectedDOForDetail.tanggal_kirim}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedDOForDetail(null)}
                className="p-1 hover:bg-gray-200 rounded-none text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Stats Grid */}
            <div className="p-4 bg-white grid grid-cols-3 gap-3 border-b border-gray-200">
              <div className="p-2.5 bg-gray-50 border border-gray-200 text-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Sopir & Armada</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">{selectedDOForDetail.driver_nama}</div>
                <div className="text-[11px] font-mono text-gray-500">{selectedDOForDetail.plat_nomor}</div>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 text-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Kuantitas Bal</div>
                <div className="text-base font-bold font-mono text-gray-900 mt-0.5">
                  {selectedDOForDetail.total_bal} Bal
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 text-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Total Tonase</div>
                <div className="text-base font-bold font-mono text-gray-900 mt-0.5">
                  {selectedDOForDetail.total_berat_kg.toLocaleString('id-ID')} kg
                </div>
              </div>
            </div>

            {/* Modal Bal List */}
            <div className="p-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Daftar No Bal Tembakau yang Dimuat
              </h4>

              {selectedDOForDetail.barang_ids && selectedDOForDetail.barang_ids.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedDOForDetail.barang_ids.map((id, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 border border-gray-200 text-xs font-mono flex items-center justify-between">
                      <span className="font-bold text-gray-800">{id}</span>
                      <span className="text-[10px] text-gray-400">#{idx + 1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 italic bg-gray-50 border border-gray-200">
                  Rincian bal tercantum pada lembar fisik surat jalan asli.
                </div>
              )}

              {selectedDOForDetail.catatan && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <strong>Catatan Pengiriman:</strong> {selectedDOForDetail.catatan}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedDOForDetail(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 10. Offscreen Printable Document for High-Fidelity PDF Generation */}
      <div className="hidden">
        <div ref={printDocumentRef} className="p-8 bg-white text-gray-900 font-sans" style={{ width: '1080px' }}>
          
          {/* Letterhead Header */}
          <div className="border-b-2 border-gray-800 pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#b81d24] text-white font-bold flex items-center justify-center text-sm">
                SMS
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-gray-900">PR. SEKAR MAJU SEJAHTERA</h1>
                <p className="text-[11px] text-gray-600 font-medium">
                  Sistem Data Gudang Tembakau & Rekapitulasi Pengiriman (DO)
                </p>
                <p className="text-[10px] text-gray-500">
                  Pamekasan, Madura, Jawa Timur • Dokumen Resmi Pengiriman Barang
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[#b81d24] uppercase">LAPORAN PENGIRIMAN & DISTRIBUSI</div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Tanggal Ekspor: {formatDateHariBulanTahun(new Date().toISOString())}
              </div>
              <div className="text-[10px] text-gray-500">
                Tujuan: {appliedFilters.pabrik !== 'ALL' ? appliedFilters.pabrik : 'Semua Pabrik'} • Status: {appliedFilters.status !== 'ALL' ? appliedFilters.status : 'Semua Status'}
              </div>
            </div>
          </div>

          {/* KPI Summary Block */}
          <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 border border-gray-300">
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total Surat Jalan (DO)</div>
              <div className="text-sm font-bold font-mono text-gray-900">{overallKPIs.totalDO} Trip</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total Bal Terkirim</div>
              <div className="text-sm font-bold font-mono text-gray-900">{overallKPIs.totalBalKirim} Bal</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total Tonase Bersih</div>
              <div className="text-sm font-bold font-mono text-blue-900">{overallKPIs.totalKgKirim.toLocaleString('id-ID')} kg</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Realisasi Diterima</div>
              <div className="text-sm font-bold font-mono text-emerald-700">{overallKPIs.countDiterima} DO Sukses</div>
            </div>
          </div>

          {/* Main Data Table */}
          <table className="w-full text-left text-[11px] border-collapse border border-gray-400 mb-6">
            <thead>
              <tr className="bg-gray-100 font-bold text-gray-900 border-b border-gray-400">
                <th className="p-2 border border-gray-300 text-center w-8">No</th>
                <th className="p-2 border border-gray-300">No. Surat Jalan</th>
                <th className="p-2 border border-gray-300">Tanggal Kirim</th>
                <th className="p-2 border border-gray-300">Pabrik Rekanan Tujuan</th>
                <th className="p-2 border border-gray-300">Nama Sopir</th>
                <th className="p-2 border border-gray-300">No. Kendaraan</th>
                <th className="p-2 border border-gray-300 text-center">Total Bal</th>
                <th className="p-2 border border-gray-300 text-right">Netto (Kg)</th>
                <th className="p-2 border border-gray-300 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPengirimanList.map((p, idx) => (
                <tr key={p.pengiriman_id} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-1.5 border border-gray-300 text-center font-mono">{idx + 1}</td>
                  <td className="p-1.5 border border-gray-300 font-mono font-bold">{p.no_surat_jalan}</td>
                  <td className="p-1.5 border border-gray-300 font-mono">{p.tanggal_kirim ? p.tanggal_kirim.split('T')[0] : '-'}</td>
                  <td className="p-1.5 border border-gray-300 font-semibold">{p.tujuan}</td>
                  <td className="p-1.5 border border-gray-300">{p.driver_nama}</td>
                  <td className="p-1.5 border border-gray-300 font-mono">{p.plat_nomor}</td>
                  <td className="p-1.5 border border-gray-300 text-center font-mono font-bold">{p.total_bal}</td>
                  <td className="p-1.5 border border-gray-300 text-right font-mono font-bold text-blue-900">{p.total_berat_kg.toLocaleString('id-ID')}</td>
                  <td className="p-1.5 border border-gray-300 text-center font-semibold">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Formal Signatures */}
          <div className="grid grid-cols-3 gap-8 pt-6 text-center text-xs">
            <div>
              <div className="text-gray-500">Petugas Logistik / Pengirim,</div>
              <div className="font-bold text-gray-900 mt-0.5">Staff Ekspedisi</div>
              <div className="h-16"></div>
              <div className="font-semibold text-gray-800 border-t border-gray-400 pt-1 min-h-[22px]">&nbsp;</div>
            </div>
            <div>
              <div className="text-gray-500">Diperiksa Oleh,</div>
              <div className="font-bold text-gray-900 mt-0.5">Kepala Gudang Tembakau</div>
              <div className="h-16"></div>
              <div className="font-semibold text-gray-800 border-t border-gray-400 pt-1">Bambang Sutrisno, S.T.</div>
            </div>
            <div>
              <div className="text-gray-500">Diterima Oleh,</div>
              <div className="font-bold text-gray-900 mt-0.5">Pihak Pabrik Rekanan</div>
              <div className="h-16"></div>
              <div className="font-semibold text-gray-800 border-t border-gray-400 pt-1 min-h-[22px]">&nbsp;</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

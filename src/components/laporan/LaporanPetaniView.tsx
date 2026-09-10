import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  RotateCcw, 
  Download, 
  Calendar, 
  MapPin, 
  Phone, 
  Tag, 
  CreditCard,
  Package, 
  DollarSign, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Clock, 
  Filter, 
  ChevronRight, 
  X, 
  FileText, 
  FileSpreadsheet, 
  ArrowUpRight,
  ShieldCheck,
  Scale,
  ExternalLink,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Petani, TransaksiPembelian, Barang, UserRole } from '../../types';
import { downloadCsvFile, downloadElementAsPdf } from '../../utils/printDownload';
import { formatDateHariBulanTahun } from '../../utils/formatters';
import { Pagination } from '../common/Pagination';

interface LaporanPetaniViewProps {
  petaniList: Petani[];
  transaksiList: TransaksiPembelian[];
  barangList?: Barang[];
  userRole?: UserRole;
  onNavigateToPetani?: () => void;
  onNavigateToTransaksi?: () => void;
}

export const LaporanPetaniView: React.FC<LaporanPetaniViewProps> = ({
  petaniList = [],
  transaksiList = [],
  barangList = [],
  userRole = 'superadmin',
  onNavigateToPetani,
  onNavigateToTransaksi,
}) => {
  // Tabs: 'rekap' | 'top-ranking' | 'wilayah'
  const [activeTab, setActiveTab] = useState<'rekap' | 'top-ranking' | 'wilayah'>('rekap');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterWilayah, setFilterWilayah] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'bal_desc' | 'kg_desc' | 'nilai_desc' | 'nama_asc' | 'transaksi_desc'>('bal_desc');

  // Applied Filter State
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: 'ALL',
    wilayah: '',
    startDate: '',
    endDate: '',
    sortBy: 'bal_desc',
  });

  // UI & Detail Drawer State
  const [showSummaryCards, setShowSummaryCards] = useState<boolean>(true);
  const [selectedPetaniForDetail, setSelectedPetaniForDetail] = useState<Petani | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const printDocumentRef = useRef<HTMLDivElement>(null);

  // List of unique areas / desa for filter dropdown
  const uniqueWilayahList = useMemo(() => {
    const set = new Set<string>();
    petaniList.forEach((p) => {
      if (p.desa_kecamatan) set.add(p.desa_kecamatan.trim());
      else if (p.alamat) set.add(p.alamat.trim());
    });
    return Array.from(set).sort();
  }, [petaniList]);

  // Aggregate Farmer Metrics from TransaksiPembelian & Barang
  const petaniMetrics = useMemo(() => {
    return petaniList.map((p) => {
      // Find all transactions of this farmer
      const txs = transaksiList.filter(
        (t) => t.petani_id === p.petani_id || (t.nama_petani && t.nama_petani.toLowerCase() === p.nama_petani.toLowerCase())
      );

      // Filter by date if specified in applied filters
      const filteredTxs = txs.filter((t) => {
        if (!t.tanggal_transaksi) return true;
        const txDate = t.tanggal_transaksi.split('T')[0];
        if (appliedFilters.startDate && txDate < appliedFilters.startDate) return false;
        if (appliedFilters.endDate && txDate > appliedFilters.endDate) return false;
        return true;
      });

      const totalTransaksi = filteredTxs.length;

      // Calculate Bal count
      let totalBal = 0;
      filteredTxs.forEach((t) => {
        const balInTx = t.total_bal || (t.items && t.items.length) || (t.barang_ids && t.barang_ids.length) || 1;
        totalBal += balInTx;
      });

      // Calculate Netto Kg
      const totalKg = filteredTxs.reduce((sum, t) => sum + (t.berat_kg || 0), 0);

      // Calculate Total Pembelian Rupiah (setelah potongan)
      const totalNilaiRp = filteredTxs.reduce((sum, t) => {
        const subtotal = t.total_harga_beli || (t.berat_kg * t.harga_per_kg);
        const jmlBayar = t.harga_final || (subtotal - (t.total_potongan || 7000));
        return sum + jmlBayar;
      }, 0);

      // Grade Dominan & Breakdown
      const gradeCountMap: Record<string, number> = {};
      filteredTxs.forEach((t) => {
        if (t.items && t.items.length > 0) {
          t.items.forEach((item) => {
            const g = (item.kode_grade || 'A').toUpperCase();
            gradeCountMap[g] = (gradeCountMap[g] || 0) + 1;
          });
        } else if (t.kode_grade && t.kode_grade !== 'Multi-Grade') {
          const g = t.kode_grade.toUpperCase();
          gradeCountMap[g] = (gradeCountMap[g] || 0) + (t.total_bal || 1);
        }
      });

      let gradeDominan = '-';
      let maxCount = 0;
      Object.entries(gradeCountMap).forEach(([g, count]) => {
        if (count > maxCount) {
          maxCount = count;
          gradeDominan = g;
        }
      });

      // Last Transaction Date
      let lastTxDate = p.statistik?.kunjungan_terakhir || p.tanggal_daftar || '-';
      if (filteredTxs.length > 0) {
        const sortedDates = [...filteredTxs].sort((a, b) => 
          (b.tanggal_transaksi || '').localeCompare(a.tanggal_transaksi || '')
        );
        lastTxDate = sortedDates[0].tanggal_transaksi?.split('T')[0] || lastTxDate;
      }

      return {
        ...p,
        totalTransaksi,
        totalBal,
        totalKg,
        totalNilaiRp,
        gradeDominan,
        lastTxDate,
        txList: filteredTxs,
      };
    });
  }, [petaniList, transaksiList, appliedFilters.startDate, appliedFilters.endDate]);

  // Apply Search, Status, Wilayah & Sorting filters
  const filteredPetaniData = useMemo(() => {
    let result = petaniMetrics.filter((p) => {
      // Search
      if (appliedFilters.search) {
        const q = appliedFilters.search.toLowerCase();
        const matchName = (p.nama_petani || '').toLowerCase().includes(q);
        const matchId = (p.petani_id || '').toLowerCase().includes(q);
        const matchHp = (p.no_hp || '').includes(q);
        const matchCard = (p.petani_id || '').toLowerCase().includes(q);
        const matchAlamat = (p.alamat || '').toLowerCase().includes(q);
        const matchDesa = (p.desa_kecamatan || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchHp && !matchCard && !matchAlamat && !matchDesa) {
          return false;
        }
      }

      // Status
      if (appliedFilters.status === 'aktif' && !p.status_aktif) return false;
      if (appliedFilters.status === 'nonaktif' && p.status_aktif) return false;

      // Wilayah
      if (appliedFilters.wilayah && appliedFilters.wilayah !== 'ALL') {
        const pWilayah = p.desa_kecamatan || p.alamat || '';
        if (!pWilayah.toLowerCase().includes(appliedFilters.wilayah.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (appliedFilters.sortBy === 'bal_desc') {
        return b.totalBal - a.totalBal || b.totalKg - a.totalKg;
      }
      if (appliedFilters.sortBy === 'kg_desc') {
        return b.totalKg - a.totalKg || b.totalBal - a.totalBal;
      }
      if (appliedFilters.sortBy === 'nilai_desc') {
        return b.totalNilaiRp - a.totalNilaiRp;
      }
      if (appliedFilters.sortBy === 'transaksi_desc') {
        return b.totalTransaksi - a.totalTransaksi;
      }
      if (appliedFilters.sortBy === 'nama_asc') {
        return a.nama_petani.localeCompare(b.nama_petani);
      }
      return 0;
    });

    return result;
  }, [petaniMetrics, appliedFilters]);

  // Overall Aggregates for KPI Cards
  const overallKPIs = useMemo(() => {
    const totalPetani = petaniList.length;
    const totalPetaniAktif = petaniList.filter((p) => p.status_aktif).length;
    const totalBalSetor = filteredPetaniData.reduce((sum, p) => sum + p.totalBal, 0);
    const totalKgSetor = filteredPetaniData.reduce((sum, p) => sum + p.totalKg, 0);
    const totalNilaiRp = filteredPetaniData.reduce((sum, p) => sum + p.totalNilaiRp, 0);
    const petaniPenyetorAktif = filteredPetaniData.filter((p) => p.totalBal > 0).length;
    const rataRataKgPerPetani = petaniPenyetorAktif > 0 ? Math.round(totalKgSetor / petaniPenyetorAktif) : 0;
    const rataRataBalPerPetani = petaniPenyetorAktif > 0 ? (totalBalSetor / petaniPenyetorAktif).toFixed(1) : '0';

    return {
      totalPetani,
      totalPetaniAktif,
      totalBalSetor,
      totalKgSetor,
      totalNilaiRp,
      petaniPenyetorAktif,
      rataRataKgPerPetani,
      rataRataBalPerPetani,
    };
  }, [petaniList, filteredPetaniData]);

  // Aggregation per Wilayah / Desa (Tab 3)
  const wilayahAggregates = useMemo(() => {
    const map = new Map<string, { desa: string; countPetani: number; totalBal: number; totalKg: number; totalNilai: number }>();

    filteredPetaniData.forEach((p) => {
      const desa = p.desa_kecamatan || p.alamat || 'Wilayah Lainnya';
      const existing = map.get(desa) || { desa, countPetani: 0, totalBal: 0, totalKg: 0, totalNilai: 0 };
      existing.countPetani += 1;
      existing.totalBal += p.totalBal;
      existing.totalKg += p.totalKg;
      existing.totalNilai += p.totalNilaiRp;
      map.set(desa, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredPetaniData]);

  // Handle Apply Filter
  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      search: searchQuery,
      status: filterStatus,
      wilayah: filterWilayah,
      startDate: filterStartDate,
      endDate: filterEndDate,
      sortBy: sortBy,
    });
    setCurrentPage(1);
  };

  // Handle Reset Filter
  const handleResetFilter = () => {
    setSearchQuery('');
    setFilterStatus('ALL');
    setFilterWilayah('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
    setSortBy('bal_desc');
    setAppliedFilters({
      search: '',
      status: 'ALL',
      wilayah: 'ALL',
      startDate: '',
      endDate: '',
      sortBy: 'bal_desc',
    });
    setCurrentPage(1);
  };

  // Export CSV
  const handleDownloadCsv = () => {
    const headers = [
      'No',
      'ID Petani',
      'Nama Petani',
            'No HP',
      'Desa / Wilayah',
      'Status Petani',
      'Total Transaksi',
      'Total Setoran (Bal)',
      'Total Berat (Kg)',
      'Total Pembelian (Rp)',
      'Grade Dominan',
      'Setoran Terakhir',
    ];

    const rows = filteredPetaniData.map((p, idx) => [
      idx + 1,
      p.petani_id,
      p.nama_petani,
      p.no_hp || '-',
      p.desa_kecamatan || p.alamat || '-',
      p.status_aktif ? 'Aktif' : 'Non-Aktif',
      p.totalTransaksi,
      p.totalBal,
      p.totalKg,
      p.totalNilaiRp,
      p.gradeDominan,
      p.lastTxDate,
    ]);

    downloadCsvFile(`Laporan_Petani_Sekar_Anom_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  // Export PDF (Direct Download)
  const handleDownloadPdf = async () => {
    if (!printDocumentRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(
        printDocumentRef.current,
        `Laporan_Kinerja_Petani_${new Date().toISOString().slice(0, 10)}.pdf`,
        { orientation: 'landscape' }
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Pagination for Tab 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPetaniData.slice(start, start + itemsPerPage);
  }, [filteredPetaniData, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* 1. Header Navigation Bar */}
      <div className="bg-white border border-gray-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#b81d24]" />
            <h1 className="text-base font-bold text-gray-900 tracking-tight">
              Laporan Petani & Rekapitulasi Setoran Tembakau
            </h1>
          </div>
        </div>

        {/* Action Controls: Unduh CSV, Unduh PDF, & Toggle Ringkasan */}
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

          {onNavigateToPetani && (
            <button
              onClick={onNavigateToPetani}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Master Petani</span>
            </button>
          )}

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
              Total Petani
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-gray-900">
                {overallKPIs.totalPetani.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                {overallKPIs.totalPetaniAktif} Petani Aktif
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Petani Menyetor
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-gray-900">
                {overallKPIs.petaniPenyetorAktif.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                Tercatat Transaksi
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Setoran Bal
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-gray-900">
                {overallKPIs.totalBalSetor.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                Bal Tembakau Masuk
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Tonase (Kg)
            </div>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-blue-900">
                {overallKPIs.totalKgSetor.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                {(overallKPIs.totalKgSetor / 1000).toFixed(2)} Ton Netto
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-1">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Nilai Beli
            </div>
            <div className="mt-1">
              <div className="text-sm sm:text-base font-bold font-mono text-[#b81d24] truncate">
                Rp {overallKPIs.totalNilaiRp.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                Dana Dicairkan
              </div>
            </div>
          </div>

          <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-1">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Rata-rata Penyetoran
            </div>
            <div className="mt-1">
              <div className="text-base font-bold font-mono text-gray-900">
                {overallKPIs.rataRataKgPerPetani.toLocaleString('id-ID')} kg
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                ~ {overallKPIs.rataRataBalPerPetani} Bal / Petani
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Comprehensive Filter Panel */}
      <form onSubmit={handleApplyFilter} className="bg-white p-3.5 border border-gray-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filter Data & Parameter Analisis Petani</span>
          </div>
          <span className="text-[11px] text-gray-500">
            Ditemukan <strong>{filteredPetaniData.length}</strong> petani sesuai filter
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          {/* 1. Search Query */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Pencarian Petani</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nama / ID / No HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
            </div>
          </div>

          {/* 2. Status Petani */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Status Keanggotaan</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            >
              <option value="ALL">Semua Status (Aktif & Nonaktif)</option>
              <option value="aktif">Hanya Petani Aktif</option>
              <option value="nonaktif">Hanya Petani Nonaktif</option>
            </select>
          </div>

          {/* 3. Wilayah / Desa */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Wilayah / Desa</label>
            <input
              type="text"
              list="wilayah-desa-list"
              value={filterWilayah}
              onChange={(e) => setFilterWilayah(e.target.value)}
              placeholder="Ketik/Pilih Wilayah..."
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            />
            <datalist id="wilayah-desa-list">
              <option value="ALL">Semua Wilayah</option>
              {uniqueWilayahList.map((desa) => (
                <option key={desa} value={desa}>
                  {desa}
                </option>
              ))}
            </datalist>
          </div>

          {/* 4. Tanggal Dari */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Setoran Dari</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            />
          </div>

          {/* 5. Tanggal Sampai */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Setoran Sampai</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            />
          </div>

          {/* 6. Urutkan Berdasarkan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600">Urutkan Berdasarkan</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:bg-white focus:outline-none focus:border-[#b81d24]"
            >
              <option value="bal_desc">Jumlah Bal Terbanyak</option>
              <option value="kg_desc">Tonase Kg Terbesar</option>
              <option value="nilai_desc">Nilai Rupiah Terbesar</option>
              <option value="transaksi_desc">Frekuensi Transaksi</option>
              <option value="nama_asc">Nama Petani (A - Z)</option>
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
          onClick={() => setActiveTab('rekap')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer transition border-b-2 ${
            activeTab === 'rekap'
              ? 'border-[#b81d24] text-[#b81d24] bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Rekapitulasi Kinerja Petani ({filteredPetaniData.length})
        </button>

        <button
          onClick={() => setActiveTab('top-ranking')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer transition border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'top-ranking'
              ? 'border-[#b81d24] text-[#b81d24] bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>Top 10 Petani Penyetor Terbesar</span>
        </button>

        <button
          onClick={() => setActiveTab('wilayah')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer transition border-b-2 ${
            activeTab === 'wilayah'
              ? 'border-[#b81d24] text-[#b81d24] bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Sebaran Wilayah / Desa ({wilayahAggregates.length})
        </button>
      </div>

      {/* 5. Tab Content 1: Rekapitulasi Data Petani Table */}
      {activeTab === 'rekap' && (
        <div className="bg-white border border-gray-200 shadow-2xs overflow-hidden">
          {/* Table Header Bar with Tampil Dropdown */}
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs text-gray-700 font-semibold">
              Daftar Petani ({filteredPetaniData.length} Data)
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-600">
              <span>Tampil</span>
              <select
                value={itemsPerPage === filteredPetaniData.length ? 'all' : itemsPerPage}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setItemsPerPage(filteredPetaniData.length || 10000);
                  } else {
                    setItemsPerPage(Number(e.target.value));
                  }
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-xs px-2 py-1 bg-white text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#b81d24]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 border-r border-gray-200 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">ID & Nama Petani</th>
                  <th className="py-2.5 px-3 border-r border-gray-200">Kontak & Wilayah</th>
                  <th className="py-2.5 px-2 border-r border-gray-200 text-center w-20">Status</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">Total Transaksi</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">Total Bal</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right">Total Netto (Kg)</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right">Total Nilai Beli (Rp)</th>
                  <th className="py-2.5 px-2 border-r border-gray-200 text-center w-24">Grade Dominan</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">Setoran Terakhir</th>
                  <th className="py-2.5 px-2 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-500 italic">
                      Tidak ada data petani yang sesuai dengan parameter filter pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((p, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr 
                        key={p.petani_id}
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-gray-100/80 transition-colors cursor-pointer`}
                        onClick={() => setSelectedPetaniForDetail(p)}
                      >
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-500">
                          {rowNumber}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200">
                          <div className="font-bold text-gray-900">{p.nama_petani}</div>
                          <div className="text-[10px] font-mono text-gray-500 flex items-center space-x-1 mt-0.5">
                            <span>ID: {p.petani_id}</span>
                            
                          </div>
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200">
                          <div className="text-gray-800 font-medium">{p.desa_kecamatan || p.alamat || '-'}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{p.no_hp || '-'}</div>
                        </td>
                        <td className="py-2.5 px-2 border-r border-gray-200 text-center">
                          {p.status_aktif ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xs text-[10px] font-semibold">
                              Aktif
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 border border-gray-300 rounded-xs text-[10px] font-semibold">
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-medium text-gray-800">
                          {p.totalTransaksi > 0 ? `${p.totalTransaksi}x` : '-'}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-900">
                          {p.totalBal > 0 ? `${p.totalBal} Bal` : '-'}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-blue-900">
                          {p.totalKg > 0 ? `${p.totalKg.toLocaleString('id-ID')} kg` : '0 kg'}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-bold text-[#b81d24]">
                          {p.totalNilaiRp > 0 ? `Rp ${p.totalNilaiRp.toLocaleString('id-ID')}` : 'Rp 0'}
                        </td>
                        <td className="py-2.5 px-2 border-r border-gray-200 text-center">
                          {p.gradeDominan !== '-' ? (
                            <span className="px-2 py-0.5 bg-zinc-900 text-white rounded-xs text-[10px] font-bold">
                              Grade {p.gradeDominan}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-[11px] text-gray-600">
                          {p.lastTxDate}
                        </td>
                        <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedPetaniForDetail(p)}
                            className="px-2 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xs transition cursor-pointer"
                          >
                            Rincian
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
          {filteredPetaniData.length > 0 && (
            <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="text-xs text-gray-600">
                  Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredPetaniData.length)}</strong> dari <strong>{filteredPetaniData.length}</strong> petani
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <span>Tampil</span>
                  <select
                    value={itemsPerPage === filteredPetaniData.length ? 'all' : itemsPerPage}
                    onChange={(e) => {
                      if (e.target.value === 'all') {
                        setItemsPerPage(filteredPetaniData.length || 10000);
                      } else {
                        setItemsPerPage(Number(e.target.value));
                      }
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-xs px-2 py-1 bg-white text-xs text-gray-800 font-semibold focus:outline-none focus:border-[#b81d24]"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={filteredPetaniData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* 6. Tab Content 2: Top 10 Petani Penyetor Leaderboard */}
      {activeTab === 'top-ranking' && (
        <div className="space-y-3">
          <div className="bg-white p-4 border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Peringkat 10 Petani Penyetor Terbesar (Volume Tonase)</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Petani mitra dengan kontribusi volume pasokan tembakau dan nilai transaksi tertinggi
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 text-[10px] uppercase">
                    <th className="py-2.5 px-3 text-center w-12">Peringkat</th>
                    <th className="py-2.5 px-3">Nama Petani</th>
                    <th className="py-2.5 px-3">Desa / Wilayah</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Bal</th>
                    <th className="py-2.5 px-3 text-right">Total Netto</th>
                    <th className="py-2.5 px-3 text-right">Total Nilai Beli</th>
                    <th className="py-2.5 px-3 text-center">Grade Dominan</th>
                    <th className="py-2.5 px-3 text-center">Proporsi Pasokan</th>
                    <th className="py-2.5 px-2 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPetaniData
                    .filter((p) => p.totalKg > 0)
                    .slice(0, 10)
                    .map((p, idx) => {
                      const totalAllKg = overallKPIs.totalKgSetor || 1;
                      const persen = ((p.totalKg / totalAllKg) * 100).toFixed(1);
                      return (
                        <tr key={p.petani_id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-gray-100/80 transition-colors`}>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold ${
                                idx === 0
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : idx === 1
                                  ? 'bg-gray-400 text-white'
                                  : idx === 2
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-gray-900">{p.nama_petani}</div>
                            <div className="text-[10px] text-gray-500 font-mono">ID: {p.petani_id}</div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {p.desa_kecamatan || p.alamat || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-900">
                            {p.totalBal} Bal
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                            {p.totalKg.toLocaleString('id-ID')} kg
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#b81d24]">
                            Rp {p.totalNilaiRp.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-bold">
                              Grade {p.gradeDominan}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center space-x-2 justify-center">
                              <div className="w-16 bg-gray-200 h-2 rounded-xs overflow-hidden">
                                <div className="bg-[#b81d24] h-full" style={{ width: `${persen}%` }}></div>
                              </div>
                              <span className="text-[10px] font-mono text-gray-600">{persen}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => setSelectedPetaniForDetail(p)}
                              className="px-2 py-1 text-[11px] font-semibold text-[#b81d24] hover:bg-red-50 rounded-xs transition cursor-pointer"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab Content 3: Sebaran Wilayah / Desa Aggregates */}
      {activeTab === 'wilayah' && (
        <div className="bg-white border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Rekapitulasi Sebaran Pasokan per Desa & Wilayah
            </h3>
            <span className="text-xs text-gray-500">
              Total {wilayahAggregates.length} Wilayah
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center w-12">No</th>
                  <th className="py-2.5 px-4 border-r border-gray-200">Nama Desa / Wilayah</th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-center">Jumlah Petani</th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-center">Total Setoran Bal</th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right">Total Netto (Kg)</th>
                  <th className="py-2.5 px-4 border-r border-gray-200 text-right">Total Nilai Pembelian (Rp)</th>
                  <th className="py-2.5 px-4 text-center">Kontribusi Pasokan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wilayahAggregates.map((w, idx) => {
                  const totalKg = overallKPIs.totalKgSetor || 1;
                  const persen = ((w.totalKg / totalKg) * 100).toFixed(1);
                  return (
                    <tr key={w.desa} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-gray-100/80 transition-colors`}>
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 font-bold text-gray-900">
                        {w.desa}
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-center font-mono font-medium text-gray-700">
                        {w.countPetani} Petani
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-center font-mono font-bold text-gray-900">
                        {w.totalBal} Bal
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-mono font-bold text-blue-900">
                        {w.totalKg.toLocaleString('id-ID')} kg
                      </td>
                      <td className="py-2.5 px-4 border-r border-gray-200 text-right font-mono font-bold text-[#b81d24]">
                        Rp {w.totalNilai.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-20 bg-gray-200 h-2 rounded-xs overflow-hidden">
                            <div className="bg-[#b81d24] h-full" style={{ width: `${persen}%` }}></div>
                          </div>
                          <span className="text-[10px] font-mono text-gray-600">{persen}%</span>
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

      {/* 8. Drawer / Modal: Detail Riwayat Setoran Petani */}
      {selectedPetaniForDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-300 shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    Riwayat Lengkap Setoran: {selectedPetaniForDetail.nama_petani}
                  </h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-xs ${
                    selectedPetaniForDetail.status_aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {selectedPetaniForDetail.status_aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  ID: <span className="font-mono font-semibold text-gray-700">{selectedPetaniForDetail.petani_id}</span> • 
                  Desa: <span className="text-gray-700">{selectedPetaniForDetail.desa_kecamatan || selectedPetaniForDetail.alamat}</span> • 
                  No HP: <span className="text-gray-700">{selectedPetaniForDetail.no_hp || '-'}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedPetaniForDetail(null)}
                className="p-1 hover:bg-gray-200 rounded-xs text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary Stats */}
            <div className="p-4 bg-white grid grid-cols-4 gap-3 border-b border-gray-200">
              <div className="p-2.5 bg-gray-50 border border-gray-200 text-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Total Transaksi</div>
                <div className="text-base font-bold font-mono text-gray-900 mt-0.5">
                  {selectedPetaniForDetail.totalTransaksi} Kali
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 text-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Total Bal Disetor</div>
                <div className="text-base font-bold font-mono text-gray-900 mt-0.5">
                  {selectedPetaniForDetail.totalBal} Bal
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 text-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Total Netto (Kg)</div>
                <div className="text-base font-bold font-mono text-blue-900 mt-0.5">
                  {selectedPetaniForDetail.totalKg.toLocaleString('id-ID')} kg
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 text-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Total Nilai Beli</div>
                <div className="text-sm font-bold font-mono text-[#b81d24] mt-0.5 truncate">
                  Rp {selectedPetaniForDetail.totalNilaiRp.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Modal Transaction Table */}
            <div className="p-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Daftar Nota Timbang & Transaksi Pembelian
              </h4>

              {selectedPetaniForDetail.txList && selectedPetaniForDetail.txList.length > 0 ? (
                <div className="border border-gray-200 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-[10px] uppercase">
                        <th className="py-2 px-2.5 text-center">No</th>
                        <th className="py-2 px-2.5">ID Transaksi</th>
                        <th className="py-2 px-2.5">Tanggal</th>
                        <th className="py-2 px-2.5 text-center">Kupon</th>
                        <th className="py-2 px-2.5">No Bal</th>
                        <th className="py-2 px-2.5">Grade</th>
                        <th className="py-2 px-2.5 text-right">Netto (Kg)</th>
                        <th className="py-2 px-2.5 text-right">Harga/kg</th>
                        <th className="py-2 px-2.5 text-right">Potongan</th>
                        <th className="py-2 px-2.5 text-right">Jumlah Bayar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedPetaniForDetail.txList.map((t, idx) => {
                        const subtotal = t.total_harga_beli || (t.berat_kg * t.harga_per_kg);
                        const jmlBayar = t.harga_final || (subtotal - (t.total_potongan || 7000));
                        return (
                          <tr key={t.transaksi_id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-gray-100/80 transition-colors`}>
                            <td className="py-2 px-2.5 text-center font-mono text-gray-500">{idx + 1}</td>
                            <td className="py-2 px-2.5 font-mono font-semibold text-gray-800">{t.transaksi_id}</td>
                            <td className="py-2 px-2.5 text-gray-600 font-mono text-xs">{formatDateHariBulanTahun(t.tanggal_transaksi)}</td>
                            <td className="py-2 px-2.5 text-center font-mono font-bold text-gray-700">{t.no_kupon || '-'}</td>
                            <td className="py-2 px-2.5">
                              <span className="font-semibold text-gray-900">{t.no_bal}</span>
                            </td>
                            <td className="py-2 px-2.5 max-w-[150px]">
                              <div className="flex flex-wrap gap-1">
                                {String(t.kode_grade).split(',').map((g, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-zinc-900 text-white text-[10px] font-bold rounded-xs whitespace-nowrap">
                                    {g.trim()}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-blue-900">
                              {t.berat_kg} kg
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-gray-700">
                              Rp {t.harga_per_kg.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-gray-500">
                              Rp {(t.total_potongan || 7000).toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-[#b81d24]">
                              Rp {jmlBayar.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 italic bg-gray-50 border border-gray-200">
                  Belum ada catatan transaksi timbang untuk petani ini.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedPetaniForDetail(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 9. Offscreen Printable Document for High-Fidelity PDF Generation */}
      <div className="hidden">
        <div ref={printDocumentRef} className="p-8 bg-white text-gray-900 font-sans" style={{ width: '1080px' }}>
          
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-gray-800 pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#b81d24] text-white font-bold flex items-center justify-center text-sm">
                SMS
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-gray-900">PR. SEKAR MAJU SEJAHTERA</h1>
                <p className="text-[11px] text-gray-600 font-medium">
                  Sistem Data Gudang Tembakau & Rekapitulasi Kinerja Petani
                </p>
                <p className="text-[10px] text-gray-500">
                  Pamekasan, Madura, Jawa Timur • Dokumen Resmi Audit
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[#b81d24] uppercase">LAPORAN REKAPITULASI PETANI</div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Tanggal Ekspor: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <div className="text-[10px] text-gray-500">
                Filter: {appliedFilters.wilayah !== 'ALL' ? `Desa ${appliedFilters.wilayah}` : 'Semua Wilayah'} • {appliedFilters.status !== 'ALL' ? `Status ${appliedFilters.status}` : 'Semua Status'}
              </div>
            </div>
          </div>

          {/* KPI Summary Block */}
          <div className="grid grid-cols-5 gap-2 mb-4 p-3 bg-gray-50 border border-gray-300">
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total Petani</div>
              <div className="text-sm font-bold font-mono text-gray-900">{overallKPIs.totalPetani} Petani</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Petani Aktif</div>
              <div className="text-sm font-bold font-mono text-gray-900">{overallKPIs.totalPetaniAktif} Petani</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total Bal Masuk</div>
              <div className="text-sm font-bold font-mono text-gray-900">{overallKPIs.totalBalSetor} Bal</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total Tonase Netto</div>
              <div className="text-sm font-bold font-mono text-gray-900">{overallKPIs.totalKgSetor.toLocaleString('id-ID')} kg</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total Nilai Pembelian</div>
              <div className="text-sm font-bold font-mono text-[#b81d24]">Rp {overallKPIs.totalNilaiRp.toLocaleString('id-ID')}</div>
            </div>
          </div>

          {/* Main Data Table */}
          <table className="w-full text-left text-[11px] border-collapse border border-gray-400 mb-6">
            <thead>
              <tr className="bg-gray-100 font-bold text-gray-900 border-b border-gray-400">
                <th className="p-2 border border-gray-300 text-center w-8">No</th>
                <th className="p-2 border border-gray-300">ID & Nama Petani</th>
                <th className="p-2 border border-gray-300">Desa / Wilayah</th>
                <th className="p-2 border border-gray-300 text-center">Status</th>
                <th className="p-2 border border-gray-300 text-center">Frekuensi</th>
                <th className="p-2 border border-gray-300 text-center">Setoran (Bal)</th>
                <th className="p-2 border border-gray-300 text-right">Netto (Kg)</th>
                <th className="p-2 border border-gray-300 text-right">Total Bayar (Rp)</th>
                <th className="p-2 border border-gray-300 text-center">Grade Utama</th>
                <th className="p-2 border border-gray-300 text-center">Setoran Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {filteredPetaniData.map((p, idx) => (
                <tr key={p.petani_id} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-1.5 border border-gray-300 text-center font-mono">{idx + 1}</td>
                  <td className="p-1.5 border border-gray-300 font-bold">{p.nama_petani} ({p.petani_id})</td>
                  <td className="p-1.5 border border-gray-300">{p.desa_kecamatan || p.alamat || '-'}</td>
                  <td className="p-1.5 border border-gray-300 text-center">{p.status_aktif ? 'Aktif' : 'Nonaktif'}</td>
                  <td className="p-1.5 border border-gray-300 text-center font-mono">{p.totalTransaksi}x</td>
                  <td className="p-1.5 border border-gray-300 text-center font-mono font-bold">{p.totalBal}</td>
                  <td className="p-1.5 border border-gray-300 text-right font-mono font-bold">{p.totalKg.toLocaleString('id-ID')}</td>
                  <td className="p-1.5 border border-gray-300 text-right font-mono font-bold">Rp {p.totalNilaiRp.toLocaleString('id-ID')}</td>
                  <td className="p-1.5 border border-gray-300 text-center font-bold">Grade {p.gradeDominan}</td>
                  <td className="p-1.5 border border-gray-300 text-center font-mono">{p.lastTxDate}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Formal Signatures */}
          <div className="grid grid-cols-3 gap-8 pt-6 text-center text-xs">
            <div>
              <div className="text-gray-500">Dibuat Oleh,</div>
              <div className="font-bold text-gray-900 mt-0.5">Operator Loket / Kasir</div>
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
              <div className="text-gray-500">Mengetahui & Menyetujui,</div>
              <div className="font-bold text-gray-900 mt-0.5">Direksi PR. Sekar Anom</div>
              <div className="h-16"></div>
              <div className="font-semibold text-gray-800 border-t border-gray-400 pt-1 min-h-[22px]">&nbsp;</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

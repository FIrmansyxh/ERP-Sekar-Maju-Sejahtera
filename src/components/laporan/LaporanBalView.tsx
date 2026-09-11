import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Package, 
  Search, 
  RotateCcw, 
  Download, 
  Calendar, 
  Tag, 
  Building2, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  Scale, 
  DollarSign, 
  Layers, 
  FileSpreadsheet, 
  Printer, 
  Warehouse, 
  Info,
  TrendingUp,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Barang, Gudang, Petani, TransaksiPembelian, TabelHarga, UserRole } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatRupiah, formatNumber, formatDateHariBulanTahun } from '../../utils/formatters';
import { downloadCsvFile, downloadElementAsPdf } from '../../utils/printDownload';
import { Pagination } from '../common/Pagination';

interface LaporanBalViewProps {
  barangList: Barang[];
  gudangList?: Gudang[];
  petaniList?: Petani[];
  transaksiList?: TransaksiPembelian[];
  hargaList?: TabelHarga[];
  userRole?: UserRole;
  onNavigateToBarang?: () => void;
  onNavigateToTransaksi?: () => void;
  onNavigateToGudang?: () => void;
}

type SortField = 
  | 'default'
  | 'no_bal'
  | 'tanggal_masuk'
  | 'kode_grade'
  | 'berat_kg'
  | 'berat_bruto_kg'
  | 'harga_per_kg'
  | 'total_harga'
  | 'nama_petani'
  | 'lokasi_gudang'
  | 'status_stok';

type SortDirection = 'asc' | 'desc' | 'none';

export const LaporanBalView: React.FC<LaporanBalViewProps> = ({
  barangList = [],
  gudangList = [],
  petaniList = [],
  transaksiList = [],
  hargaList = [],
  userRole = 'superadmin',
  onNavigateToBarang,
  onNavigateToTransaksi,
  onNavigateToGudang,
}) => {
  // Filter States
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterGudang, setFilterGudang] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterStatusStok, setFilterStatusStok] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMinBerat, setFilterMinBerat] = useState<string>('');
  const [filterMaxBerat, setFilterMaxBerat] = useState<string>('');
  const [filterMinHarga, setFilterMinHarga] = useState<string>('');
  const [filterMaxHarga, setFilterMaxHarga] = useState<string>('');

  // Applied Filter State
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: '',
    gudang: 'ALL',
    grade: 'ALL',
    statusStok: 'ALL',
    search: '',
    minBerat: '',
    maxBerat: '',
    minHarga: '',
    maxHarga: '',
  });

  // Multi-column Sorting State
  type SortConfig = { field: SortField; direction: 'asc' | 'desc' };
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);

  // UI States
  const [showSummaryCards, setShowSummaryCards] = useState(true);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Scroll Position State for Scroll-To-Top and Scroll-To-Bottom buttons
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const docHeight = document.documentElement.scrollHeight;

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
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  const printDocumentRef = useRef<HTMLDivElement>(null);

  // Unique Lists for Dropdown Filter Options
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    barangList.forEach((b) => {
      if (b.kode_grade) grades.add(b.kode_grade.trim().toUpperCase());
    });
    return Array.from(grades).sort();
  }, [barangList]);

  const uniqueWarehouses = useMemo(() => {
    const warehouses = new Set<string>();
    barangList.forEach((b) => {
      if (b.lokasi_gudang) warehouses.add(b.lokasi_gudang.trim());
    });
    return Array.from(warehouses).sort();
  }, [barangList]);

  // Handle Search / Apply Filters
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      startDate: filterStartDate,
      endDate: filterEndDate,
      gudang: filterGudang,
      grade: filterGrade,
      statusStok: filterStatusStok,
      search: searchQuery.trim(),
      minBerat: filterMinBerat,
      maxBerat: filterMaxBerat,
      minHarga: filterMinHarga,
      maxHarga: filterMaxHarga,
    });
    setCurrentPage(1);
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterGudang('ALL');
    setFilterGrade('ALL');
    setFilterStatusStok('ALL');
    setSearchQuery('');
    setFilterMinBerat('');
    setFilterMaxBerat('');
    setFilterMinHarga('');
    setFilterMaxHarga('');
    setAppliedFilters({
      startDate: '',
      endDate: '',
      gudang: 'ALL',
      grade: 'ALL',
      statusStok: 'ALL',
      search: '',
      minBerat: '',
      maxBerat: '',
      minHarga: '',
      maxHarga: '',
    });
    setSortConfigs([]);
    setCurrentPage(1);
  };

  // Natural alphanumeric sorting comparator for No Bal (e.g. A-01, A-02, A-10, B-01)
  const compareAlphanumeric = (a: string, b: string): number => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Toggle Header Sort with cycle: desc -> asc -> none
  const handleHeaderSort = (field: SortField) => {
    if (field === 'default') {
      setSortConfigs([]);
      return;
    }

    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(c => c.field === field);
      
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.direction === 'desc') {
          const newConfigs = [...prev];
          newConfigs[existingIndex] = { ...existing, direction: 'asc' };
          return newConfigs;
        } else {
          return prev.filter((_, idx) => idx !== existingIndex);
        }
      } else {
        const newConfigs = [...prev, { field, direction: 'desc' as const }];
        if (newConfigs.length > 3) {
          newConfigs.shift();
        }
        return newConfigs;
      }
    });
  };

  // Filtered & Enriched Bal Data
  const enrichedBalList = useMemo(() => {
    // Map transaksi items to ensure accurate harga_per_kg and total_harga if missing
    const txItemMap = new Map<string, { harga_per_kg: number; total_kotor: number; nama_petani: string; no_kupon: string; potongan: number; status_pembayaran: string; metode_pembayaran: string }>();
    transaksiList.forEach((tx) => {
      if (tx.items) {
        tx.items.forEach((it) => {
          if (it.barang_id || it.no_bal) {
            const key = it.barang_id || it.no_bal;
            txItemMap.set(key, {
              harga_per_kg: it.harga_per_kg || 0,
              total_kotor: it.total_kotor || ((it.berat_kg || 0) * (it.harga_per_kg || 0)),
              nama_petani: tx.nama_petani || '',
              no_kupon: tx.no_kupon || '',
              potongan: it.potongan || 0,
              status_pembayaran: tx.status_pembayaran || 'belum_lunas',
              metode_pembayaran: tx.metode_pembayaran || '',
            });
          }
        });
      }
    });

    return barangList
      .map((bal, originalIndex) => {
        const txInfo = txItemMap.get(bal.barang_id) || txItemMap.get(bal.no_bal);
        const hrgBeli = bal.harga_per_kg || txInfo?.harga_per_kg || 0;
        const netto = bal.berat_kg || 0;
        const subtotal = bal.total_harga || txInfo?.total_kotor || (netto * hrgBeli);
        const bruto = bal.berat_bruto_kg && bal.berat_bruto_kg > 0 ? bal.berat_bruto_kg : (netto > 0 ? netto + (bal.potongan_tara_kg || 0) : 0);
        const tara = bal.potongan_tara_kg !== undefined ? bal.potongan_tara_kg : Math.max(0, bruto - netto);

        return {
          ...bal,
          originalIndex,
          berat_bruto_kg: bruto,
          potongan_tara_kg: tara,
          harga_per_kg: hrgBeli,
          total_harga: subtotal,
          nama_petani: bal.nama_petani || txInfo?.nama_petani || 'Petani Kemitraan',
          no_kupon: txInfo?.no_kupon || '-',
          potongan: txInfo?.potongan || 0,
          status_pembayaran: txInfo?.status_pembayaran || 'belum_lunas',
          metode_pembayaran: txInfo?.metode_pembayaran || '',
          has_tx: !!txInfo,
        };
      })
      .filter((bal) => {
        // Hapus aset dari laporan jika dari transaksi pembelian tapi belum dibayar (LUNAS/CASH)
        if (bal.has_tx) {
          const isLunas = bal.status_pembayaran === 'lunas' || bal.metode_pembayaran === 'cash';
          return isLunas;
        }
        return true; // Jika tidak terkait transaksi, tetap tampilkan
      });
  }, [barangList, transaksiList]);

  // Filter Data
  const filteredData = useMemo(() => {
    return enrichedBalList.filter((item) => {
      // Tanggal Dari
      if (appliedFilters.startDate && item.tanggal_masuk) {
        const itemDate = item.tanggal_masuk.split('T')[0];
        if (itemDate < appliedFilters.startDate) return false;
      }
      // Tanggal Sampai
      if (appliedFilters.endDate && item.tanggal_masuk) {
        const itemDate = item.tanggal_masuk.split('T')[0];
        if (itemDate > appliedFilters.endDate) return false;
      }
      // Lokasi Gudang
      if (appliedFilters.gudang !== 'ALL') {
        if (!item.lokasi_gudang || !item.lokasi_gudang.toLowerCase().includes(appliedFilters.gudang.toLowerCase())) {
          return false;
        }
      }
      // Kode Grade
      if (appliedFilters.grade !== 'ALL') {
        if (item.kode_grade?.toUpperCase() !== appliedFilters.grade.toUpperCase()) {
          return false;
        }
      }
      // Status Stok
      if (appliedFilters.statusStok !== 'ALL') {
        if (item.status_stok !== appliedFilters.statusStok) {
          return false;
        }
      }
      // Min & Max Berat
      if (appliedFilters.minBerat) {
        const min = parseFloat(appliedFilters.minBerat);
        if (!isNaN(min) && (item.berat_kg || 0) < min) return false;
      }
      if (appliedFilters.maxBerat) {
        const max = parseFloat(appliedFilters.maxBerat);
        if (!isNaN(max) && (item.berat_kg || 0) > max) return false;
      }
      // Min & Max Harga Beli
      if (appliedFilters.minHarga) {
        const min = parseFloat(appliedFilters.minHarga);
        if (!isNaN(min) && (item.harga_per_kg || 0) < min) return false;
      }
      if (appliedFilters.maxHarga) {
        const max = parseFloat(appliedFilters.maxHarga);
        if (!isNaN(max) && (item.harga_per_kg || 0) > max) return false;
      }
      // Free text search
      if (appliedFilters.search) {
        const q = appliedFilters.search.toLowerCase();
        const matchNoBal = item.no_bal?.toLowerCase().includes(q);
        const matchKode = item.kode_bal_pembeli?.toLowerCase().includes(q);
        const matchId = item.barang_id?.toLowerCase().includes(q);
        const matchPetani = item.nama_petani?.toLowerCase().includes(q);
        const matchKupon = item.no_kupon?.toLowerCase().includes(q);
        const matchGudang = item.lokasi_gudang?.toLowerCase().includes(q);
        const matchGrade = item.kode_grade?.toLowerCase().includes(q);

        if (!matchNoBal && !matchKode && !matchId && !matchPetani && !matchKupon && !matchGudang && !matchGrade) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedBalList, appliedFilters]);

  // Sorted Data based on sortConfigs
  const sortedData = useMemo(() => {
    if (sortConfigs.length === 0) {
      return [...filteredData].sort((a, b) => a.originalIndex - b.originalIndex);
    }

    return [...filteredData].sort((a, b) => {
      for (const config of sortConfigs) {
        let comparison = 0;
        switch (config.field) {
          case 'no_bal': {
            const balA = a.no_bal || a.barang_id || '';
            const balB = b.no_bal || b.barang_id || '';
            comparison = compareAlphanumeric(balA, balB);
            break;
          }
          case 'tanggal_masuk': {
            const dateA = a.tanggal_masuk || '';
            const dateB = b.tanggal_masuk || '';
            comparison = dateA.localeCompare(dateB);
            break;
          }
          case 'kode_grade': {
            const gradeA = a.kode_grade || '';
            const gradeB = b.kode_grade || '';
            comparison = gradeA.localeCompare(gradeB);
            break;
          }
          case 'berat_kg': {
            comparison = (a.berat_kg || 0) - (b.berat_kg || 0);
            break;
          }
          case 'berat_bruto_kg': {
            comparison = (a.berat_bruto_kg || 0) - (b.berat_bruto_kg || 0);
            break;
          }
          case 'harga_per_kg': {
            comparison = (a.harga_per_kg || 0) - (b.harga_per_kg || 0);
            break;
          }
          case 'total_harga': {
            comparison = (a.total_harga || 0) - (b.total_harga || 0);
            break;
          }
          case 'nama_petani': {
            const pA = a.nama_petani || '';
            const pB = b.nama_petani || '';
            comparison = pA.localeCompare(pB);
            break;
          }
          case 'lokasi_gudang': {
            const locA = a.lokasi_gudang || '';
            const locB = b.lokasi_gudang || '';
            comparison = locA.localeCompare(locB);
            break;
          }
          case 'status_stok': {
            const stA = a.status_stok || '';
            const stB = b.status_stok || '';
            comparison = stA.localeCompare(stB);
            break;
          }
        }
        
        if (comparison !== 0) {
          return config.direction === 'asc' ? comparison : -comparison;
        }
      }
      return a.originalIndex - b.originalIndex;
    });
  }, [filteredData, sortConfigs]);

  // Aggregation & KPI Totals
  const totals = useMemo(() => {
    let totalBal = sortedData.length;
    let totalNetto = 0;
    let totalBruto = 0;
    let totalTara = 0;
    let totalNilai = 0;
    let minBerat = sortedData.length > 0 ? Number.MAX_VALUE : 0;
    let maxBerat = 0;
    let minHarga = sortedData.length > 0 ? Number.MAX_VALUE : 0;
    let maxHarga = 0;

    sortedData.forEach((b) => {
      const netto = b.berat_kg || 0;
      const bruto = b.berat_bruto_kg || 0;
      const tara = b.potongan_tara_kg || 0;
      const subtotal = b.total_harga || 0;
      const hrg = b.harga_per_kg || 0;

      totalNetto += netto;
      totalBruto += bruto;
      totalTara += tara;
      totalNilai += subtotal;

      if (netto < minBerat) minBerat = netto;
      if (netto > maxBerat) maxBerat = netto;
      if (hrg > 0 && hrg < minHarga) minHarga = hrg;
      if (hrg > maxHarga) maxHarga = hrg;
    });

    if (minBerat === Number.MAX_VALUE) minBerat = 0;
    if (minHarga === Number.MAX_VALUE) minHarga = 0;

    const avgNetto = totalBal > 0 ? totalNetto / totalBal : 0;
    const avgHargaKg = totalNetto > 0 ? totalNilai / totalNetto : 0;

    return {
      totalBal,
      totalNetto,
      totalBruto,
      totalTara,
      totalNilai,
      avgNetto,
      avgHargaKg,
      minBerat,
      maxBerat,
      minHarga,
      maxHarga,
    };
  }, [sortedData]);

  // Sub-Ringkasan per Grade
  const gradeBreakdown = useMemo(() => {
    const map: Record<string, { grade: string; balCount: number; totalNetto: number; totalNilai: number }> = {};
    sortedData.forEach((b) => {
      const g = (b.kode_grade || 'LAINNYA').trim().toUpperCase();
      if (!map[g]) {
        map[g] = { grade: g, balCount: 0, totalNetto: 0, totalNilai: 0 };
      }
      map[g].balCount += 1;
      map[g].totalNetto += b.berat_kg || 0;
      map[g].totalNilai += b.total_harga || 0;
    });
    return Object.values(map).sort((a, b) => a.grade.localeCompare(b.grade));
  }, [sortedData]);

  // Pagination Slice
  const isShowAll = itemsPerPage === -1;
  const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    if (itemsPerPage === -1) {
      return sortedData;
    }
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Helper Badge Color for Grade
  const getGradeBadgeClass = (grade: string) => {
    const g = grade.trim().toUpperCase();
    if (g === 'A') return 'bg-zinc-900 text-white';
    if (g === 'B') return 'bg-zinc-800 text-zinc-100';
    if (g === 'C') return 'bg-blue-100 text-blue-900 font-bold';
    if (g === 'D') return 'bg-purple-100 text-purple-900 font-bold';
    if (g === 'E') return 'bg-gray-200 text-gray-800 font-bold';
    return 'bg-red-100 text-red-900 font-bold';
  };

  // Helper Badge Color for Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'di_gudang':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Di Gudang (Tersedia)
          </span>
        );
      case 'siap_kirim':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Siap Kirim DO
          </span>
        );
      case 'keluar':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-300">
            Keluar (Terkirim Pabrik)
          </span>
        );
      case 'terkirim_sample':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            Terkirim Sample QC
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  // Render Sort Header Icon - Single clean arrow when active
  const renderSortIndicator = (field: SortField) => {
    if (field === 'default') {
      if (sortConfigs.length === 0) return null;
      return (
        <button type="button" onClick={(e) => { e.stopPropagation(); setSortConfigs([]); }} className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-0.5 rounded-sm transition ml-2 cursor-pointer font-semibold border border-red-200">
          Reset Urutan
        </button>
      );
    }

    const configIndex = sortConfigs.findIndex(c => c.field === field);
    if (configIndex === -1) {
      return null;
    }
    const config = sortConfigs[configIndex];
    
    if (config.direction === 'asc') {
      return (
        <span className="inline-flex items-center text-[#b81d24] bg-red-50 p-0.5 px-1 rounded-xs border border-red-200 ml-1" title="Urutan Terendah / Naik / A-Z">
          <ArrowUp className="w-3.5 h-3.5 text-[#b81d24]" />
          {sortConfigs.length > 1 && <span className="text-[10px] font-bold ml-0.5 leading-none">{configIndex + 1}</span>}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[#b81d24] bg-red-50 p-0.5 px-1 rounded-xs border border-red-200 ml-1" title="Urutan Tertinggi / Turun / Z-A">
        <ArrowDown className="w-3.5 h-3.5 text-[#b81d24]" />
        {sortConfigs.length > 1 && <span className="text-[10px] font-bold ml-0.5 leading-none">{configIndex + 1}</span>}
      </span>
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;

    const headers = [
      'NO',
      'TANGGAL',
      'NO BAL',
      'PETANI',
      'BERAT',
      'HARGA',
      'STATUS',
      'POTONGAN',
      'STATUS (DIGUDANG/TERKIRIM)'
    ];

    const rows = sortedData.map((b, idx) => [
      idx + 1,
      b.tanggal_masuk ? b.tanggal_masuk.split('T')[0] : '-',
      b.no_bal || '-',
      b.nama_petani || '-',
      (b.berat_kg || 0).toFixed(1),
      b.total_harga || 0,
      b.status_pembayaran === 'lunas' ? 'LUNAS' : 'KASBON / BELUM LUNAS',
      b.potongan || 0,
      b.status_stok === 'di_gudang' ? 'DIGUDANG' : b.status_stok === 'keluar' ? 'TERKIRIM' : (b.status_stok || '').toUpperCase()
    ]);

    // Sub-summary section in CSV
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['--- SUB-RINGKASAN PER GRADE ---', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Grade', 'Jumlah Bal', 'Total Berat Netto (kg)', 'Rata-rata (kg/bal)', 'Total Nilai Pembelian (Rp)', '', '', '', '', '', '', '', '', '', '']);
    gradeBreakdown.forEach((gb) => {
      const avg = gb.balCount > 0 ? (gb.totalNetto / gb.balCount).toFixed(2) : '0';
      rows.push([
        `Grade ${gb.grade}`,
        gb.balCount,
        gb.totalNetto.toFixed(1),
        avg,
        Math.round(gb.totalNilai),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
    });

    // Total section in CSV
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    rows.push([
      'TOTAL KESELURUHAN',
      `${totals.totalBal} BAL`,
      '',
      '',
      '',
      '',
      '',
      '',
      totals.totalBruto.toFixed(1),
      totals.totalTara.toFixed(1),
      totals.totalNetto.toFixed(1),
      Math.round(totals.avgHargaKg),
      Math.round(totals.totalNilai),
      '',
      '',
    ]);

    downloadCsvFile(
      `Laporan_Detail_Bal_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  // Export PDF / Print
  const handleExportPDF = async () => {
    if (!printDocumentRef.current) return;
    setIsExportingPdf(true);
    try {
      await downloadElementAsPdf(
        printDocumentRef.current,
        `Laporan_Detail_Bal_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-gray-800 animate-in fade-in duration-150">
      
      {/* 1. Header Banner */}
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-none flex items-center justify-center font-bold shadow-xs shrink-0">
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-bold text-[10px] rounded-none uppercase tracking-wider">
                LAPORAN INVENTARIS FISIK
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                PR. Sekar Maju Sejahtera
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              Laporan Detail Bal Tembakau
            </h1>
          </div>
        </div>

        {/* Action Buttons: Filter Toggle, CSV, Print */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-3 py-1.5 rounded-none font-bold text-xs flex items-center space-x-1.5 border transition cursor-pointer ${
              isFilterPanelOpen
                ? 'bg-slate-100 text-slate-900 border-slate-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-gray-600" />
            <span>Filter Panel</span>
            {isFilterPanelOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={sortedData.length === 0}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-none font-bold text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
            title="Download Spreadsheet Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={sortedData.length === 0 || isExportingPdf}
            className="px-3 py-1.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-none font-bold text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
            title="Cetak Laporan / Simpan PDF"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>{isExportingPdf ? 'Memproses...' : 'Cetak / PDF'}</span>
          </button>
        </div>
      </div>

      {/* 2. Ringkasan & Sub-Ringkasan Grade (Di atas Filter Data) */}
      <div className="bg-white border border-gray-200 shadow-xs">
        <div className="px-4 py-3 bg-[#f8f9fa] border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#b81d24]" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Ringkasan & Metrik Analisis Bal Tembakau
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-gray-700 border border-gray-300 rounded-xs">
              {totals.totalBal} Bal Terdata
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <p className="text-[11px] text-gray-500 font-medium">
              Total Tonase: <strong className="text-gray-900 font-mono">{totals.totalNetto.toFixed(1)} kg</strong> ({(totals.totalNetto / 1000).toFixed(2)} Ton)
            </p>
            <button
              type="button"
              onClick={() => setShowSummaryCards(!showSummaryCards)}
              className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xs transition flex items-center space-x-1 cursor-pointer shadow-2xs"
            >
              {showSummaryCards ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                  <span>Sembunyikan</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  <span>Tampilkan Ringkasan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {showSummaryCards && (
          <div className="p-4 space-y-4">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Card 1: Total Bal */}
              <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 hover:border-gray-300 transition">
                <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                  <span>Total Populasi Bal</span>
                  <Package className="w-4 h-4 text-slate-700" />
                </div>
                <div className="text-xl font-bold font-mono text-gray-950">
                  {totals.totalBal.toLocaleString('id-ID')}{' '}
                  <span className="text-xs font-normal text-gray-500 font-sans">Bal</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  Terfilter dari {barangList.length} total bal master
                </div>
              </div>

              {/* Card 2: Total Tonase Netto */}
              <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 bg-blue-50/20 hover:border-blue-300 transition">
                <div className="flex items-center justify-between text-blue-900 text-[11px] font-semibold">
                  <span>Total Berat Netto</span>
                  <Scale className="w-4 h-4 text-blue-700" />
                </div>
                <div className="text-xl font-black font-mono text-blue-950">
                  {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                  <span className="text-xs font-bold text-blue-700 font-sans">Kg</span>
                </div>
                <div className="text-[10px] text-blue-800 font-medium">
                  ≈ {(totals.totalNetto / 1000).toFixed(2)} Ton (Bruto: {totals.totalBruto.toFixed(1)} kg)
                </div>
              </div>

              {/* Card 3: Rata-rata Berat / Bal */}
              <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 hover:border-gray-300 transition">
                <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                  <span>Rata-rata Berat / Bal</span>
                  <TrendingUp className="w-4 h-4 text-slate-700" />
                </div>
                <div className="text-xl font-bold font-mono text-gray-950">
                  {totals.avgNetto.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-gray-500 font-sans">Kg/bal</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  Min: {totals.minBerat.toFixed(1)} kg • Max: {totals.maxBerat.toFixed(1)} kg
                </div>
              </div>

              {/* Card 4: Rata-rata Harga Beli */}
              <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 hover:border-gray-300 transition">
                <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                  <span>Rata-rata Harga Beli</span>
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-900">
                  Rp {Math.round(totals.avgHargaKg).toLocaleString('id-ID')}{' '}
                  <span className="text-xs font-normal text-gray-500 font-sans">/kg</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  Min: Rp {totals.minHarga.toLocaleString('id-ID')} • Max: Rp {totals.maxHarga.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Card 5: Total Nilai Pembelian */}
              <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 bg-red-50/20 col-span-2 sm:col-span-1 hover:border-red-300 transition">
                <div className="flex items-center justify-between text-[#b81d24] text-[11px] font-bold">
                  <span>Total Nilai Pembelian</span>
                  <DollarSign className="w-4 h-4 text-[#b81d24]" />
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-[#b81d24]">
                  Rp {Math.round(totals.totalNilai).toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-gray-600 font-medium">
                  Akumulasi nilai seluruh bal terfilter
                </div>
              </div>
            </div>

            {/* Sub-Ringkasan Grade Breakdown */}
            {sortedData.length > 0 && gradeBreakdown.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-700" />
                  <span>Sub-Ringkasan Akumulasi per Grade</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {gradeBreakdown.map((gb) => {
                    const pct = totals.totalNetto > 0 ? ((gb.totalNetto / totals.totalNetto) * 100).toFixed(1) : '0';
                    const avg = gb.balCount > 0 ? (gb.totalNetto / gb.balCount).toFixed(1) : '0';

                    return (
                      <div
                        key={gb.grade}
                        className="bg-white border border-gray-200 p-2.5 rounded-xs flex flex-col justify-between space-y-1.5 shadow-2xs hover:border-gray-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-xs ${getGradeBadgeClass(gb.grade)}`}>
                            Grade {gb.grade}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded-xs border border-blue-100">
                            {pct}%
                          </span>
                        </div>

                        <div className="pt-1 space-y-0.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[11px] text-gray-500 font-medium">Total Netto:</span>
                            <span className="text-xs font-bold font-mono text-gray-900">
                              {gb.totalNetto.toFixed(1)} <span className="text-[10px] font-normal text-gray-500">kg</span>
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between text-[10px] text-gray-500">
                            <span>Populasi:</span>
                            <span className="font-mono font-semibold text-gray-700">{gb.balCount} Bal</span>
                          </div>
                          <div className="flex items-baseline justify-between text-[10px] text-gray-500">
                            <span>Rata-rata:</span>
                            <span className="font-mono text-gray-700">{avg} kg/bal</span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-gray-100 text-[11px] text-right font-mono font-bold text-[#b81d24]">
                          Rp {Math.round(gb.totalNilai).toLocaleString('id-ID')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Visualisasi Distribusi Grade */}
                <div className="mt-6 border border-gray-200 rounded-sm p-4 bg-[#f8f9fa] shadow-2xs">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4 text-center">
                    Distribusi Jumlah Bal Berdasarkan Grade
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeBreakdown} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="grade" 
                          tick={{ fontSize: 11, fontWeight: 'bold' }} 
                          tickLine={false}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          allowDecimals={false}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip 
                          cursor={{ fill: '#f3f4f6' }}
                          contentStyle={{ borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                          formatter={(value) => [`${value} Bal`, 'Jumlah Bal']}
                          labelFormatter={(label) => `Grade ${label}`}
                        />
                        <Bar 
                          dataKey="balCount" 
                          name="Jumlah Bal" 
                          radius={[4, 4, 0, 0]}
                          barSize={40}
                        >
                          {gradeBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#b81d24" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Collapsible Filter Control Section */}
      {isFilterPanelOpen && (
        <div className="bg-white p-4 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                Filter Data & Parameter Analisis Bal
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-red-700 hover:text-red-900 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Semua Filter</span>
            </button>
          </div>

          <form onSubmit={handleApplyFilters} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              
              {/* Filter 1: Tanggal Dari */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Tanggal Masuk Dari
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Filter 2: Tanggal Sampai */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Tanggal Sampai
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Filter 3: Lokasi Gudang */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Lokasi Gudang
                </label>
                <select
                  value={filterGudang}
                  onChange={(e) => setFilterGudang(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">-- Semua Gudang / Lokasi --</option>
                  {uniqueWarehouses.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Kode Grade / Beli */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Kode Grade / Beli
                </label>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">-- Semua Grade --</option>
                  {uniqueGrades.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 5: Status Stok */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Status Stok Bal
                </label>
                <select
                  value={filterStatusStok}
                  onChange={(e) => setFilterStatusStok(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">-- Semua Status --</option>
                  <option value="di_gudang">Di Gudang (Tersedia)</option>
                  <option value="siap_kirim">Siap Kirim DO</option>
                  <option value="keluar">Keluar (Terkirim Pabrik)</option>
                  <option value="terkirim_sample">Terkirim Sample QC</option>
                </select>
              </div>

              {/* Filter 6: Search Keyword */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Cari No Bal / Petani / Kupon
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="No bal, petani, barcode..."
                    className="w-full pl-8 pr-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Sub-Row: Min/Max Berat & Harga Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-gray-500 whitespace-nowrap">Rentang Berat (kg):</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={filterMinBerat}
                  onChange={(e) => setFilterMinBerat(e.target.value)}
                  className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-none text-xs"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filterMaxBerat}
                  onChange={(e) => setFilterMaxBerat(e.target.value)}
                  className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-none text-xs"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-gray-500 whitespace-nowrap">Rentang Harga (Rp):</span>
                <input
                  type="number"
                  placeholder="Min Rp"
                  value={filterMinHarga}
                  onChange={(e) => setFilterMinHarga(e.target.value)}
                  className="w-24 px-2 py-1 bg-white border border-gray-300 rounded-none text-xs"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max Rp"
                  value={filterMaxHarga}
                  onChange={(e) => setFilterMaxHarga(e.target.value)}
                  className="w-24 px-2 py-1 bg-white border border-gray-300 rounded-none text-xs"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end space-x-2">
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-none shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>Terapkan Filter</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 4. Main Table: Detail Setiap Bal */}
      <div className="bg-white border border-gray-200 rounded-none shadow-xs overflow-hidden">
        
        {/* Table Header Info Bar */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-2 text-gray-700 flex-wrap">
            <span>Menampilkan data</span>
            <strong className="text-gray-900 font-mono font-bold">
              {sortedData.length > 0 
                ? (itemsPerPage === -1 
                    ? `1 - ${sortedData.length}` 
                    : `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, sortedData.length)}`
                  ) 
                : 0}
            </strong>
            <span>dari</span>
            <strong className="text-gray-900 font-mono font-bold">{sortedData.length}</strong>
            <span>bal terfilter</span>
            {sortConfigs.length > 0 && (
              <div className="inline-flex items-center space-x-1.5 ml-2 flex-wrap gap-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase mr-1">Urutan:</span>
                {sortConfigs.map((config, idx) => (
                  <span key={config.field} className="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold rounded-xs flex items-center space-x-1">
                    <span>{idx + 1}. {config.field.replace(/_/g, ' ').toUpperCase()}</span>
                    <span>({config.direction === 'asc' ? 'TERENDAH / A-Z' : 'TERTINGGI / Z-A'})</span>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSortConfigs([]);
                  }}
                  className="px-1.5 py-0.5 text-[10px] font-bold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xs flex items-center space-x-1 cursor-pointer"
                  title="Reset urutan ke default"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset Urutan</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs text-gray-700">
            {/* Top View Selector Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-gray-600 font-medium">Tampil</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-gray-300 rounded-xs text-xs font-semibold text-gray-800 shadow-2xs focus:outline-hidden focus:border-red-500 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
            </div>

            <span className="text-[11px] text-gray-400 italic hidden md:inline">
              *Klik header kolom untuk mengurutkan (▲ / ▼)
            </span>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f1f3f5] border-b-2 border-gray-300 text-gray-800 font-bold uppercase tracking-wider text-[11px]">
                
                {/* 1. No */}
                <th
                  onClick={() => handleHeaderSort('default')}
                  className="py-2.5 px-2.5 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition w-12 group select-none"
                  title="Klik untuk reset urutan default"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>No</span>
                    {sortConfigs.length > 0 && renderSortIndicator('default')}
                  </div>
                </th>

                {/* 2. No Bal (Alphanumeric Natural Sort) */}
                <th
                  onClick={() => handleHeaderSort('no_bal')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none bg-slate-100/50 w-28 whitespace-nowrap"
                  title="Klik untuk urutkan No Bal dari alfabet lalu angka"
                >
                  <div className="flex items-center justify-between space-x-1.5">
                    <span className="text-gray-950 font-black">No. Bal</span>
                    {renderSortIndicator('no_bal')}
                  </div>
                </th>

                {/* 3. Tanggal Masuk */}
                <th
                  onClick={() => handleHeaderSort('tanggal_masuk')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Tanggal Masuk"
                >
                  <div className="flex items-center justify-between space-x-1">
                    <span>Tanggal Masuk</span>
                    {renderSortIndicator('tanggal_masuk')}
                  </div>
                </th>

                {/* 4. Grade */}
                <th
                  onClick={() => handleHeaderSort('kode_grade')}
                  className="py-2.5 px-2.5 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Grade"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Grade</span>
                    {renderSortIndicator('kode_grade')}
                  </div>
                </th>

                {/* 5. Petani / Supplier & Kupon */}
                <th
                  onClick={() => handleHeaderSort('nama_petani')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Nama Petani"
                >
                  <div className="flex items-center justify-between space-x-1">
                    <span>Petani / Supplier</span>
                    {renderSortIndicator('nama_petani')}
                  </div>
                </th>

                {/* 6. Lokasi Gudang */}
                <th
                  onClick={() => handleHeaderSort('lokasi_gudang')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Lokasi Gudang"
                >
                  <div className="flex items-center justify-between space-x-1">
                    <span>Lokasi Gudang</span>
                    {renderSortIndicator('lokasi_gudang')}
                  </div>
                </th>

                {/* 7. Berat Bruto (kg) */}
                <th
                  onClick={() => handleHeaderSort('berat_bruto_kg')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Berat Bruto"
                >
                  <div className="flex items-center justify-end space-x-1">
                    {renderSortIndicator('berat_bruto_kg')}
                    <span>Bruto (kg)</span>
                  </div>
                </th>

                {/* 8. Potongan Tara (kg) */}
                <th className="py-2.5 px-2.5 text-right border-r border-gray-200 text-gray-600">
                  <span>Tara (kg)</span>
                </th>

                {/* 9. Berat Netto (kg) [PRIMARY SORT TARGET] */}
                <th
                  onClick={() => handleHeaderSort('berat_kg')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition group select-none bg-blue-50/70"
                  title="Klik untuk urutkan Paling Berat / Paling Ringan"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    {renderSortIndicator('berat_kg')}
                    <span className="text-blue-950 font-black">Netto (kg)</span>
                  </div>
                </th>

                {/* 10. Harga Beli / kg (Rp) [PRIMARY SORT TARGET] */}
                <th
                  onClick={() => handleHeaderSort('harga_per_kg')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-emerald-100 transition group select-none bg-emerald-50/70"
                  title="Klik untuk urutkan Harga Terendah ke Tertinggi"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-emerald-950 font-black">Harga/kg (Rp)</span>
                    {renderSortIndicator('harga_per_kg')}
                  </div>
                </th>

                {/* 11. Total Harga Beli (Rp) [PRIMARY SORT TARGET] */}
                <th
                  onClick={() => handleHeaderSort('total_harga')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-red-100 transition group select-none bg-red-50/70"
                  title="Klik untuk urutkan Total Harga Beli"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-[#b81d24] font-black">Total Harga (Rp)</span>
                    {renderSortIndicator('total_harga')}
                  </div>
                </th>

                {/* 12. Status Bal */}
                <th
                  onClick={() => handleHeaderSort('status_stok')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Status Bal"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    {renderSortIndicator('status_stok')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500 bg-white">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Package className="w-8 h-8 text-gray-300" />
                      <p className="font-semibold text-gray-700">Tidak ada data bal yang cocok dengan filter.</p>
                      <p className="text-[11px] text-gray-400">Silakan ubah parameter pencarian atau klik reset filter.</p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-xs cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((bal, idx) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const dateStr = bal.tanggal_masuk ? bal.tanggal_masuk.split('T')[0] : '-';

                  return (
                    <tr
                      key={bal.barang_id || idx}
                      className={`transition-colors border-b border-gray-100 hover:bg-amber-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}
                    >
                      {/* 1. No */}
                      <td className="py-2 px-2.5 text-center font-mono text-gray-500 border-r border-gray-100">
                        {rowNumber}
                      </td>

                      {/* 2. No Bal */}
                      <td className="py-2 px-3 font-mono font-black text-gray-950 border-r border-gray-100 whitespace-nowrap bg-slate-50/40 w-28">
                        <span className="hover:underline cursor-pointer" title={`ID: ${bal.barang_id}`}>
                          {bal.no_bal || bal.barang_id}
                        </span>
                        {bal.kode_bal_pembeli && (
                          <span className="block text-[10px] text-gray-400 font-normal">
                            Ref: {bal.kode_bal_pembeli}
                          </span>
                        )}
                      </td>

                      {/* 3. Tanggal Masuk */}
                      <td className="py-2 px-3 font-mono text-gray-700 border-r border-gray-100 whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>

                      {/* 4. Grade */}
                      <td className="py-2 px-2.5 text-center border-r border-gray-100 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-xs ${getGradeBadgeClass(
                            bal.kode_grade || '-'
                          )}`}
                        >
                          {bal.kode_grade || '-'}
                        </span>
                      </td>

                      {/* 5. Petani / Supplier */}
                      <td className="py-2 px-3 border-r border-gray-100">
                        <div className="font-semibold text-gray-900 truncate max-w-[140px]" title={bal.nama_petani}>
                          {bal.nama_petani || '-'}
                        </div>
                        {bal.no_kupon && bal.no_kupon !== '-' && (
                          <span className="text-[10px] text-blue-700 font-mono">
                            Kupon: {bal.no_kupon}
                          </span>
                        )}
                      </td>

                      {/* 6. Lokasi Gudang */}
                      <td className="py-2 px-3 text-gray-700 border-r border-gray-100 text-[11px]">
                        <div className="truncate max-w-[160px]" title={bal.lokasi_gudang}>
                          {bal.lokasi_gudang || '-'}
                        </div>
                      </td>

                      {/* 7. Bruto */}
                      <td className="py-2 px-3 text-right font-mono text-gray-700 border-r border-gray-100 whitespace-nowrap">
                        {(bal.berat_bruto_kg || 0).toFixed(1)}
                      </td>

                      {/* 8. Tara */}
                      <td className="py-2 px-2.5 text-right font-mono text-gray-500 border-r border-gray-100 whitespace-nowrap">
                        {(bal.potongan_tara_kg || 0).toFixed(1)}
                      </td>

                      {/* 9. Netto [HIGHLIGHT] */}
                      <td className="py-2 px-3 text-right font-mono font-black text-blue-950 border-r border-gray-100 bg-blue-50/30 whitespace-nowrap">
                        {(bal.berat_kg || 0).toFixed(1)} <span className="text-[10px] font-normal text-gray-500">kg</span>
                      </td>

                      {/* 10. Harga/kg [HIGHLIGHT] */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900 border-r border-gray-100 bg-emerald-50/20 whitespace-nowrap">
                        Rp {Math.round(bal.harga_per_kg || 0).toLocaleString('id-ID')}
                      </td>

                      {/* 11. Total Harga [HIGHLIGHT] */}
                      <td className="py-2 px-3 text-right font-mono font-black text-[#b81d24] border-r border-gray-100 bg-red-50/30 whitespace-nowrap">
                        Rp {Math.round(bal.total_harga || 0).toLocaleString('id-ID')}
                      </td>

                      {/* 12. Status */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {getStatusBadge(bal.status_stok || 'di_gudang')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Totals */}
            {sortedData.length > 0 && (
              <tfoot className="bg-slate-200/95 text-gray-950 font-extrabold text-xs border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider border-r border-gray-300 bg-gray-200/80">
                    TOTAL KESELURUHAN ({totals.totalBal} BAL):
                  </td>
                  <td className="py-3 px-3 text-right font-mono border-r border-gray-300 whitespace-nowrap">
                    {totals.totalBruto.toFixed(1)} kg
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-gray-600 border-r border-gray-300 whitespace-nowrap">
                    {totals.totalTara.toFixed(1)} kg
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-950 border-r border-gray-300 whitespace-nowrap bg-blue-100/70 font-black">
                    {totals.totalNetto.toFixed(1)} kg
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-950 border-r border-gray-300 whitespace-nowrap bg-emerald-100/70 font-bold">
                    Rata²: Rp {Math.round(totals.avgHargaKg).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#b81d24] border-r border-gray-300 whitespace-nowrap bg-red-100 font-black text-sm">
                    Rp {Math.round(totals.totalNilai).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-center bg-gray-200/80 text-[11px] text-gray-700">
                    100% Data
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Bar */}
        {sortedData.length > 0 && (
          <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 font-medium">Tampil</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-gray-300 rounded-xs text-xs font-semibold text-gray-800 shadow-2xs focus:outline-hidden focus:border-red-500 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
              {itemsPerPage === -1 && (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200 font-semibold">
                  Semua {sortedData.length} bal ditampilkan dalam 1 halaman
                </span>
              )}
            </div>

            {itemsPerPage !== -1 && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
              />
            )}
          </div>
        )}
      </div>

      {/* 7. Hidden Container for PDF / Document Printing */}
      <div className="hidden">
        <div
          ref={printDocumentRef}
          id="printable-laporan-bal"
          className="w-full max-w-5xl bg-white p-6 text-gray-900 font-sans text-xs space-y-4"
        >
          {/* Letterhead Kop Surat */}
          <div className="text-center border-b-2 border-gray-900 pb-3 mb-4">
            <h2 className="text-lg font-black tracking-widest uppercase text-gray-950">
              PR. SEKAR MAJU SEJAHTERA
            </h2>
            <p className="text-[11px] text-gray-600 tracking-wide font-medium">
              SISTEM DATA GUDANG & PENGADAAN TEMBAKAU RAJANGAN MADURA
            </p>
            <p className="text-[10px] text-gray-500">
              Jl. Raya Sentol Pamekasan - Madura | Telp: (0324) 321888 | Email: gudang@sekarmajusejahtera.co.id
            </p>
          </div>

          {/* Title & Metadata */}
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-center text-gray-900 underline">
              LAPORAN DETAIL BAL TEMBAKAU
            </h3>
            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] bg-gray-50 p-2 border border-gray-200">
              <div>
                <span className="font-semibold text-gray-600">Periode Masuk:</span>{' '}
                <span>
                  {appliedFilters.startDate || 'Semua'} s/d {appliedFilters.endDate || 'Sekarang'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Filter Grade:</span>{' '}
                <span>{appliedFilters.grade === 'ALL' ? 'Semua Grade' : `Grade ${appliedFilters.grade}`}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Filter Lokasi Gudang:</span>{' '}
                <span>{appliedFilters.gudang === 'ALL' ? 'Semua Gudang' : appliedFilters.gudang}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Waktu Cetak Dokumen:</span>{' '}
                <span>{new Date().toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Print Table */}
          <table className="w-full text-left border-collapse border border-gray-300 text-[10px] mb-4">
            <thead>
              <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-300 uppercase">
                <th className="p-1 border border-gray-300 text-center">NO</th>
                <th className="p-1 border border-gray-300">TANGGAL</th>
                <th className="p-1 border border-gray-300">NO BAL</th>
                <th className="p-1 border border-gray-300">PETANI</th>
                <th className="p-1 border border-gray-300 text-right">BERAT</th>
                <th className="p-1 border border-gray-300 text-right">HARGA</th>
                <th className="p-1 border border-gray-300 text-center">STATUS</th>
                <th className="p-1 border border-gray-300 text-right">POTONGAN</th>
                <th className="p-1 border border-gray-300 text-center">STATUS (DIGUDANG/TERKIRIM)</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.slice(0, 300).map((b, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                  <td className="p-1 border border-gray-300 font-mono">{b.tanggal_masuk?.split('T')[0] || '-'}</td>
                  <td className="p-1 border border-gray-300 font-mono font-bold">{b.no_bal}</td>
                  <td className="p-1 border border-gray-300">{b.nama_petani}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono font-bold">{(b.berat_kg || 0).toFixed(1)}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono font-bold">Rp {Math.round(b.total_harga || 0).toLocaleString('id-ID')}</td>
                  <td className="p-1 border border-gray-300 text-center uppercase text-[9px]">{b.status_pembayaran === 'lunas' ? 'LUNAS' : 'KASBON'}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono">Rp {Math.round(b.potongan || 0).toLocaleString('id-ID')}</td>
                  <td className="p-1 border border-gray-300 text-center uppercase text-[9px]">{b.status_stok === 'di_gudang' ? 'DIGUDANG' : b.status_stok === 'keluar' ? 'TERKIRIM' : b.status_stok}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan={6} className="p-1.5 border border-gray-300 text-right">TOTAL ({totals.totalBal} BAL):</td>
                <td className="p-1.5 border border-gray-300 text-right font-mono">{totals.totalBruto.toFixed(1)} kg</td>
                <td className="p-1.5 border border-gray-300 text-right font-mono">{totals.totalNetto.toFixed(1)} kg</td>
                <td className="p-1.5 border border-gray-300 text-right font-mono">Rp {Math.round(totals.avgHargaKg).toLocaleString('id-ID')}</td>
                <td className="p-1.5 border border-gray-300 text-right font-mono text-black font-black">Rp {Math.round(totals.totalNilai).toLocaleString('id-ID')}</td>
                <td className="p-1.5 border border-gray-300"></td>
              </tr>
            </tfoot>
          </table>

          {/* Sub-Ringkasan Grade di Dokumen Cetak */}
          {gradeBreakdown.length > 0 && (
            <div className="mt-4 pt-2">
              <h4 className="text-[11px] font-bold uppercase text-gray-900 mb-1.5 pb-1 border-b border-gray-400">
                SUB-RINGKASAN TOTAL BERAT & NILAI BERDASARKAN GRADE
              </h4>
              <table className="w-full text-left border-collapse border border-gray-300 text-[9px] mb-3">
                <thead>
                  <tr className="bg-gray-100 font-bold border-b border-gray-300">
                    <th className="p-1 border border-gray-300 text-center w-8">No</th>
                    <th className="p-1 border border-gray-300">Kode Grade</th>
                    <th className="p-1 border border-gray-300 text-center">Jumlah Bal</th>
                    <th className="p-1 border border-gray-300 text-right">Total Netto (kg)</th>
                    <th className="p-1 border border-gray-300 text-right">Rata-rata (kg/bal)</th>
                    <th className="p-1 border border-gray-300 text-center">% Kontribusi</th>
                    <th className="p-1 border border-gray-300 text-right font-bold">Total Nilai Pembelian (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeBreakdown.map((gb, idx) => {
                    const pct = totals.totalNetto > 0 ? ((gb.totalNetto / totals.totalNetto) * 100).toFixed(1) : '0';
                    const avg = gb.balCount > 0 ? (gb.totalNetto / gb.balCount).toFixed(1) : '0';
                    return (
                      <tr key={gb.grade} className="border-b border-gray-200">
                        <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                        <td className="p-1 border border-gray-300 font-bold">Grade {gb.grade}</td>
                        <td className="p-1 border border-gray-300 text-center font-mono">{gb.balCount} Bal</td>
                        <td className="p-1 border border-gray-300 text-right font-mono font-bold">{gb.totalNetto.toFixed(1)}</td>
                        <td className="p-1 border border-gray-300 text-right font-mono">{avg}</td>
                        <td className="p-1 border border-gray-300 text-center font-mono">{pct}%</td>
                        <td className="p-1 border border-gray-300 text-right font-mono font-bold">Rp {Math.round(gb.totalNilai).toLocaleString('id-ID')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Tanda Tangan Audit */}
          <div className="grid grid-cols-3 gap-4 pt-6 text-center text-[11px]">
            <div>
              <p className="text-gray-600">Petugas Administrasi Bal</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-gray-900">Siti Rahayu</p>
            </div>
            <div>
              <p className="text-gray-600">Supervisor QC & Mutu</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-gray-900">drg. Hendra Kusuma</p>
            </div>
            <div>
              <p className="text-gray-600">Kepala Gudang / Mengetahui</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-gray-900">Bambang Sutrisno, S.T.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Scroll Controls (Otomatis Geser ke Paling Atas & Paling Bawah) */}
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

    </div>
  );
};

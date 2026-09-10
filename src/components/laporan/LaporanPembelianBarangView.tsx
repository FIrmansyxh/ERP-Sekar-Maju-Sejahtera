import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  RotateCcw, 
  Download, 
  Calendar, 
  Tag, 
  User, 
  Package, 
  Ticket,
  Filter,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
  Scale,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

import { TransaksiPembelian, Petani } from '../../types';
import { downloadCsvFile, downloadElementAsPdf } from '../../utils/printDownload';
import { formatDateHariBulanTahun } from '../../utils/formatters';

export type SortField = 'default' | 'tanggal' | 'kupon' | 'petani' | 'no_bal' | 'kode_beli' | 'bruto' | 'netto' | 'potongan' | 'total_harga' | 'jumlah_bayar';

interface LaporanPembelianBarangViewProps {
  transaksiList: TransaksiPembelian[];
  petaniList: Petani[];
  userRole?: string;
  onNavigateToTransaksi?: () => void;
}

interface ResizableHeaderProps {
  colKey: string;
  title: string;
  colWidths: Record<string, number>;
  setColWidths: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  className?: string;
  sortField?: SortField;
  sortConfigs?: { field: SortField; direction: 'asc' | 'desc' }[];
  onSort?: (field: SortField) => void;
}

const ResizableHeader: React.FC<ResizableHeaderProps> = ({ 
  colKey, 
  title, 
  colWidths, 
  setColWidths, 
  minWidth = 50,
  align = 'left',
  className = '',
  sortField,
  sortConfigs = [],
  onSort
}) => {
  const width = colWidths[colKey];
  
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const baseClass = `py-2.5 px-2.5 border-r border-gray-200 relative group select-none whitespace-nowrap ${onSort && sortField ? 'cursor-pointer hover:bg-gray-200/80 transition' : ''}`;
  
  const configIndex = sortField ? sortConfigs.findIndex(c => c.field === sortField) : -1;
  const sortConfig = configIndex >= 0 ? sortConfigs[configIndex] : null;

  return (
    <th 
      className={`${baseClass} ${alignClass} ${className}`}
      style={{ width, minWidth: width, maxWidth: width }}
      onClick={() => {
        if (onSort && sortField) {
          onSort(sortField);
        }
      }}
      title={onSort && sortField ? `Klik untuk mengurutkan berdasarkan ${title}` : ''}
    >
      <div className={`flex items-center ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'} space-x-1`}>
        <span className="truncate">{title}</span>
        {sortConfig && (
          <span className="inline-flex items-center text-[#b81d24] bg-red-50 p-0.5 px-1 rounded-xs border border-red-200 ml-1 flex-shrink-0" title={sortConfig.direction === 'asc' ? "Urutan Terendah / Naik / A-Z" : "Urutan Tertinggi / Turun / Z-A"}>
            {sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#b81d24]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#b81d24]" />}
            {sortConfigs.length > 1 && <span className="text-[10px] font-bold ml-0.5 leading-none">{configIndex + 1}</span>}
          </span>
        )}
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#b81d24] active:bg-[#b81d24] z-10"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.pageX;
          const startWidth = width;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.max(minWidth, startWidth + (moveEvent.pageX - startX));
            setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
          };

          const onMouseUp = (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            const finalWidth = Math.max(minWidth, startWidth + (upEvent.pageX - startX));
            setColWidths(prev => {
              const updated = { ...prev, [colKey]: finalWidth };
              sessionStorage.setItem('pembelianColWidths', JSON.stringify(updated));
              return updated;
            });
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
      />
    </th>
  );
};

export const LaporanPembelianBarangView: React.FC<LaporanPembelianBarangViewProps> = ({
  transaksiList = [],
  petaniList = [],
  userRole,
  onNavigateToTransaksi,
}) => {
  // Filter States 
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterKupon, setFilterKupon] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterNoBall, setFilterNoBall] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  // Column Widths State (Persisted in session)
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const saved = sessionStorage.getItem('pembelianColWidths');
    return saved ? JSON.parse(saved) : {
      no: 50,
      tanggal: 80,
      kupon: 100,
      petani: 140,
      noBal: 100,
      kodeBeli: 80,
      bruto: 80,
      netto: 80,
      potongan: 100,
      totalHarga: 120,
      jumlahBayar: 120
    };
  });

  // Multi-column Sort State (max 3 columns)
  type SortConfig = { field: SortField; direction: 'asc' | 'desc' };
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);

  // Applied Filter State (updates on "Cari Data" or reset)
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: '',
    kupon: '',
    grade: '',
    noBall: '',
    supplier: '',
  });

  // PDF Generation State (Direct Download)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printReportRef = useRef<HTMLDivElement>(null);

  // Sub-Ringkasan Grade Collapse State
  const [showGradeSummary, setShowGradeSummary] = useState(true);

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

  const handleDownloadPdf = async () => {
    if (!printReportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(
        printReportRef.current,
        `Laporan_Pembelian_Barang_${new Date().toISOString().slice(0, 10)}.pdf`,
        { orientation: 'landscape' }
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

// Unique list of Kupons & Suppliers for dropdowns
  /**
   * Mengambil seluruh Grade unik dari transaksi kupon pembelian tanpa duplikasi.
   * Misal jika dalam 1 kupon ada bal Grade A, B, C, D maka menghasilkan ['A', 'B', 'C', 'D'].
   */
  const getTransactionUniqueGrades = (row: TransaksiPembelian): string[] => {
    const grades = new Set<string>();
    if (row.items && Array.isArray(row.items) && row.items.length > 0) {
      row.items.forEach((it) => {
        if (it.kode_grade && it.kode_grade.trim()) {
          grades.add(it.kode_grade.trim().toUpperCase());
        }
      });
    }
    if (grades.size === 0 && row.kode_grade) {
      row.kode_grade
        .split(/[,/]/)
        .map((g) => g.trim().toUpperCase())
        .filter(Boolean)
        .forEach((g) => grades.add(g));
    }
    return Array.from(grades).sort();
  };

  const uniqueKupons = useMemo(() => {
    const kupons = new Set<string>();
    transaksiList.forEach(t => {
      if (t.no_kupon) kupons.add(t.no_kupon);
    });
    return Array.from(kupons).sort();
  }, [transaksiList]);

  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, string>();
    transaksiList.forEach(t => {
      if (t.petani_id && t.nama_petani) {
        map.set(t.petani_id, t.nama_petani);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [transaksiList]);

  // Execute Filter Search
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      startDate: filterStartDate,
      endDate: filterEndDate,
      kupon: filterKupon,
      grade: filterGrade,
      noBall: filterNoBall.trim(),
      supplier: filterSupplier,
    });
  };

  // Reset Filters
  const handleReset = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterKupon('');
    setFilterGrade('');
    setFilterNoBall('');
    setFilterSupplier('');
    setAppliedFilters({
      startDate: '',
      endDate: '',
      kupon: '',
      grade: '',
      noBall: '',
      supplier: '',
    });
  };

  const handleSort = (field: SortField) => {
    if (field === 'default') {
      setSortConfigs([]);
      return;
    }

    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(c => c.field === field);
      
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.direction === 'desc') {
          // Toggle to asc (second click)
          const newConfigs = [...prev];
          newConfigs[existingIndex] = { ...existing, direction: 'asc' };
          return newConfigs;
        } else {
          // Remove from sort (third click)
          return prev.filter((_, idx) => idx !== existingIndex);
        }
      } else {
        // Add new sort, desc first (first click)
        const newConfigs = [...prev, { field, direction: 'desc' as const }];
        // Keep only max 3 columns for sorting
        if (newConfigs.length > 3) {
          newConfigs.shift();
        }
        return newConfigs;
      }
    });
  };

  // Render Sort Header Icon - Single clean arrow when active
  const renderSortIndicator = (field: SortField) => {
    if (field === 'default') {
      if (sortConfigs.length === 0) return null;
      return (
        <button type="button" onClick={() => setSortConfigs([])} className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-0.5 rounded-sm transition ml-2 cursor-pointer font-semibold border border-red-200">
          Reset Urutan
        </button>
      );
    }
    return null; // The column indicator is handled inside ResizableHeader
  };

  // Filtered Transaksi Data
  const filteredData = useMemo(() => {
    return transaksiList.filter((item) => {
      // Filter Tanggal Dari
      if (appliedFilters.startDate && item.tanggal_transaksi) {
        const itemDate = item.tanggal_transaksi.split('T')[0];
        if (itemDate < appliedFilters.startDate) return false;
      }
      // Filter Tanggal Sampai
      if (appliedFilters.endDate && item.tanggal_transaksi) {
        const itemDate = item.tanggal_transaksi.split('T')[0];
        if (itemDate > appliedFilters.endDate) return false;
      }
      // Filter Kupon
      if (appliedFilters.kupon && appliedFilters.kupon !== 'ALL' && item.no_kupon !== appliedFilters.kupon) {
        return false;
      }
      // Filter Grade
      if (appliedFilters.grade && appliedFilters.grade !== 'ALL') {
        const targetG = appliedFilters.grade.trim().toUpperCase();
        const rowGrades = getTransactionUniqueGrades(item);
        if (!rowGrades.includes(targetG) && item.kode_grade?.toUpperCase() !== targetG) {
          return false;
        }
      }
      // Filter No Ball
      if (appliedFilters.noBall) {
        const query = appliedFilters.noBall.toLowerCase();
        const hasItemMatch = (item.items || []).some(i => i.no_bal?.toLowerCase().includes(query) || i.barcode?.toLowerCase().includes(query) || i.sample_label_code?.toLowerCase().includes(query));
        if (!item.no_bal?.toLowerCase().includes(query) && !hasItemMatch) return false;
      }
      // Filter Supplier
      if (appliedFilters.supplier && appliedFilters.supplier !== 'ALL' && item.petani_id !== appliedFilters.supplier) {
        return false;
      }
      return true;
    });
  }, [transaksiList, appliedFilters]);

  // Sorted Transaksi Data
  const sortedData = useMemo(() => {
    if (sortConfigs.length === 0) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      for (const config of sortConfigs) {
        let comparison = 0;
        switch (config.field) {
          case 'tanggal': {
            const tA = a.tanggal_transaksi ? new Date(a.tanggal_transaksi).getTime() : 0;
            const tB = b.tanggal_transaksi ? new Date(b.tanggal_transaksi).getTime() : 0;
            comparison = tA - tB;
            break;
          }
          case 'kupon': {
            const kA = a.no_kupon || '';
            const kB = b.no_kupon || '';
            comparison = kA.localeCompare(kB, undefined, { numeric: true, sensitivity: 'base' });
            break;
          }
          case 'petani': {
            const pA = a.nama_petani || '';
            const pB = b.nama_petani || '';
            comparison = pA.localeCompare(pB, undefined, { numeric: true, sensitivity: 'base' });
            break;
          }
          case 'no_bal': {
            const bA = a.no_bal || '';
            const bB = b.no_bal || '';
            comparison = bA.localeCompare(bB, undefined, { numeric: true, sensitivity: 'base' });
            break;
          }
          case 'kode_beli': {
            const getUniqueStr = (t: TransaksiPembelian) => {
              const rowGrades = Array.from(new Set(t.items?.map(i => i.kode_grade?.toUpperCase()) || [])).filter(Boolean);
              if (rowGrades.length > 0) return rowGrades.sort().join(',');
              return t.kode_grade || '';
            };
            const kA = getUniqueStr(a);
            const kB = getUniqueStr(b);
            comparison = kA.localeCompare(kB, undefined, { numeric: true, sensitivity: 'base' });
            break;
          }
          case 'bruto': {
            const brA = a.jenis_timbang === 'bruto' ? (a.berat_terukur_kg || a.berat_kg + 2) : 0;
            const brB = b.jenis_timbang === 'bruto' ? (b.berat_terukur_kg || b.berat_kg + 2) : 0;
            comparison = brA - brB;
            break;
          }
          case 'netto': {
            const ntA = a.berat_kg || 0;
            const ntB = b.berat_kg || 0;
            comparison = ntA - ntB;
            break;
          }
          case 'potongan': {
            const ptA = a.total_potongan || 7000;
            const ptB = b.total_potongan || 7000;
            comparison = ptA - ptB;
            break;
          }
          case 'total_harga': {
            const ntA = a.berat_kg || 0;
            const thA = a.total_harga_beli || (ntA * (a.harga_per_kg || 0));
            const ntB = b.berat_kg || 0;
            const thB = b.total_harga_beli || (ntB * (b.harga_per_kg || 0));
            comparison = thA - thB;
            break;
          }
          case 'jumlah_bayar': {
            const ptA = a.total_potongan || 7000;
            const thA = a.total_harga_beli || ((a.berat_kg || 0) * (a.harga_per_kg || 0));
            const jA = a.harga_final || (thA - ptA);
            
            const ptB = b.total_potongan || 7000;
            const thB = b.total_harga_beli || ((b.berat_kg || 0) * (b.harga_per_kg || 0));
            const jB = b.harga_final || (thB - ptB);
            
            comparison = jA - jB;
            break;
          }
        }
        
        if (comparison !== 0) {
          return config.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [filteredData, sortConfigs]);

  // Totals Calculation 
  const totals = useMemo(() => {
    let totalBal = 0;
    let totalBruto = 0;
    let totalNetto = 0;
    let totalHargaBeliRate = 0;
    let totalPotonganKuli = 0;
    let totalPotonganTikar = 0;
    let totalPotonganAll = 0;
    let totalNilaiHargaBeli = 0;
    let totalJumlahBayar = 0;

    sortedData.forEach((row) => {
      const balCount = row.total_bal || (row.items && row.items.length > 0 ? row.items.length : 1);
      const bruto = row.jenis_timbang === 'bruto' ? (row.berat_terukur_kg || row.berat_kg + 2) : 0;
      const netto = row.berat_kg || 0;
      const hrgBeli = row.harga_per_kg || 0;
      const potKuli = row.potongan_kuli || 7000;
      const potTikar = row.potongan_tikar || 0;
      const potTotal = row.total_potongan || (potKuli + potTikar);
      const subtotalHrgBeli = row.total_harga_beli || (netto * hrgBeli);
      const jmlBayar = row.harga_final || (subtotalHrgBeli - potTotal);

      totalBal += balCount;
      totalBruto += bruto;
      totalNetto += netto;
      totalHargaBeliRate += hrgBeli;
      totalPotonganKuli += potKuli;
      totalPotonganTikar += potTikar;
      totalPotonganAll += potTotal;
      totalNilaiHargaBeli += subtotalHrgBeli;
      totalJumlahBayar += jmlBayar;
    });

    return {
      totalBal,
      totalBruto,
      totalNetto,
      totalHargaBeliRate,
      totalPotonganKuli,
      totalPotonganTikar,
      totalPotonganAll,
      totalNilaiHargaBeli,
      totalJumlahBayar,
      count: sortedData.length,
    };
  }, [sortedData]);

  // Sub-Ringkasan Akumulasi Berat Berdasarkan Pengelompokan Kode Beli (Grade)
  const gradeSummary = useMemo(() => {
    const map: Record<
      string,
      {
        grade: string;
        totalBal: number;
        totalBruto: number;
        totalNetto: number;
        totalPotongan: number;
        totalNilaiHargaBeli: number;
        totalJumlahBayar: number;
      }
    > = {};

    filteredData.forEach((row) => {
      if (row.items && Array.isArray(row.items) && row.items.length > 0) {
        row.items.forEach((it) => {
          const gr = (it.kode_grade || 'LAINNYA').trim().toUpperCase();
          if (!map[gr]) {
            map[gr] = {
              grade: gr,
              totalBal: 0,
              totalBruto: 0,
              totalNetto: 0,
              totalPotongan: 0,
              totalNilaiHargaBeli: 0,
              totalJumlahBayar: 0,
            };
          }
          const bNetto = it.berat_kg || 0;
          const bBruto = it.berat_bruto_kg || (bNetto > 0 ? bNetto + (it.potongan_tara_kg || 0) : 0);
          const pot = it.potongan || ((it.potongan_kuli || 7000) + (it.potongan_tali || 0) + (it.potongan_tikar || 0));
          const subtotal = it.total_kotor || (bNetto * (it.harga_per_kg || 0));
          const jmlBayar = it.subtotal_bersih || (subtotal - pot);

          map[gr].totalBal += 1;
          map[gr].totalBruto += bBruto;
          map[gr].totalNetto += bNetto;
          map[gr].totalPotongan += pot;
          map[gr].totalNilaiHargaBeli += subtotal;
          map[gr].totalJumlahBayar += jmlBayar;
        });
      } else {
        const gr = (row.kode_grade || 'LAINNYA').trim().toUpperCase();
        if (!map[gr]) {
          map[gr] = {
            grade: gr,
            totalBal: 0,
            totalBruto: 0,
            totalNetto: 0,
            totalPotongan: 0,
            totalNilaiHargaBeli: 0,
            totalJumlahBayar: 0,
          };
        }
        const bNetto = row.berat_kg || 0;
        const bBruto = row.jenis_timbang === 'bruto' ? (row.berat_terukur_kg || bNetto + 2) : bNetto;
        const pot = row.total_potongan || ((row.potongan_kuli || 7000) + (row.potongan_tikar || 0));
        const subtotal = row.total_harga_beli || (bNetto * (row.harga_per_kg || 0));
        const jmlBayar = row.harga_final || (subtotal - pot);
        const balCount = row.total_bal || 1;

        map[gr].totalBal += balCount;
        map[gr].totalBruto += bBruto;
        map[gr].totalNetto += bNetto;
        map[gr].totalPotongan += pot;
        map[gr].totalNilaiHargaBeli += subtotal;
        map[gr].totalJumlahBayar += jmlBayar;
      }
    });

    return Object.values(map).sort((a, b) => a.grade.localeCompare(b.grade));
  }, [filteredData]);

  // Export CSV / Excel Compatible
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;

    const headers = [
      'No',
      'Tanggal',
      'Kupon',
      'Petani',
      'No Bal',
      'Kode Beli',
      'Bruto (kg)',
      'Netto (kg)',
      'Potongan (Rp)',
      'Total Harga Beli (Rp)',
      'Jumlah Bayar (Rp)',
    ];

    const rows: (string | number)[][] = sortedData.map((row, idx) => {
      const bruto = row.jenis_timbang === 'bruto' ? (row.berat_terukur_kg || row.berat_kg + 2) : 0;
      const subtotalHrgBeli = row.total_harga_beli || (row.berat_kg * row.harga_per_kg);
      const jmlBayar = row.harga_final || (subtotalHrgBeli - (row.total_potongan || 7000));
      const rowGrades = getTransactionUniqueGrades(row);
      const gradeStr = rowGrades.length > 0 ? rowGrades.join(', ') : (row.kode_grade || '-');

      return [
        idx + 1,
        row.tanggal_transaksi ? row.tanggal_transaksi.split('T')[0] : '-',
        row.no_kupon || '-',
        row.nama_petani || '-',
        (row.items && row.items.length > 0) ? row.items.map(it => it.no_bal || it.barcode || it.sample_label_code).filter(Boolean).join(', ') : (row.no_bal || '-'),
        gradeStr,
        bruto,
        row.berat_kg || 0,
        row.total_potongan || 7000,
        subtotalHrgBeli,
        jmlBayar,
      ];
    });

    // Add Sub-Ringkasan by Kode Beli
    rows.push(['', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['--- SUB-RINGKASAN BERDASARKAN KODE BELI (GRADE) ---', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Kode Beli (Grade)', 'Jumlah Bal', 'Total Bruto (kg)', 'Total Netto (kg)', 'Rata-rata (kg/bal)', '% Kontribusi Berat', 'Total Potongan (Rp)', 'Total Harga Beli (Rp)', 'Total Jumlah Bayar (Rp)', '', '']);
    
    gradeSummary.forEach((gs) => {
      const avg = gs.totalBal > 0 ? (gs.totalNetto / gs.totalBal).toFixed(2) : '0';
      const pct = totals.totalNetto > 0 ? ((gs.totalNetto / totals.totalNetto) * 100).toFixed(1) + '%' : '0%';
      rows.push([
        `Grade ${gs.grade}`,
        gs.totalBal,
        gs.totalBruto.toFixed(1),
        gs.totalNetto.toFixed(1),
        avg,
        pct,
        Math.round(gs.totalPotongan),
        Math.round(gs.totalNilaiHargaBeli),
        Math.round(gs.totalJumlahBayar),
        '',
        '',
      ]);
    });

    // Add Summary rows
    rows.push(['', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', 'TOTAL POTONGAN OUT (KULI)', '', '', totals.totalPotonganKuli, '', '']);
    rows.push(['', '', '', '', '', 'TOTAL POTONGAN GANTI TIKAR', '', '', totals.totalPotonganTikar, '', '']);
    rows.push([
      '',
      '',
      '',
      '',
      '',
      'TOTAL AKUMULASI KESELURUHAN',
      totals.totalBruto,
      totals.totalNetto,
      totals.totalPotonganAll,
      totals.totalNilaiHargaBeli,
      totals.totalJumlahBayar,
    ]);

    downloadCsvFile(
      `Laporan_Pembelian_Barang_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* Header Banner */}
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            
            <h1 className="text-base font-bold text-gray-900 tracking-tight">
              Laporan Pembelian Barang
            </h1>
          </div>
          
        </div>

        {/* Top Action Buttons (Direct Download Only) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            disabled={sortedData.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Excel / CSV</span>
          </button>
          
          <button
            onClick={handleDownloadPdf}
            disabled={sortedData.length === 0 || isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:opacity-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download Laporan (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Keseluruhan (Kumulatif) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total Baris & Bal</p>
            <p className="text-lg font-black text-gray-900 font-mono mt-0.5">
              {sortedData.length} <span className="text-sm font-medium text-gray-500 font-sans">Baris</span> <span className="text-gray-300 mx-1">|</span> {totals.totalBal} <span className="text-sm font-medium text-gray-500 font-sans">Bal</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total Berat (Netto)</p>
            <p className="text-lg font-black text-gray-900 font-mono mt-0.5">
              {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-medium text-gray-500 font-sans">Kg</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <Scale className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total Nilai Pembayaran</p>
            <p className="text-lg font-black text-[#b81d24] font-mono mt-0.5">
              Rp {Math.round(totals.totalJumlahBayar).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
            <TrendingUp className="w-5 h-5 text-[#b81d24]" />
          </div>
        </div>
      </div>

      {/* SUB-RINGKASAN: Total Berat Berdasarkan Pengelompokan Kode Beli (Grade) (Di atas Filter Data) */}
      {sortedData.length > 0 && gradeSummary.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-none shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-[#f8f9fa] border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-[#b81d24]" />
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                Sub-Ringkasan Akumulasi Berat Berdasarkan Pengelompokan Kode Beli (Grade)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-gray-700 border border-gray-300 rounded-xs">
                {gradeSummary.length} Grade Terdata
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <p className="text-[11px] text-gray-500 font-medium">
                Total Tonase: <strong className="text-gray-900 font-mono">{totals.totalNetto.toFixed(1)} kg</strong> ({(totals.totalNetto / 1000).toFixed(2)} Ton)
              </p>
              <button
                type="button"
                onClick={() => setShowGradeSummary(!showGradeSummary)}
                className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xs transition flex items-center space-x-1 cursor-pointer shadow-2xs"
              >
                {showGradeSummary ? (
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
          {showGradeSummary && (
            <>
              {/* Grid Grade Quick Visual Cards */}
              <div className="p-4 bg-[#fafafa] border-b border-gray-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {gradeSummary.map((gs) => {
                    const pct = totals.totalNetto > 0 ? ((gs.totalNetto / totals.totalNetto) * 100).toFixed(1) : '0';
                    const avg = gs.totalBal > 0 ? (gs.totalNetto / gs.totalBal).toFixed(1) : '0';
                    const gradeBadgeClass =
                      gs.grade === 'A' ? 'bg-zinc-900 text-white' :
                      gs.grade === 'B' ? 'bg-zinc-800 text-zinc-100' :
                      gs.grade === 'C' ? 'bg-blue-100 text-blue-900 font-bold' :
                      gs.grade === 'D' ? 'bg-purple-100 text-purple-900 font-bold' :
                      gs.grade === 'E' ? 'bg-gray-200 text-gray-800 font-bold' :
                      'bg-red-100 text-red-900 font-bold';

                    return (
                      <div
                        key={gs.grade}
                        className="bg-white border border-gray-200 p-2.5 rounded-xs flex flex-col justify-between space-y-1.5 shadow-2xs hover:border-gray-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-xs ${gradeBadgeClass}`}>
                            Grade {gs.grade}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded-xs border border-blue-100">
                            {pct}%
                          </span>
                        </div>

                        <div className="pt-1 space-y-0.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[11px] text-gray-500 font-medium">Total Berat:</span>
                            <span className="text-xs font-bold font-mono text-gray-900">
                              {gs.totalNetto.toFixed(1)} <span className="text-[10px] font-normal text-gray-500">kg</span>
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between text-[10px] text-gray-500">
                            <span>Populasi:</span>
                            <span className="font-mono font-semibold text-gray-700">{gs.totalBal} Bal</span>
                          </div>
                          <div className="flex items-baseline justify-between text-[10px] text-gray-500">
                            <span>Rata-rata:</span>
                            <span className="font-mono text-gray-700">{avg} kg/bal</span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-gray-100 text-[11px] text-right font-mono font-bold text-[#b81d24]">
                          Rp {Math.round(gs.totalJumlahBayar).toLocaleString('id-ID')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-Summary Detail Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f1f3f5] border-b border-gray-200 text-gray-700 font-bold">
                      <th className="py-2 px-3 text-center border-r border-gray-200 w-10">No</th>
                      <th className="py-2 px-3 border-r border-gray-200">Kode Beli (Grade)</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-center">Jumlah Bal</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-right">Total Bruto (kg)</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-right bg-blue-50/40">Total Netto (kg)</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-right">Rata-rata (kg/bal)</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-center">% Kontribusi Berat</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-right">Total Potongan (Rp)</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-right">Subtotal Harga (Rp)</th>
                      <th className="py-2 px-3 text-right bg-red-50/40 text-[#b81d24]">Total Jumlah Bayar (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {gradeSummary.map((gs, idx) => {
                      const pct = totals.totalNetto > 0 ? ((gs.totalNetto / totals.totalNetto) * 100).toFixed(1) : '0';
                      const avg = gs.totalBal > 0 ? (gs.totalNetto / gs.totalBal).toFixed(1) : '0';
                      const gradeBadgeClass =
                        gs.grade === 'A' ? 'bg-zinc-900 text-white' :
                        gs.grade === 'B' ? 'bg-zinc-800 text-zinc-100' :
                        gs.grade === 'C' ? 'bg-blue-100 text-blue-900 font-bold' :
                        gs.grade === 'D' ? 'bg-purple-100 text-purple-900 font-bold' :
                        gs.grade === 'E' ? 'bg-gray-200 text-gray-800 font-bold' :
                        'bg-red-100 text-red-900 font-bold';

                      return (
                        <tr key={gs.grade} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-2 px-3 text-center border-r border-gray-200 font-mono text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 font-bold">
                            <span className={`inline-block px-2 py-0.5 text-[11px] rounded-xs ${gradeBadgeClass}`}>
                              Grade {gs.grade}
                            </span>
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-800">
                            {gs.totalBal} Bal
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 text-right font-mono text-gray-700">
                            {gs.totalBruto > 0 ? gs.totalBruto.toFixed(1) : '-'}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 text-right font-mono font-black text-blue-950 bg-blue-50/20">
                            {gs.totalNetto.toFixed(1)} kg
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 text-right font-mono text-gray-700">
                            {avg} kg
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-800">
                            {pct}%
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 text-right font-mono text-amber-800">
                            Rp {Math.round(gs.totalPotongan).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 text-right font-mono text-gray-800 font-semibold">
                            Rp {Math.round(gs.totalNilaiHargaBeli).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#b81d24] bg-red-50/20">
                            Rp {Math.round(gs.totalJumlahBayar).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200/90 text-gray-950 font-extrabold text-xs border-t-2 border-gray-300">
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase border-r border-gray-300 bg-gray-200/80">
                        TOTAL KESELURUHAN GRADE:
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono border-r border-gray-300 font-bold">
                        {totals.totalBal} Bal
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono border-r border-gray-300 font-bold">
                        {totals.totalBruto.toFixed(1)} kg
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-950 border-r border-gray-300 font-black bg-blue-50/60">
                        {totals.totalNetto.toFixed(1)} kg
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono border-r border-gray-300 font-bold">
                        {totals.totalBal > 0 ? (totals.totalNetto / totals.totalBal).toFixed(1) : '0'} kg
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono border-r border-gray-300 font-bold">
                        100.0%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-950 border-r border-gray-300 font-bold">
                        Rp {Math.round(totals.totalPotonganAll).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono border-r border-gray-300 font-bold text-gray-900">
                        Rp {Math.round(totals.totalNilaiHargaBeli).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#b81d24] bg-red-100 font-black">
                        Rp {Math.round(totals.totalJumlahBayar).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filter Form Card  */}
      <div className="bg-white p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-gray-100">
          <Filter className="w-4 h-4 text-[#b81d24]" />
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
            Filter & Parameter Pencarian
          </span>
          <span className="text-[11px] text-gray-400">
            (Sesuaikan kriteria data lalu klik "Cari Data")
          </span>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Tanggal Dari */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Tanggal Dari
            </label>
            <div className="relative">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
              />
            </div>
          </div>

          {/* Tanggal Sampai */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Tanggal Sampai
            </label>
            <div className="relative">
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
              />
            </div>
          </div>

          {/* Kupon */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Kupon
            </label>
            <input
              type="text"
              list="kupon-list"
              value={filterKupon}
              onChange={(e) => setFilterKupon(e.target.value)}
              placeholder="Ketik/Pilih Kupon..."
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
            />
            <datalist id="kupon-list">
              <option value="ALL">Semua Kupon</option>
              {uniqueKupons.map(kup => (
                <option key={kup} value={kup}>{kup}</option>
              ))}
            </datalist>
          </div>

          {/* Kode Beli */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Kode Beli
            </label>
            <input
              type="text"
              list="grade-list"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              placeholder="Ketik/Pilih Kode Beli..."
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
            />
            <datalist id="grade-list">
              <option value="ALL">Semua Kode Beli</option>
              <option value="A">Kode Beli A (Super)</option>
              <option value="B">Kode Beli B (Premium)</option>
              <option value="C">Kode Beli C (Standar)</option>
              <option value="D">Kode Beli D (Medium)</option>
              <option value="E">Kode Beli E (Ekonomis)</option>
              <option value="F">Kode Beli F (Campuran)</option>
            </datalist>
          </div>

          {/* No Bal */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              No Bal
            </label>
            <input
              type="text"
              placeholder="Semua Bal / Cari..."
              value={filterNoBall}
              onChange={(e) => setFilterNoBall(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
            />
          </div>

          {/* Petani */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Petani
            </label>
            <input
              type="text"
              list="supplier-list"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              placeholder="Ketik/Pilih Petani..."
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none truncate"
            />
            <datalist id="supplier-list">
              <option value="ALL">Semua Petani</option>
              {uniqueSuppliers.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </datalist>
          </div>

          {/* Action Filter Buttons */}
          <div className="sm:col-span-2 lg:col-span-6 flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-none transition flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset Filter</span>
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari Data</span>
            </button>
          </div>
        </form>
      </div>

      {/* Quick Summary Pill Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Data Ditemukan</div>
          <div className="text-base font-bold text-gray-900 mt-0.5">{totals.count} Transaksi Bal</div>
        </div>
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Netto Timbang</div>
          <div className="text-base font-bold text-blue-900 mt-0.5">
            {totals.totalNetto.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500">kg</span>
          </div>
        </div>
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Potongan (Kuli + Tikar)</div>
          <div className="text-base font-bold text-amber-700 mt-0.5">
            Rp {totals.totalPotonganAll.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Jumlah Bayar Petani</div>
          <div className="text-base font-bold text-[#b81d24] mt-0.5">
            Rp {totals.totalJumlahBayar.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Data Table Card  */}
      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Tabel Rekapitulasi Pembelian Barang
            </span>
            <span className="text-xs text-gray-500">
              ({sortedData.length} baris data • {totals.totalBal} Bal • {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg Netto)
            </span>
          </div>
          
          <span className="text-[11px] text-gray-500 italic">
            * Potongan kuli Rp 7.000 / bal
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-gray-200 shadow-sm relative scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">
                <th 
                  className="py-2.5 px-2.5 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition select-none"
                  style={{ width: colWidths.no, minWidth: 40, maxWidth: colWidths.no }}
                  onClick={() => {
                    setSortConfigs([]);
                  }}
                  title="Klik untuk reset urutan default"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className="truncate">No</span>
                    {sortConfigs.length > 0 && renderSortIndicator('default')}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#b81d24] active:bg-[#b81d24] z-10"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const startX = e.pageX;
                      const startWidth = colWidths.no;

                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const newWidth = Math.max(40, startWidth + (moveEvent.pageX - startX));
                        setColWidths(prev => ({ ...prev, no: newWidth }));
                      };

                      const onMouseUp = (upEvent: MouseEvent) => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        const finalWidth = Math.max(40, startWidth + (upEvent.pageX - startX));
                        setColWidths(prev => {
                          const updated = { ...prev, no: finalWidth };
                          sessionStorage.setItem('pembelianColWidths', JSON.stringify(updated));
                          return updated;
                        });
                      };

                      document.addEventListener('mousemove', onMouseMove);
                      document.addEventListener('mouseup', onMouseUp);
                    }}
                  />
                </th>
                <ResizableHeader colKey="tanggal" title="Tanggal" colWidths={colWidths} setColWidths={setColWidths} minWidth={70} sortField="tanggal" sortConfigs={sortConfigs} onSort={handleSort} />
                <ResizableHeader colKey="kupon" title="Kupon" colWidths={colWidths} setColWidths={setColWidths} minWidth={70} sortField="kupon" sortConfigs={sortConfigs} onSort={handleSort} />
                <ResizableHeader colKey="petani" title="Petani" colWidths={colWidths} setColWidths={setColWidths} minWidth={80} sortField="petani" sortConfigs={sortConfigs} onSort={handleSort} />
                <ResizableHeader colKey="noBal" title="No Bal" colWidths={colWidths} setColWidths={setColWidths} align="center" minWidth={60} sortField="no_bal" sortConfigs={sortConfigs} onSort={handleSort} />
                <ResizableHeader colKey="kodeBeli" title="Kode Beli" colWidths={colWidths} setColWidths={setColWidths} align="center" minWidth={60} sortField="kode_beli" sortConfigs={sortConfigs} onSort={handleSort} />
                <ResizableHeader colKey="bruto" title="Bruto (kg)" colWidths={colWidths} setColWidths={setColWidths} align="right" minWidth={60} sortField="bruto" sortConfigs={sortConfigs} onSort={handleSort} />
                <ResizableHeader colKey="netto" title="Netto (kg)" colWidths={colWidths} setColWidths={setColWidths} align="right" minWidth={60} sortField="netto" sortConfigs={sortConfigs} onSort={handleSort} />
                <ResizableHeader colKey="potongan" title="Potongan" colWidths={colWidths} setColWidths={setColWidths} align="right" minWidth={70} sortField="potongan" sortConfigs={sortConfigs} onSort={handleSort} />
                <ResizableHeader colKey="totalHarga" title="Total Harga Beli" colWidths={colWidths} setColWidths={setColWidths} align="right" minWidth={80} sortField="total_harga" sortConfigs={sortConfigs} onSort={handleSort} />
                <ResizableHeader colKey="jumlahBayar" title="Jumlah Bayar" colWidths={colWidths} setColWidths={setColWidths} align="right" minWidth={90} className="bg-red-50/50 font-extrabold text-[#b81d24]" sortField="jumlah_bayar" sortConfigs={sortConfigs} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-500">
                    <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold">Tidak ada data transaksi yang cocok dengan filter aktif.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Coba ubah tanggal atau klik "Reset Filter" untuk menampilkan seluruh transaksi.</p>
                  </td>
                </tr>
              ) : (
                sortedData.map((row, idx) => {
                  const bruto = row.jenis_timbang === 'bruto' ? (row.berat_terukur_kg || row.berat_kg + 2) : 0;
                  const netto = row.berat_kg || 0;
                  const hrgBeli = row.harga_per_kg || 0;
                  const totalPotonganRow = row.total_potongan || 7000;
                  const totalHargaBeliRow = row.total_harga_beli || (netto * hrgBeli);
                  const jumlahBayarRow = row.harga_final || (totalHargaBeliRow - totalPotonganRow);
                  const tglDisplay = formatDateHariBulanTahun(row.tanggal_transaksi);

                  return (
                    <tr 
                      key={row.transaksi_id || idx}
                      className={`transition-colors hover:bg-amber-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}
                    >
                      {/* 1. No */}
                      <td className="py-2 px-2 text-center text-gray-500 font-mono text-[11px] border-r border-gray-100 truncate" style={{ maxWidth: colWidths.no }}>
                        <div className="truncate">{idx + 1}</div>
                      </td>

                      {/* 2. Tanggal (YYYY-MM-DD) */}
                      <td className="py-2 px-2.5 text-gray-700 font-mono text-[11px] border-r border-gray-100 truncate" style={{ maxWidth: colWidths.tanggal }}>
                        <div className="truncate">{tglDisplay}</div>
                      </td>

                      {/* 3. Kupon (Full 1 row, never truncated) */}
                      <td className="py-2 px-2.5 font-mono text-gray-900 font-bold border-r border-gray-100 truncate" style={{ maxWidth: colWidths.kupon }}>
                        <div className="truncate">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] whitespace-nowrap font-mono font-bold text-[#b81d24]">
                            {row.no_kupon || '-'}
                          </span>
                        </div>
                      </td>

                      {/* 4. Petani */}
                      <td 
                        className="py-2 px-3 text-gray-900 font-medium border-r border-gray-100 truncate"
                        style={{ maxWidth: colWidths.petani }}
                        title={`${row.nama_petani} - ${row.petani_id || ''}`}
                      >
                        <div className="font-semibold text-gray-800 leading-tight truncate">{row.nama_petani}</div>
                        <div className="text-[10px] text-gray-400 font-mono leading-none mt-0.5 truncate">{row.petani_id}</div>
                      </td>

                      {/* 5. No Ball */}
                      <td className="py-2 px-2.5 text-center font-mono font-semibold text-gray-800 border-r border-gray-100" style={{ maxWidth: colWidths.noBal }}>
                        <div className="break-words whitespace-normal leading-tight">{(row.items && row.items.length > 0) ? row.items.map(it => it.no_bal || it.barcode || it.sample_label_code).filter(Boolean).join(', ') : (row.no_bal || '-')}</div>
                      </td>

                      {/* 6. Kode Beli */}
                      <td className="py-2 px-2 text-center border-r border-gray-100 truncate" style={{ maxWidth: colWidths.kodeBeli }}>
                        <div className="truncate">
                        {(() => {
                          const rowGrades = getTransactionUniqueGrades(row);
                          if (rowGrades.length === 0) {
                            return (
                              <span className="text-gray-400 font-mono text-[10px]">-</span>
                            );
                          }
                          return (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {rowGrades.map((g) => (
                                <span
                                  key={g}
                                  className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-xs ${
                                    g === 'A' ? 'bg-zinc-900 text-white' :
                                    g === 'B' ? 'bg-zinc-800 text-zinc-100' :
                                    g === 'C' ? 'bg-blue-100 text-blue-900 font-bold' :
                                    g === 'D' ? 'bg-purple-100 text-purple-900 font-bold' :
                                    g === 'E' ? 'bg-gray-200 text-gray-800 font-bold' :
                                    'bg-red-100 text-red-900 font-bold'
                                  }`}
                                  title={`Kode Beli ${g}`}
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                        </div>
                      </td>

                      {/* 7. Bruto */}
                      <td className="py-2 px-2.5 text-right font-mono text-gray-700 border-r border-gray-100 truncate" style={{ maxWidth: colWidths.bruto }}>
                        <div className="truncate">{bruto > 0 ? bruto.toFixed(1) : '-'}</div>
                      </td>

                      {/* 8. Netto */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-900 border-r border-gray-100 bg-blue-50/20 truncate" style={{ maxWidth: colWidths.netto }}>
                        <div className="truncate">{netto.toFixed(1)}</div>
                      </td>

                      {/* 9. Potongan */}
                      <td className="py-2 px-2.5 text-right font-mono text-amber-800 border-r border-gray-100 truncate" style={{ maxWidth: colWidths.potongan }}>
                        <div className="truncate">{Math.round(totalPotonganRow).toLocaleString('id-ID')}</div>
                      </td>

                      {/* 10. Total Harga Beli */}
                      <td className="py-2 px-3 text-right font-mono font-semibold text-gray-900 border-r border-gray-100 truncate" style={{ maxWidth: colWidths.totalHarga }}>
                        <div className="truncate">{Math.round(totalHargaBeliRow).toLocaleString('id-ID')}</div>
                      </td>

                      {/* 11. Jumlah Bayar */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#b81d24] bg-red-50/30 truncate" style={{ maxWidth: colWidths.jumlahBayar }}>
                        <div className="truncate">{Math.round(jumlahBayarRow).toLocaleString('id-ID')}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Totals  */}
            {sortedData.length > 0 && (
              <tfoot className="bg-gray-100 text-gray-900 font-bold border-t-2 border-gray-300">
                {/* Baris Total Potongan Out */}
                <tr className="bg-amber-50/70 border-b border-amber-200/60 text-[11px]">
                  <td colSpan={8} className="py-2 px-3 text-right font-semibold text-amber-900 border-r border-gray-300 whitespace-nowrap">
                    Total Potongan Kuli Operasional (Rp 7.000 × {totals.totalBal} bal):
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-amber-900 font-bold border-r border-gray-300 whitespace-nowrap">
                    Rp {Math.round(totals.totalPotonganKuli).toLocaleString('id-ID')}
                  </td>
                  <td colSpan={2} className="py-2 px-3 bg-gray-50/30 border-b border-gray-200"></td>
                </tr>

                {/* Baris Total Potongan Ganti Tikar */}
                <tr className="bg-amber-50/70 border-b border-amber-200/60 text-[11px]">
                  <td colSpan={8} className="py-2 px-3 text-right font-semibold text-amber-900 border-r border-gray-300 whitespace-nowrap">
                    Total Potongan Ganti Tikar:
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-amber-900 font-bold border-r border-gray-300 whitespace-nowrap">
                    Rp {Math.round(totals.totalPotonganTikar).toLocaleString('id-ID')}
                  </td>
                  <td colSpan={2} className="py-2 px-3 bg-gray-50/30 border-b border-gray-200"></td>
                </tr>

                {/* Baris Total Akumulasi Utama */}
                <tr className="bg-slate-200/90 text-gray-950 font-extrabold text-xs">
                  <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider border-r border-gray-300 bg-gray-200/80 whitespace-nowrap">
                    TOTAL KESELURUHAN ({totals.totalBal} BAL):
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono border-r border-gray-300 whitespace-nowrap bg-gray-100 font-bold text-gray-800">
                    {totals.totalBruto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-blue-950 border-r border-gray-300 whitespace-nowrap bg-blue-50/70 font-bold">
                    {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-amber-950 border-r border-gray-300 whitespace-nowrap bg-amber-50/70 font-bold">
                    Rp {Math.round(totals.totalPotonganAll).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono border-r border-gray-300 whitespace-nowrap bg-gray-100 font-bold text-gray-900">
                    Rp {Math.round(totals.totalNilaiHargaBeli).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#b81d24] bg-red-100 font-black text-sm whitespace-nowrap border-l border-red-200">
                    Rp {Math.round(totals.totalJumlahBayar).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
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

      {/* Hidden Container for Direct PDF Export */}
      <div className="hidden">
        <div 
          ref={printReportRef} 
          id="printable-laporan-pembelian"
          className="w-full max-w-5xl bg-white p-6 text-gray-900 font-sans text-xs space-y-4"
        >
          {/* Kop Surat PR. Sekar Maju Sejahtera */}
          <div className="text-center border-b-2 border-gray-900 pb-3 mb-4">
            <h2 className="text-lg font-black tracking-widest uppercase text-gray-950">
              PR. SEKAR MAJU SEJAHTERA
            </h2>
            <p className="text-[11px] text-gray-600 tracking-wide font-medium">
              SISTEM DATA GUDANG & PENGADAAN TEMBAKAU RAJANGAN
            </p>
            <p className="text-[10px] text-gray-500">
              Jl. Raya Sentol Pamekasan - Madura | Telp: (0324) 321888 | Email: gudang@sekarmajusejahtera.co.id
            </p>
          </div>

          {/* Title & Metadata Filter */}
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-center text-gray-900 underline">
              LAPORAN REKAPITULASI PEMBELIAN BARANG
            </h3>
            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] bg-gray-50 p-2 border border-gray-200">
              <div>
                <span className="font-semibold text-gray-600">Periode Tanggal:</span>{' '}
                <span>
                  {appliedFilters.startDate || 'Awal'} s/d {appliedFilters.endDate || 'Sekarang'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Filter Kode Beli:</span>{' '}
                <span>{appliedFilters.grade === 'ALL' ? 'Semua Kode Beli' : `Kode Beli ${appliedFilters.grade}`}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Kupon:</span>{' '}
                <span>{appliedFilters.kupon === 'ALL' ? 'Semua Kupon' : appliedFilters.kupon}</span>
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
                <th className="p-1 border border-gray-300 text-center">No</th>
                <th className="p-1 border border-gray-300">Tanggal</th>
                <th className="p-1 border border-gray-300">Kupon</th>
                <th className="p-1 border border-gray-300">Petani</th>
                <th className="p-1 border border-gray-300 text-center">No Bal</th>
                <th className="p-1 border border-gray-300 text-center">Kode Beli</th>
                <th className="p-1 border border-gray-300 text-right">Bruto (kg)</th>
                <th className="p-1 border border-gray-300 text-right">Netto (kg)</th>
                <th className="p-1 border border-gray-300 text-right">Potongan (Rp)</th>
                <th className="p-1 border border-gray-300 text-right">Total Harga</th>
                <th className="p-1 border border-gray-300 text-right font-bold">Jumlah Bayar</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, idx) => {
                const bruto = row.jenis_timbang === 'bruto' ? (row.berat_terukur_kg || row.berat_kg + 2) : 0;
                const netto = row.berat_kg || 0;
                const hrgBeli = row.harga_per_kg || 0;
                const totalPotonganRow = row.total_potongan || 7000;
                const totalHargaBeliRow = row.total_harga_beli || (netto * hrgBeli);
                const jumlahBayarRow = row.harga_final || (totalHargaBeliRow - totalPotonganRow);
                const tglDisplay = formatDateHariBulanTahun(row.tanggal_transaksi);

                return (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                    <td className="p-1 border border-gray-300 font-mono">{tglDisplay}</td>
                    <td className="p-1 border border-gray-300 font-mono">{row.no_kupon || '-'}</td>
                    <td className="p-1 border border-gray-300 font-medium">{row.nama_petani}</td>
                    <td className="p-1 border border-gray-300 text-center font-mono max-w-[150px] break-words whitespace-normal">{(row.items && row.items.length > 0) ? row.items.map(it => it.no_bal || it.barcode || it.sample_label_code).filter(Boolean).join(', ') : (row.no_bal || '-')}</td>
                    <td className="p-1 border border-gray-300 text-center font-bold">
                      {(() => {
                        const rowGrades = getTransactionUniqueGrades(row);
                        return rowGrades.length > 0 ? rowGrades.join(', ') : (row.kode_grade || '-');
                      })()}
                    </td>
                    <td className="p-1 border border-gray-300 text-right font-mono">{bruto > 0 ? bruto.toFixed(1) : '-'}</td>
                    <td className="p-1 border border-gray-300 text-right font-mono font-semibold">{netto.toFixed(1)}</td>
                    <td className="p-1 border border-gray-300 text-right font-mono">{Math.round(totalPotonganRow).toLocaleString('id-ID')}</td>
                    <td className="p-1 border border-gray-300 text-right font-mono">{Math.round(totalHargaBeliRow).toLocaleString('id-ID')}</td>
                    <td className="p-1 border border-gray-300 text-right font-mono font-bold text-gray-950">
                      {Math.round(jumlahBayarRow).toLocaleString('id-ID')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan={6} className="p-1.5 border border-gray-300 text-right">TOTAL KESELURUHAN ({totals.totalBal} BAL):</td>
                <td className="p-1.5 border border-gray-300 text-right font-mono">{totals.totalBruto.toFixed(1)} kg</td>
                <td className="p-1.5 border border-gray-300 text-right font-mono">{totals.totalNetto.toFixed(1)} kg</td>
                <td className="p-1.5 border border-gray-300 text-right font-mono">Rp {Math.round(totals.totalPotonganAll).toLocaleString('id-ID')}</td>
                <td className="p-1.5 border border-gray-300 text-right font-mono">Rp {Math.round(totals.totalNilaiHargaBeli).toLocaleString('id-ID')}</td>
                <td className="p-1.5 border border-gray-300 text-right font-mono text-black font-black">
                  Rp {Math.round(totals.totalJumlahBayar).toLocaleString('id-ID')}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Sub-Ringkasan Grade di Dokumen Cetak */}
          {gradeSummary.length > 0 && (
            <div className="mt-4 pt-2">
              <h4 className="text-[11px] font-bold uppercase text-gray-900 mb-1.5 pb-1 border-b border-gray-400">
                SUB-RINGKASAN TOTAL BERAT & NILAI BERDASARKAN KODE BELI (GRADE)
              </h4>
              <table className="w-full text-left border-collapse border border-gray-300 text-[9px] mb-3">
                <thead>
                  <tr className="bg-gray-100 font-bold border-b border-gray-300">
                    <th className="p-1 border border-gray-300 text-center w-8">No</th>
                    <th className="p-1 border border-gray-300">Kode Beli (Grade)</th>
                    <th className="p-1 border border-gray-300 text-center">Jumlah Bal</th>
                    <th className="p-1 border border-gray-300 text-right">Bruto (kg)</th>
                    <th className="p-1 border border-gray-300 text-right">Netto (kg)</th>
                    <th className="p-1 border border-gray-300 text-right">Rata-rata (kg/bal)</th>
                    <th className="p-1 border border-gray-300 text-center">% Tonase</th>
                    <th className="p-1 border border-gray-300 text-right">Potongan (Rp)</th>
                    <th className="p-1 border border-gray-300 text-right">Subtotal (Rp)</th>
                    <th className="p-1 border border-gray-300 text-right font-bold">Jumlah Bayar (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeSummary.map((gs, idx) => {
                    const pct = totals.totalNetto > 0 ? ((gs.totalNetto / totals.totalNetto) * 100).toFixed(1) : '0';
                    const avg = gs.totalBal > 0 ? (gs.totalNetto / gs.totalBal).toFixed(1) : '0';
                    return (
                      <tr key={gs.grade} className="border-b border-gray-200">
                        <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                        <td className="p-1 border border-gray-300 font-bold">Grade {gs.grade}</td>
                        <td className="p-1 border border-gray-300 text-center font-mono">{gs.totalBal} Bal</td>
                        <td className="p-1 border border-gray-300 text-right font-mono">{gs.totalBruto.toFixed(1)}</td>
                        <td className="p-1 border border-gray-300 text-right font-mono font-bold">{gs.totalNetto.toFixed(1)}</td>
                        <td className="p-1 border border-gray-300 text-right font-mono">{avg}</td>
                        <td className="p-1 border border-gray-300 text-center font-mono">{pct}%</td>
                        <td className="p-1 border border-gray-300 text-right font-mono">{Math.round(gs.totalPotongan).toLocaleString('id-ID')}</td>
                        <td className="p-1 border border-gray-300 text-right font-mono">{Math.round(gs.totalNilaiHargaBeli).toLocaleString('id-ID')}</td>
                        <td className="p-1 border border-gray-300 text-right font-mono font-bold">{Math.round(gs.totalJumlahBayar).toLocaleString('id-ID')}</td>
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
              <p className="text-gray-600">Operator Loket Timbang</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-gray-900">Siti Rahayu</p>
            </div>
            <div>
              <p className="text-gray-600">Petugas QC & Mutu</p>
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

  </div>
);
};

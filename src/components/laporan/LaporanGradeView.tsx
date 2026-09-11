import { formatDateHariBulanTahun } from '../../utils/formatters';
import React, { useState, useMemo, useRef } from 'react';
import { 
  Award, 
  Search, 
  RotateCcw, 
  Download, 
  Calendar, 
  Tag, 
  Package, 
  Filter, 
  TrendingUp, 
  Layers, 
  Warehouse, 
  DollarSign, 
  Scale, 
  Truck, 
  FlaskConical, 
  CheckCircle2, 
  X,
  FileSpreadsheet,
  BarChart3,
  Percent,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  TabelHarga, 
  MasterHargaJual,
  Barang, 
  TransaksiPembelian, 
  PengirimanBarang, 
  PengirimanSample, 
  Gudang, 
  UserRole 
} from '../../types';
import { downloadCsvFile, downloadElementAsPdf } from '../../utils/printDownload';
import { Pagination } from '../common/Pagination';

// Uniform Black (Hitam) for grade metrics
export const GRADE_PALETTE = [
  { name: 'Hitam', bg: 'bg-zinc-900', text: 'text-zinc-900', border: 'border-zinc-900', hex: '#18181b', badgeBg: 'bg-zinc-900 text-white', lightBg: 'bg-zinc-100 text-zinc-900 border-zinc-300' },
];

export function getGradePalette(_index?: number) {
  return { name: 'Hitam', bg: 'bg-zinc-900', text: 'text-zinc-900', border: 'border-zinc-900', hex: '#18181b', badgeBg: 'bg-zinc-900 text-white', lightBg: 'bg-zinc-100 text-zinc-900 border-zinc-300' };
}

interface LaporanGradeViewProps {
  hargaList: TabelHarga[];
  hargaJualList?: MasterHargaJual[];
  barangList: Barang[];
  transaksiList: TransaksiPembelian[];
  pengirimanList: PengirimanBarang[];
  sampleList: PengirimanSample[];
  gudangList?: Gudang[];
  userRole?: UserRole;
  initialTab?: 'beli' | 'jual';
  onNavigateToHarga?: () => void;
  onNavigateToHargaJual?: () => void;
  onNavigateToBarang?: () => void;
}

export const LaporanGradeView: React.FC<LaporanGradeViewProps> = ({
  hargaList = [],
  hargaJualList = [],
  barangList = [],
  transaksiList = [],
  pengirimanList = [],
  sampleList = [],
  gudangList = [],
  userRole = 'superadmin',
  initialTab = 'beli',
  onNavigateToHarga,
  onNavigateToHargaJual,
  onNavigateToBarang,
}) => {
  const [activeTab, setActiveTab] = useState<'beli' | 'jual'>(initialTab);

  // Harga Jual States & Logic
  const [showSummaryCardsJual, setShowSummaryCardsJual] = useState<boolean>(true);
  const [searchTermJual, setSearchTermJual] = useState<string>('');
  const [filterStatusJual, setFilterStatusJual] = useState<string>('ALL');
  const [currentPageJual, setCurrentPageJual] = useState<number>(1);
  const [itemsPerPageJual, setItemsPerPageJual] = useState<number>(15);
  const printJualRef = useRef<HTMLDivElement>(null);
  const [isGeneratingJualPdf, setIsGeneratingJualPdf] = useState<boolean>(false);

  const filteredHargaJualList = useMemo(() => {
    return (hargaJualList || []).filter((item) => {
      if (filterStatusJual !== 'ALL') {
        const isAktif = filterStatusJual === 'aktif';
        if (item.status_aktif !== isAktif) return false;
      }
      if (searchTermJual) {
        const q = searchTermJual.toLowerCase();
        if (
          !item.kode.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.tanggal_berlaku).getTime() - new Date(a.tanggal_berlaku).getTime());
  }, [hargaJualList, searchTermJual, filterStatusJual]);

  const totalPagesJual = Math.ceil(filteredHargaJualList.length / itemsPerPageJual) || 1;
  const paginatedHargaJualList = useMemo(() => {
    const start = (currentPageJual - 1) * itemsPerPageJual;
    return filteredHargaJualList.slice(start, start + itemsPerPageJual);
  }, [filteredHargaJualList, currentPageJual]);

  const handleExportJualCSV = () => {
    const filename = `Laporan_Master_Harga_Jual_${new Date().toISOString().split('T')[0]}.csv`;
    const headers = ['Kode', 'Harga Jual (Rp)', 'Tanggal Berlaku', 'Status'];
    const rows = filteredHargaJualList.map(h => [
      h.kode,
      h.harga_jual,
      h.tanggal_berlaku,
      h.status_aktif ? 'Aktif' : 'Non-Aktif',
    ]);
    downloadCsvFile(filename, headers, rows);
  };

  const handleExportJualPDF = async () => {
    if (!printJualRef.current) return;
    setIsGeneratingJualPdf(true);
    try {
      await downloadElementAsPdf(printJualRef.current, `Laporan_Harga_Jual_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setIsGeneratingJualPdf(false);
    }
  };

  const summaryJual = useMemo(() => {
    const list = hargaJualList || [];
    const activeCount = list.filter(h => h.status_aktif).length;
    const inactiveCount = list.length - activeCount;
    return {
      total: list.length,
      active: activeCount,
      inactive: inactiveCount,
    };
  }, [hargaJualList]);
  // Filter States
  const [showSummaryCardsBeli, setShowSummaryCardsBeli] = useState<boolean>(true);
  const [showMatriksBeli, setShowMatriksBeli] = useState<boolean>(false);
  const [showMatriksJual, setShowMatriksJual] = useState<boolean>(false);
  const [selectedGradeCode, setSelectedGradeCode] = useState<string>('');
  const [filterGudang, setFilterGudang] = useState<string>('ALL');
  const [filterStatusStok, setFilterStatusStok] = useState<string>('ALL');
  const [searchBalQuery, setSearchBalQuery] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const printDocumentRef = useRef<HTMLDivElement>(null);

  // 1. DYNAMIC GRADE LIST
  // Extract all distinct valid grades from hargaList + barangList
  // Note: Multi Grade is strictly an indicator for multi-item purchases, NEVER a grade itself.
  const uniqueGrades = useMemo(() => {
    const gradeMap = new Map<string, { code: string; name: string; price: number; status: string;  }>();

    // 1. First add from Master Harga (preserves creation order & active pricing)
    hargaList.forEach((h) => {
      const code = (h.kode_grade || '').trim().toUpperCase();
      if (code && !code.includes('MULTI') && code !== 'MULTI-GRADE') {
        if (!gradeMap.has(code)) {
          gradeMap.set(code, {
            code,
            name: h.nama_grade || `Grade ${code}`,
            price: h.harga_per_kg || 0,
            status: h.status || 'aktif',
            
          });
        }
      }
    });

    // 2. Scan barangList for any bal that might have a custom registered grade
    barangList.forEach((b) => {
      const code = (b.kode_grade || '').trim().toUpperCase();
      if (code && !code.includes('MULTI') && code !== 'MULTI-GRADE') {
        if (!gradeMap.has(code)) {
          gradeMap.set(code, {
            code,
            name: `Grade ${code}`,
            price: 0,
            status: 'aktif',
            
          });
        }
      }
    });

    // Fallback if empty
    if (gradeMap.size === 0) {
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((g) => {
        gradeMap.set(g, {
          code: g,
          name: `Grade ${g}`,
          price: 100000,
          status: 'aktif',
          
        });
      });
    }

    return Array.from(gradeMap.values());
  }, [hargaList, barangList]);

  // 2. PER-GRADE METRICS CALCULATION
  const gradeMetrics = useMemo(() => {
    // Find which pengirimans are NOT completed (still loading/in transit)
    const activePengirimanIds = new Set(
      pengirimanList
        .filter(p => p.status !== 'diterima' && p.status !== 'selesai')
        .map(p => p.pengiriman_id)
    );

    // Total active bal in warehouse + in transit
    const activeBal = barangList.filter((b) => {
      if (b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim' || b.status_stok === 'terkirim_sample') return true;
      if (b.status_stok === 'keluar' && b.pengiriman_id && activePengirimanIds.has(b.pengiriman_id)) return true;
      return false;
    });
    const totalActiveBalCount = activeBal.length || 1;
    const totalActiveBalKg = activeBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0) || 1;

    const metrics = uniqueGrades.map((g, idx) => {
      const color = getGradePalette(idx);

      // Active in Warehouse
      const inGudangBal = activeBal.filter((b) => b.kode_grade.toUpperCase() === g.code);
      const stokBal = inGudangBal.length;
      const stokKg = inGudangBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
      const persenStokBal = (stokBal / totalActiveBalCount) * 100;
      const persenStokKg = (stokKg / totalActiveBalKg) * 100;
      
      // Calculate valuasi using actual buy price if available, fallback to grade price
      const valuasiRupiah = inGudangBal.reduce((sum, b) => sum + (b.total_harga || ((b.berat_kg || 0) * (b.harga_per_kg || g.price))), 0);

      // Inbound / Intake (From Transaksi)
      // Note: If transaction has items, count items with this grade. If single bal transaction without items, check t.kode_grade.
      let intakeBal = 0;
      let intakeKg = 0;
      let intakeNilai = 0;

      transaksiList.forEach((t) => {
        if (t.items && t.items.length > 0) {
          t.items.forEach((item) => {
            if ((item.kode_grade || '').toUpperCase() === g.code) {
              intakeBal += 1;
              intakeKg += Number(item.berat_kg || 0);
              intakeNilai += Number(item.subtotal_bersih || 0);
            }
          });
        } else if ((t.kode_grade || '').toUpperCase() === g.code) {
          const balInTx = t.total_bal || (t.barang_ids && t.barang_ids.length) || 1;
          intakeBal += balInTx;
          intakeKg += (t.berat_kg || 0);
          intakeNilai += (t.harga_final || t.total_harga_beli || 0);
        }
      });

      // Outbound / DO (From Pengiriman)
      let doBal = 0;
      let doKg = 0;
      pengirimanList.forEach((p) => {
        if (p.rincian_grade && p.rincian_grade[g.code]) {
          doBal += p.rincian_grade[g.code].bal || 0;
          doKg += p.rincian_grade[g.code].kg || 0;
        } else {
          // Check matching bal in barangList that are marked 'keluar'
          const shippedBal = barangList.filter(
            (b) => b.pengiriman_id === p.pengiriman_id && b.kode_grade.toUpperCase() === g.code
          );
          if (shippedBal.length > 0) {
            doBal += shippedBal.length;
            doKg += shippedBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
          }
        }
      });

      // QC Samples
      const samples = sampleList.filter((s) => (s.kode_grade || '').toUpperCase() === g.code);
      const totalSampleCount = samples.length;
      const approvedSampleCount = samples.filter((s) => s.status === 'disetujui' || s.status === 'diterima').length;

      return {
        ...g,
        color,
        index: idx,
        stokBal,
        stokKg,
        persenStokBal,
        persenStokKg,
        valuasiRupiah,
        intakeBal,
        intakeKg,
        intakeNilai,
        doBal,
        doKg,
        totalSampleCount,
        approvedSampleCount,
      };
    });

    // Urut berdasarkan dengan jumlah bal aktif terbanyak (stokBal descending)
    return metrics.sort((a, b) => {
      if (b.stokBal !== a.stokBal) {
        return b.stokBal - a.stokBal;
      }
      return b.stokKg - a.stokKg;
    });
  }, [uniqueGrades, barangList, transaksiList, pengirimanList, sampleList]);

  // Overall Totals
  const overallSummary = useMemo(() => {
    const totalStokBal = gradeMetrics.reduce((sum, m) => sum + m.stokBal, 0);
    const totalStokKg = gradeMetrics.reduce((sum, m) => sum + m.stokKg, 0);
    const totalValuasi = gradeMetrics.reduce((sum, m) => sum + m.valuasiRupiah, 0);
    const totalIntakeKg = gradeMetrics.reduce((sum, m) => sum + m.intakeKg, 0);
    const totalDoKg = gradeMetrics.reduce((sum, m) => sum + m.doKg, 0);

    // Dominant Grade
    const sortedByStok = [...gradeMetrics].sort((a, b) => b.stokKg - a.stokKg);
    const dominantGrade = sortedByStok[0] || null;

    return {
      totalGradeCount: uniqueGrades.length,
      totalStokBal,
      totalStokKg,
      totalValuasi,
      totalIntakeKg,
      totalDoKg,
      dominantGrade,
    };
  }, [gradeMetrics, uniqueGrades]);

  // 3. FILTERED BAL INVENTORY FOR DETAIL INSPECTION
  const filteredBalList = useMemo(() => {
    return barangList.filter((b) => {
      // Grade filter
      if (selectedGradeCode && selectedGradeCode !== 'ALL' && b.kode_grade.toUpperCase() !== selectedGradeCode.toUpperCase()) {
        return false;
      }
      // Gudang filter
      if (filterGudang !== 'ALL') {
        const qGudang = filterGudang.toLowerCase();
        if (!b.lokasi_gudang || !b.lokasi_gudang.toLowerCase().includes(qGudang)) {
          return false;
        }
      }
      // Status Stok filter
      if (filterStatusStok !== 'ALL' && b.status_stok !== filterStatusStok) {
        return false;
      }
      // Search query (No Bal, Petani, Lokasi)
      if (searchBalQuery.trim()) {
        const q = searchBalQuery.toLowerCase().trim();
        const matchBalId = (b.barang_id || '').toLowerCase().includes(q);
        const matchNoBal = (b.no_bal || '').toLowerCase().includes(q);
        const matchPetani = (b.nama_petani || '').toLowerCase().includes(q);
        const matchLokasi = (b.lokasi_gudang || '').toLowerCase().includes(q);
        if (!matchBalId && !matchNoBal && !matchPetani && !matchLokasi) {
          return false;
        }
      }
      return true;
    });


  }, [barangList, selectedGradeCode, filterGudang, filterStatusStok, searchBalQuery]);
  const [selectedHargaJualCode, setSelectedHargaJualCode] = useState<string>('ALL');

  const hargaJualMetrics = useMemo(() => {
    const activeBal = barangList.filter((b) => b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim');
    const totalActiveBalCount = activeBal.length || 1;
    const totalActiveBalKg = activeBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0) || 1;

    const metrics = filteredHargaJualList.map((hj, idx) => {
      const color = getGradePalette(idx);

      const inGudangBal = activeBal.filter((b) => (b.kode_harga_jual || '').toUpperCase() === hj.kode.toUpperCase());
      const stokBal = inGudangBal.length;
      const stokKg = inGudangBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
      const persenStokBal = (stokBal / totalActiveBalCount) * 100;
      const persenStokKg = (stokKg / totalActiveBalKg) * 100;
      const valuasiRupiah = stokKg * hj.harga_jual;

      let intakeBal = 0;
      let intakeKg = 0;
      let intakeNilai = 0;

      // DO / Outbound
      let doBal = 0;
      let doKg = 0;
      pengirimanList.forEach((p) => {
        const shippedBal = barangList.filter(
          (b) => b.pengiriman_id === p.pengiriman_id && (b.kode_harga_jual || '').toUpperCase() === hj.kode.toUpperCase()
        );
        if (shippedBal.length > 0) {
          doBal += shippedBal.length;
          doKg += shippedBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
        }
      });

      // QC
      const totalSampleCount = 0;
      const approvedSampleCount = 0;

      return {
        ...hj,
        color,
        index: idx,
        stokBal,
        stokKg,
        persenStokBal,
        persenStokKg,
        valuasiRupiah,
        intakeBal,
        intakeKg,
        intakeNilai,
        doBal,
        doKg,
        totalSampleCount,
        approvedSampleCount,
      };
    });

    return metrics.sort((a, b) => b.stokBal - a.stokBal);
  }, [filteredHargaJualList, barangList, pengirimanList]);

  const overallSummaryJual = useMemo(() => {
    const totalStokBal = hargaJualMetrics.reduce((sum, m) => sum + m.stokBal, 0);
    const totalStokKg = hargaJualMetrics.reduce((sum, m) => sum + m.stokKg, 0);
    const totalValuasi = hargaJualMetrics.reduce((sum, m) => sum + m.valuasiRupiah, 0);
    const totalDoKg = hargaJualMetrics.reduce((sum, m) => sum + m.doKg, 0);

    const dominant = hargaJualMetrics.length > 0 && hargaJualMetrics[0].stokBal > 0 
      ? hargaJualMetrics[0] 
      : null;

    return {
      totalJualCount: filteredHargaJualList.length,
      totalStokBal,
      totalStokKg,
      totalValuasi,
      totalDoKg,
      dominantKode: dominant,
    };
  }, [hargaJualMetrics, filteredHargaJualList]);


  const totalPages = Math.ceil(filteredBalList.length / itemsPerPage) || 1;
  const paginatedBalList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBalList.slice(start, start + itemsPerPage);
  }, [filteredBalList, currentPage]);

  // DIRECT DOWNLOAD ACTIONS (No Print Option)
  const handleDownloadPdf = async () => {
    if (!printDocumentRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(
        printDocumentRef.current,
        `Laporan_Stok_Mutu_Grade_Tembakau_${new Date().toISOString().slice(0, 10)}.pdf`,
        { orientation: 'landscape' }
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    const headers = [
      'No',
      'Kode Grade',
      'Nama Grade & Mutu',
      'Tarif Acuan (Rp/kg)',
      'Stok Gudang (Bal)',
      'Stok Gudang (Kg)',
      'Porsi Stok (%)',
      'Valuasi Stok (Rp)',
      'Intake Masuk (Bal)',
      'Intake Masuk (Kg)',
      'DO Keluar (Bal)',
      'DO Keluar (Kg)',
      'Sampel QC (Total)',
      'Sampel QC Disetujui',
      'Status Tarif',
    ];

    const rows = gradeMetrics.map((m, idx) => [
      idx + 1,
      m.code,
      m.name,
      m.price,
      m.stokBal,
      m.stokKg,
      m.persenStokKg.toFixed(1) + '%',
      m.valuasiRupiah,
      m.intakeBal,
      m.intakeKg,
      m.doBal,
      m.doKg,
      m.totalSampleCount,
      m.approvedSampleCount,
      m.status,
    ]);

    downloadCsvFile('Laporan_Rekap_Stok_Grade_Tembakau', headers, rows);
  };

  const handleDownloadBalDetailCsv = () => {
    const headers = [
      'No',
      'ID Bal',
      'No Bal',
      'Grade',
      'Berat Netto (kg)',
      'Estimasi Nilai (Rp)',
      'Status Stok',
      'Lokasi Simpan',
      'Nama Petani',
      'Tanggal Masuk',
      'Catatan',
    ];

    const rows = filteredBalList.map((b, idx) => {
      const gMetric = gradeMetrics.find((m) => m.code === b.kode_grade.toUpperCase());
      const estPrice = gMetric ? gMetric.price * b.berat_kg : 0;
      return [
        idx + 1,
        b.barang_id,
        b.no_bal,
        b.kode_grade,
        b.berat_kg,
        estPrice,
        b.status_stok,
        b.lokasi_gudang,
        b.nama_petani || '-',
        b.tanggal_masuk,
        b.catatan || '-',
      ];
    });

    downloadCsvFile(`Detail_Inventaris_Bal_Grade_${selectedGradeCode}`, headers, rows);
  };

  const contentJual = (
    <div className="space-y-4">
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-900 rounded-none flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5 text-emerald-400" />
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
              Laporan Stok & Analisis Mutu Jual
            </h1>
          </div>
        </div>

        {/* Action Direct Download Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportJualCSV}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="Download file spreadsheet Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Download CSV / Excel</span>
          </button>
          <button
            onClick={handleExportJualPDF}
            disabled={isGeneratingJualPdf}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Download dokumen laporan dalam format PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingJualPdf ? 'Membuat PDF...' : 'Download Laporan (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: Total Kode Terdaftar */}
        <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Kode Harga Jual
            </span>
            <span className="p-1.5 bg-red-50 text-[#b81d24] rounded-sm">
              <Tag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            {overallSummaryJual.totalJualCount} <span className="text-xs font-normal text-gray-500">Kode Harga</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Kode Dominan:</span>
            <span className="font-semibold text-gray-800">
              {overallSummaryJual.dominantKode ? `Kode ${overallSummaryJual.dominantKode.kode} (${overallSummaryJual.dominantKode.persenStokKg.toFixed(1)}%)` : '-'}
            </span>
          </div>
        </div>

        {/* Card 2: Stok Tersimpan di Gudang */}
        <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Stok Aktif Fisik Bal
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded-sm">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-950 mt-2">
            {overallSummaryJual.totalStokBal} <span className="text-xs font-normal text-gray-500">Bal ({overallSummaryJual.totalStokKg.toLocaleString('id-ID')} kg)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Tonase Total:</span>
            <span className="font-semibold text-emerald-900">{(overallSummaryJual.totalStokKg / 1000).toFixed(2)} Ton</span>
          </div>
        </div>

        {/* Card 3: Valuasi Aset Inventaris */}
        <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Valuasi Aset (Stok di Gudang)
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-800 rounded-sm">
              <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4">Rp</span>
            </span>
          </div>
          <div className="text-xl font-bold text-blue-950 mt-2">
            Rp {overallSummaryJual.totalValuasi.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Dihitung dari tarif acuan aktif</span>
            <span className="font-semibold text-blue-800">{overallSummaryJual.totalJualCount} Grade</span>
          </div>
        </div>

        {/* Card 4: Arus Masuk vs DO */}
        <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Perputaran Intake & DO
            </span>
            <span className="p-1.5 bg-purple-50 text-purple-800 rounded-sm">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-purple-950 mt-2">
            {(overallSummaryJual.totalDoKg / 1000).toFixed(1)} <span className="text-xs font-normal text-gray-500">Ton Intake</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Terkirim ke Pabrik:</span>
            <span className="font-semibold text-purple-900">{(overallSummaryJual.totalDoKg / 1000).toFixed(1)} Ton</span>
          </div>
        </div>

      </div>

      {/* Main Kode Matrix & Color Visual Breakdown */}
      <div className="bg-white border border-gray-200 shadow-xs p-4 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => setShowMatriksJual(!showMatriksJual)}
          >
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
              <span>Matriks Distribusi & Rekapitulasi per Mutu Grade</span>
              {showMatriksJual ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-gray-400" />}
              <span className="px-2 py-0.5 text-[10px] bg-red-50 text-[#b81d24] font-bold border border-red-200">
                Pembaruan Real-Time
              </span>
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Urutan berdasarkan jumlah inventaris bal aktif terbanyak di seluruh fasilitas gudang.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {onNavigateToHargaJual && (
    <button
      onClick={onNavigateToHargaJual}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Harga Jual</span>
    </button>
  )}
          </div>
        </div>

        {showMatriksJual && (
          <>
        {/* Quick Filter Kode Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-gray-500 font-medium">Filter Tampilan Kode:</span>
          <button
            onClick={() => setSelectedHargaJualCode('ALL')}
            className={`px-2.5 py-1 border text-xs cursor-pointer transition rounded-sm ${
              selectedHargaJualCode === 'ALL'
                ? 'bg-gray-900 text-white font-bold border-gray-900 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Semua Kode ({hargaJualMetrics.length})
          </button>
          {hargaJualMetrics.map((m) => (
            <button
              key={m.code}
              onClick={() => setSelectedGradeCode(selectedGradeCode === m.code ? 'ALL' : m.code)}
              className={`px-2.5 py-1 border text-xs cursor-pointer transition rounded-sm ${
                selectedGradeCode === m.code
                  ? 'bg-gray-900 text-white font-bold border-gray-900 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Grade {m.code}</span>
              <span className={`ml-1 text-[10px] ${selectedGradeCode === m.code ? 'text-gray-300' : 'text-gray-500'}`}>
                ({m.stokBal} Bal)
              </span>
            </button>
          ))}
        </div>

        {/* Master Grade Table Matrix */}
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 text-[10px] uppercase">
                <th className="py-2.5 px-3 text-center w-12">Grade</th>
                <th className="py-2.5 px-3">Nama Mutu & Kualitas</th>
                <th className="py-2.5 px-3 text-right">Tarif Acuan</th>
                <th className="py-2.5 px-3 text-center bg-emerald-50/50">Stok Bal</th>
                <th className="py-2.5 px-3 text-right bg-emerald-50/50">Stok (Kg)</th>
                <th className="py-2.5 px-3 text-center">% Porsi</th>
                <th className="py-2.5 px-3 text-right">Valuasi Stok (Rp)</th>
                <th className="py-2.5 px-3 text-center bg-blue-50/40">Intake Masuk</th>
                <th className="py-2.5 px-3 text-center bg-purple-50/40">DO Keluar</th>
                <th className="py-2.5 px-3 text-center">QC Sample</th>
                <th className="py-2.5 px-3 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gradeMetrics.map((item) => {
                const isSelected = selectedGradeCode === item.code;
                return (
                  <tr 
                    key={item.code} 
                    className={`transition-colors ${isSelected ? 'bg-red-50/40 font-medium' : 'hover:bg-gray-50/80'}`}
                  >
                    {/* Grade Badge with designated color */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 font-bold text-xs ${item.color.badgeBg} shadow-xs`}>
                        {item.code}
                      </span>
                    </td>

                    {/* Nama Mutu & Deskripsi */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-gray-900">{item.name}</div>
                      
                    </td>

                    {/* Tarif Acuan */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                      {item.price > 0 ? `Rp ${item.price.toLocaleString('id-ID')}` : '-'}
                      <span className="text-[10px] font-normal text-gray-500 block">/ kg</span>
                    </td>

                    {/* Stok Bal */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-950 bg-emerald-50/30">
                      {item.stokBal} Bal
                    </td>

                    {/* Stok Kg */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/30">
                      {item.stokKg.toLocaleString('id-ID')} kg
                    </td>

                    {/* % Porsi */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold ${item.color.lightBg}`}>
                        {item.persenStokKg.toFixed(1)}%
                      </span>
                    </td>

                    {/* Valuasi Stok */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#b81d24]">
                      Rp {item.valuasiRupiah.toLocaleString('id-ID')}
                    </td>

                    {/* Intake Masuk */}
                    <td className="py-2.5 px-3 text-center font-mono text-gray-700 bg-blue-50/20">
                      <div>{item.intakeBal} Bal</div>
                      <span className="text-[10px] text-blue-900 font-semibold">{item.intakeKg.toLocaleString('id-ID')} kg</span>
                    </td>

                    {/* DO Keluar */}
                    <td className="py-2.5 px-3 text-center font-mono text-gray-700 bg-purple-50/20">
                      <div>{item.doBal} Bal</div>
                      <span className="text-[10px] text-purple-900 font-semibold">{item.doKg.toLocaleString('id-ID')} kg</span>
                    </td>

                    {/* QC Sample */}
                    <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                      {item.totalSampleCount > 0 ? (
                        <span className="text-green-700 font-semibold">
                          {item.approvedSampleCount}/{item.totalSampleCount} ACC
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Aksi Filter */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedGradeCode(isSelected ? 'ALL' : item.code)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#b81d24] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? 'Terpilih' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 text-gray-900 font-bold border-t-2 border-gray-300 text-xs">
                <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider">
                  TOTAL KESELURUHAN INVENTARIS:
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-950 bg-emerald-100/50">
                  {overallSummary.totalStokBal} Bal
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-950 bg-emerald-100/50">
                  {overallSummary.totalStokKg.toLocaleString('id-ID')} kg
                </td>
                <td className="py-2.5 px-3 text-center">
                  100%
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#b81d24]">
                  Rp {overallSummary.totalValuasi.toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-blue-950 bg-blue-100/50">
                  {overallSummary.totalIntakeKg.toLocaleString('id-ID')} kg
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-purple-950 bg-purple-100/50">
                  {overallSummary.totalDoKg.toLocaleString('id-ID')} kg
                </td>
                <td colSpan={2}></td>
              </tr>
                        </tfoot>
          </table>
        </div>
        </>
        )}
      </div>

      {/* Deep-Dive Bal Inventory Explorer */}
      <div className="bg-white border border-gray-200 shadow-xs p-4 space-y-3">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
              <span>Eksplorasi Fisik Bal Inventaris</span>
              {selectedGradeCode !== 'ALL' && (
                <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-800 font-bold">
                  Khusus Grade {selectedGradeCode}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Daftar rincian bal tembakau dan lokasi blok rak penyimpanan
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadBalDetailCsv}
              className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Download Detail Bal (CSV)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls for Bal Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
          {/* Grade Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Filter Grade:</label>
            <input
              type="text"
              list="grade-list-filter"
              value={selectedGradeCode}
              onChange={(e) => {
                setSelectedGradeCode(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Ketik/Pilih Grade..."
              className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs rounded-none focus:border-gray-800 focus:outline-none font-semibold text-gray-800"
            />
            <datalist id="grade-list-filter">
              <option value="ALL">Semua Grade</option>
              {uniqueGrades.map((g) => (
                <option key={g.code} value={g.code}>
                  Grade {g.code} - {g.name}
                </option>
              ))}
            </datalist>
          </div>

          {/* Gudang Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Lokasi Gudang:</label>
            <select
              value={filterGudang}
              onChange={(e) => {
                setFilterGudang(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs rounded-none focus:border-gray-800 focus:outline-none text-gray-800"
            >
              <option value="ALL">Semua Gudang</option>
              {gudangList.map((gdg) => (
                <option key={gdg.gudang_id} value={gdg.nama_gudang}>
                  {gdg.nama_gudang}
                </option>
              ))}
            </select>
          </div>

          {/* Status Stok Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Status Stok:</label>
            <select
              value={filterStatusStok}
              onChange={(e) => {
                setFilterStatusStok(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs rounded-none focus:border-gray-800 focus:outline-none text-gray-800"
            >
              <option value="ALL">Semua Status ({barangList.length})</option>
              <option value="di_gudang">Di Gudang (Stok Aktif)</option>
              <option value="siap_kirim">Siap Kirim</option>
              <option value="keluar">Keluar / Terkirim Pabrik (DO)</option>
              <option value="terkirim_sample">Sample Lab QC</option>
            </select>
          </div>

          {/* Search Bal */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Cari No Bal / Petani:</label>
            <div className="relative">
              <input
                type="text"
                value={searchBalQuery}
                onChange={(e) => {
                  setSearchBalQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="No Bal, Petani, Lokasi..."
                className="w-full bg-white border border-gray-300 pl-7 pr-2 py-1.5 text-xs rounded-none focus:border-gray-800 focus:outline-none text-gray-800"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
            </div>
          </div>
        </div>

        {/* Bal Inventory Table */}
        <div className="overflow-x-auto border border-gray-200 mt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 text-[10px] uppercase">
                <th className="py-2 px-3 text-center w-10">No</th>
                <th className="py-2 px-3 w-32 whitespace-nowrap">ID Bal</th>
                <th className="py-2 px-3 w-28 whitespace-nowrap">No Bal</th>
                <th className="py-2 px-3 text-center">Grade</th>
                <th className="py-2 px-3 text-right">Berat (kg)</th>
                <th className="py-2 px-3 text-right">Estimasi Valuasi</th>
                <th className="py-2 px-3">Petani Penyetor</th>
                <th className="py-2 px-3">Lokasi Gudang</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3">Tgl Masuk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBalList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-gray-500 text-xs">
                    Tidak ditemukan data bal yang sesuai dengan filter grade ini.
                  </td>
                </tr>
              ) : (
                paginatedBalList.map((bal, idx) => {
                  const gMetric = gradeMetrics.find((m) => m.code === bal.kode_grade.toUpperCase());
                  const estPrice = gMetric ? gMetric.price * bal.berat_kg : 0;
                  const gColor = gMetric ? gMetric.color : GRADE_PALETTE[0];

                  return (
                    <tr key={bal.barang_id || idx} className="hover:bg-gray-50/80">
                      <td className="py-2 px-3 text-center font-mono text-gray-500 text-[11px]">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-gray-900 w-32 whitespace-nowrap">
                        {bal.barang_id}
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-800 w-28 whitespace-nowrap">
                        {bal.no_bal}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-5 h-5 font-bold text-[10px] ${gColor.badgeBg}`}>
                          {bal.kode_grade}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-950">
                        {bal.berat_kg} kg
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#b81d24] font-semibold">
                        Rp {estPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-gray-800 font-medium">
                        {bal.nama_petani || '-'}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">
                        {bal.lokasi_gudang}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-none ${
                          bal.status_stok === 'di_gudang' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                          bal.status_stok === 'siap_kirim' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
                          bal.status_stok === 'keluar' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                          'bg-purple-50 text-purple-800 border border-purple-300'
                        }`}>
                          {bal.status_stok === 'di_gudang' ? 'Di Gudang' :
                           bal.status_stok === 'siap_kirim' ? 'Siap Kirim' :
                           bal.status_stok === 'keluar' ? 'Keluar (DO)' : 'Sample Lab'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-[11px]">
                        {bal.tanggal_masuk ? bal.tanggal_masuk.split(' ')[0] : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredBalList.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>

      </div>

      {/* Hidden DOM for High-Fidelity PDF Generation */}
      <div className="hidden">
        <div ref={printJualRef} className="p-8 bg-white text-gray-900 font-sans text-xs space-y-6">
          {/* Header */}
          <div className="border-b-2 border-gray-900 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">PR. SEKAR MAJU SEJAHTERA</h1>
              <p className="text-xs font-semibold text-gray-600">SISTEM DATA GUDANG TEMBAKAU & LOGISTIK ERP</p>
              <p className="text-[10px] text-gray-500">Pusat Intake & Pengolahan Tembakau Madura - Pamekasan, Jawa Timur</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold uppercase text-[#b81d24]">LAPORAN MASTER HARGA JUAL & VALUASI STOK</h2>
              <p className="text-[10px] text-gray-600">Tanggal Ekspor: {formatDateHariBulanTahun(new Date().toISOString())}</p>
              <p className="text-[10px] text-gray-500">Total Mutu Terdaftar: {uniqueGrades.length} Grade</p>
            </div>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-4 gap-3 bg-gray-50 p-3 border border-gray-300 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 uppercase block">Total Mutu Grade:</span>
              <strong className="text-sm text-gray-900">{overallSummary.totalGradeCount} Grade</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase block">Total Fisik Stok:</span>
              <strong className="text-sm text-emerald-900">{overallSummary.totalStokBal} Bal ({overallSummary.totalStokKg.toLocaleString('id-ID')} kg)</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase block">Total Valuasi (Stok Gudang):</span>
              <strong className="text-sm text-[#b81d24]">Rp {overallSummary.totalValuasi.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase block">Total Intake / DO:</span>
              <strong className="text-sm text-blue-900">{(overallSummary.totalIntakeKg / 1000).toFixed(1)} T / {(overallSummary.totalDoKg / 1000).toFixed(1)} T</strong>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse border border-gray-300 text-[11px]">
            <thead>
              <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-300">
                <th className="py-2 px-2 border-r border-gray-300 text-center w-8">No</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center w-12">Grade</th>
                <th className="py-2 px-3 border-r border-gray-300">Nama Mutu Grade</th>
                <th className="py-2 px-3 border-r border-gray-300 text-right">Harga Beli (Rp/kg)</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">Stok (Bal)</th>
                <th className="py-2 px-3 border-r border-gray-300 text-right">Stok (Kg)</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">% Porsi</th>
                <th className="py-2 px-3 border-r border-gray-300 text-right">Valuasi Beli (Rp)</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">Intake (Kg)</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">DO Keluar (Kg)</th>
                <th className="py-2 px-2 text-center">QC Sample</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {gradeMetrics.map((m, idx) => (
                <tr key={m.code}>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{idx + 1}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-bold">{m.code}</td>
                  <td className="py-2 px-3 border-r border-gray-300 font-semibold">{m.name}</td>
                  <td className="py-2 px-3 border-r border-gray-300 text-right font-mono">Rp {m.price.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono font-bold">{m.stokBal}</td>
                  <td className="py-2 px-3 border-r border-gray-300 text-right font-mono">{m.stokKg.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-semibold">{m.persenStokKg.toFixed(1)}%</td>
                  <td className="py-2 px-3 border-r border-gray-300 text-right font-mono font-bold">Rp {m.valuasiRupiah.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{m.intakeKg.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{m.doKg.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 text-center font-mono">{m.approvedSampleCount}/{m.totalSampleCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                <td colSpan={4} className="py-2 px-3 text-right">TOTAL KESELURUHAN:</td>
                <td className="py-2 px-2 text-center font-mono">{overallSummary.totalStokBal} Bal</td>
                <td className="py-2 px-3 text-right font-mono">{overallSummary.totalStokKg.toLocaleString('id-ID')} kg</td>
                <td className="py-2 px-2 text-center">100%</td>
                <td className="py-2 px-3 text-right font-mono">Rp {overallSummary.totalValuasi.toLocaleString('id-ID')}</td>
                <td className="py-2 px-2 text-center font-mono">{overallSummary.totalIntakeKg.toLocaleString('id-ID')}</td>
                <td className="py-2 px-2 text-center font-mono">{overallSummary.totalDoKg.toLocaleString('id-ID')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="text-gray-500 mb-12">Petugas Operator Timbang,</p>
              <p className="font-bold border-t border-gray-400 pt-1">Budi Hartono</p>
            </div>
            <div>
              <p className="text-gray-500 mb-12">Supervisor QC & Laboratorium,</p>
              <p className="font-bold border-t border-gray-400 pt-1">Ir. Hendra Wijaya</p>
            </div>
            <div>
              <p className="text-gray-500 mb-12">Kepala Gudang PR. Sekar Maju Sejahtera,</p>
              <p className="font-bold border-t border-gray-400 pt-1">Bambang Sutrisno, S.T.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

const contentBeli = (
    <div className="space-y-4">
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-900 rounded-none flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5 text-yellow-400" />
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
              Laporan Stok & Analisis Mutu Grade
            </h1>
          </div>
        </div>

        {/* Action Direct Download Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadCsv}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="Download file spreadsheet Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Download CSV / Excel</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Download dokumen laporan dalam format PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download Laporan (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: Total Grade Terdaftar */}
        <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Mutu Grade Aktif
            </span>
            <span className="p-1.5 bg-red-50 text-[#b81d24] rounded-sm">
              <Tag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            {overallSummary.totalGradeCount} <span className="text-xs font-normal text-gray-500">Tingkatan Grade</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Grade Dominan:</span>
            <span className="font-semibold text-gray-800">
              {overallSummary.dominantGrade ? `Grade ${overallSummary.dominantGrade.code} (${overallSummary.dominantGrade.persenStokKg.toFixed(1)}%)` : '-'}
            </span>
          </div>
        </div>

        {/* Card 2: Stok Tersimpan di Gudang */}
        <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Stok Aktif Fisik Bal
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded-sm">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-950 mt-2">
            {overallSummary.totalStokBal} <span className="text-xs font-normal text-gray-500">Bal ({overallSummary.totalStokKg.toLocaleString('id-ID')} kg)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Tonase Total:</span>
            <span className="font-semibold text-emerald-900">{(overallSummary.totalStokKg / 1000).toFixed(2)} Ton</span>
          </div>
        </div>

        {/* Card 3: Valuasi Aset Inventaris */}
        <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Valuasi Aset Tembakau
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-800 rounded-sm">
              <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4">Rp</span>
            </span>
          </div>
          <div className="text-xl font-bold text-blue-950 mt-2">
            Rp {overallSummary.totalValuasi.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Dihitung dari tarif acuan aktif</span>
            <span className="font-semibold text-blue-800">{overallSummary.totalGradeCount} Grade</span>
          </div>
        </div>

        {/* Card 4: Arus Masuk vs DO */}
        <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Perputaran Intake & DO
            </span>
            <span className="p-1.5 bg-purple-50 text-purple-800 rounded-sm">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-purple-950 mt-2">
            {(overallSummary.totalIntakeKg / 1000).toFixed(1)} <span className="text-xs font-normal text-gray-500">Ton Intake</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Terkirim ke Pabrik:</span>
            <span className="font-semibold text-purple-900">{(overallSummary.totalIntakeKg / 1000).toFixed(1)} Ton</span>
          </div>
        </div>

      </div>

      {/* Main Grade Matrix & Color Visual Breakdown */}
      <div className="bg-white border border-gray-200 shadow-xs p-4 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => setShowMatriksBeli(!showMatriksBeli)}
          >
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
              <span>Matriks Distribusi & Rekapitulasi per Mutu Grade</span>
              {showMatriksBeli ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-gray-400" />}
              <span className="px-2 py-0.5 text-[10px] bg-red-50 text-[#b81d24] font-bold border border-red-200">
                Pembaruan Real-Time
              </span>
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Urutan berdasarkan jumlah inventaris bal aktif terbanyak di seluruh fasilitas gudang.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {onNavigateToHarga && (
    <button
      onClick={onNavigateToHarga}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Tarif Acuan</span>
    </button>
  )}
          </div>
        </div>

        {showMatriksBeli && (
          <>
        {/* Quick Filter Grade Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-gray-500 font-medium">Filter Tampilan Grade:</span>
          <button
            onClick={() => setSelectedGradeCode('ALL')}
            className={`px-2.5 py-1 border text-xs cursor-pointer transition rounded-sm ${
              selectedGradeCode === 'ALL'
                ? 'bg-gray-900 text-white font-bold border-gray-900 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Semua Grade ({gradeMetrics.length})
          </button>
          {gradeMetrics.map((m) => (
            <button
              key={m.code}
              onClick={() => setSelectedGradeCode(selectedGradeCode === m.code ? 'ALL' : m.code)}
              className={`px-2.5 py-1 border text-xs cursor-pointer transition rounded-sm ${
                selectedGradeCode === m.code
                  ? 'bg-gray-900 text-white font-bold border-gray-900 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Grade {m.code}</span>
              <span className={`ml-1 text-[10px] ${selectedGradeCode === m.code ? 'text-gray-300' : 'text-gray-500'}`}>
                ({m.stokBal} Bal)
              </span>
            </button>
          ))}
        </div>

        {/* Master Grade Table Matrix */}
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 text-[10px] uppercase">
                <th className="py-2.5 px-3 text-center w-12">Grade</th>
                <th className="py-2.5 px-3">Nama Mutu & Kualitas</th>
                <th className="py-2.5 px-3 text-right">Tarif Acuan</th>
                <th className="py-2.5 px-3 text-center bg-emerald-50/50">Stok Bal</th>
                <th className="py-2.5 px-3 text-right bg-emerald-50/50">Stok (Kg)</th>
                <th className="py-2.5 px-3 text-center">% Porsi</th>
                <th className="py-2.5 px-3 text-right">Valuasi Stok (Rp)</th>
                <th className="py-2.5 px-3 text-center bg-blue-50/40">Intake Masuk</th>
                <th className="py-2.5 px-3 text-center bg-purple-50/40">DO Keluar</th>
                <th className="py-2.5 px-3 text-center">QC Sample</th>
                <th className="py-2.5 px-3 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gradeMetrics.map((item) => {
                const isSelected = selectedGradeCode === item.code;
                return (
                  <tr 
                    key={item.code} 
                    className={`transition-colors ${isSelected ? 'bg-red-50/40 font-medium' : 'hover:bg-gray-50/80'}`}
                  >
                    {/* Grade Badge with designated color */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 font-bold text-xs ${item.color.badgeBg} shadow-xs`}>
                        {item.code}
                      </span>
                    </td>

                    {/* Nama Mutu & Deskripsi */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-gray-900">{item.name}</div>
                      
                    </td>

                    {/* Tarif Acuan */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                      {item.price > 0 ? `Rp ${item.price.toLocaleString('id-ID')}` : '-'}
                      <span className="text-[10px] font-normal text-gray-500 block">/ kg</span>
                    </td>

                    {/* Stok Bal */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-950 bg-emerald-50/30">
                      {item.stokBal} Bal
                    </td>

                    {/* Stok Kg */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/30">
                      {item.stokKg.toLocaleString('id-ID')} kg
                    </td>

                    {/* % Porsi */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold ${item.color.lightBg}`}>
                        {item.persenStokKg.toFixed(1)}%
                      </span>
                    </td>

                    {/* Valuasi Stok */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#b81d24]">
                      Rp {item.valuasiRupiah.toLocaleString('id-ID')}
                    </td>

                    {/* Intake Masuk */}
                    <td className="py-2.5 px-3 text-center font-mono text-gray-700 bg-blue-50/20">
                      <div>{item.intakeBal} Bal</div>
                      <span className="text-[10px] text-blue-900 font-semibold">{item.intakeKg.toLocaleString('id-ID')} kg</span>
                    </td>

                    {/* DO Keluar */}
                    <td className="py-2.5 px-3 text-center font-mono text-gray-700 bg-purple-50/20">
                      <div>{item.doBal} Bal</div>
                      <span className="text-[10px] text-purple-900 font-semibold">{item.doKg.toLocaleString('id-ID')} kg</span>
                    </td>

                    {/* QC Sample */}
                    <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                      {item.totalSampleCount > 0 ? (
                        <span className="text-green-700 font-semibold">
                          {item.approvedSampleCount}/{item.totalSampleCount} ACC
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Aksi Filter */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedGradeCode(isSelected ? 'ALL' : item.code)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#b81d24] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? 'Terpilih' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 text-gray-900 font-bold border-t-2 border-gray-300 text-xs">
                <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider">
                  TOTAL KESELURUHAN INVENTARIS:
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-950 bg-emerald-100/50">
                  {overallSummary.totalStokBal} Bal
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-950 bg-emerald-100/50">
                  {overallSummary.totalStokKg.toLocaleString('id-ID')} kg
                </td>
                <td className="py-2.5 px-3 text-center">
                  100%
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#b81d24]">
                  Rp {overallSummary.totalValuasi.toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-blue-950 bg-blue-100/50">
                  {overallSummary.totalIntakeKg.toLocaleString('id-ID')} kg
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-purple-950 bg-purple-100/50">
                  {overallSummary.totalDoKg.toLocaleString('id-ID')} kg
                </td>
                <td colSpan={2}></td>
              </tr>
                        </tfoot>
          </table>
        </div>
        </>
        )}
      </div>

      {/* Deep-Dive Bal Inventory Explorer */}
      <div className="bg-white border border-gray-200 shadow-xs p-4 space-y-3">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
              <span>Eksplorasi Fisik Bal Inventaris</span>
              {selectedGradeCode !== 'ALL' && (
                <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-800 font-bold">
                  Khusus Grade {selectedGradeCode}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Daftar rincian bal tembakau dan lokasi blok rak penyimpanan
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadBalDetailCsv}
              className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Download Detail Bal (CSV)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls for Bal Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
          {/* Grade Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Filter Grade:</label>
            <input
              type="text"
              list="grade-list-filter"
              value={selectedGradeCode}
              onChange={(e) => {
                setSelectedGradeCode(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Ketik/Pilih Grade..."
              className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs rounded-none focus:border-gray-800 focus:outline-none font-semibold text-gray-800"
            />
            <datalist id="grade-list-filter">
              <option value="ALL">Semua Grade</option>
              {uniqueGrades.map((g) => (
                <option key={g.code} value={g.code}>
                  Grade {g.code} - {g.name}
                </option>
              ))}
            </datalist>
          </div>

          {/* Gudang Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Lokasi Gudang:</label>
            <select
              value={filterGudang}
              onChange={(e) => {
                setFilterGudang(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs rounded-none focus:border-gray-800 focus:outline-none text-gray-800"
            >
              <option value="ALL">Semua Gudang</option>
              {gudangList.map((gdg) => (
                <option key={gdg.gudang_id} value={gdg.nama_gudang}>
                  {gdg.nama_gudang}
                </option>
              ))}
            </select>
          </div>

          {/* Status Stok Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Status Stok:</label>
            <select
              value={filterStatusStok}
              onChange={(e) => {
                setFilterStatusStok(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gray-300 px-2 py-1.5 text-xs rounded-none focus:border-gray-800 focus:outline-none text-gray-800"
            >
              <option value="ALL">Semua Status ({barangList.length})</option>
              <option value="di_gudang">Di Gudang (Stok Aktif)</option>
              <option value="siap_kirim">Siap Kirim</option>
              <option value="keluar">Keluar / Terkirim Pabrik (DO)</option>
              <option value="terkirim_sample">Sample Lab QC</option>
            </select>
          </div>

          {/* Search Bal */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Cari No Bal / Petani:</label>
            <div className="relative">
              <input
                type="text"
                value={searchBalQuery}
                onChange={(e) => {
                  setSearchBalQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="No Bal, Petani, Lokasi..."
                className="w-full bg-white border border-gray-300 pl-7 pr-2 py-1.5 text-xs rounded-none focus:border-gray-800 focus:outline-none text-gray-800"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
            </div>
          </div>
        </div>

        {/* Bal Inventory Table */}
        <div className="overflow-x-auto border border-gray-200 mt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 text-[10px] uppercase">
                <th className="py-2 px-3 text-center w-10">No</th>
                <th className="py-2 px-3 w-32 whitespace-nowrap">ID Bal</th>
                <th className="py-2 px-3 w-28 whitespace-nowrap">No Bal</th>
                <th className="py-2 px-3 text-center">Grade</th>
                <th className="py-2 px-3 text-right">Berat (kg)</th>
                <th className="py-2 px-3 text-right">Estimasi Valuasi</th>
                <th className="py-2 px-3">Petani Penyetor</th>
                <th className="py-2 px-3">Lokasi Gudang</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3">Tgl Masuk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBalList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-gray-500 text-xs">
                    Tidak ditemukan data bal yang sesuai dengan filter grade ini.
                  </td>
                </tr>
              ) : (
                paginatedBalList.map((bal, idx) => {
                  const gMetric = gradeMetrics.find((m) => m.code === bal.kode_grade.toUpperCase());
                  const estPrice = gMetric ? gMetric.price * bal.berat_kg : 0;
                  const gColor = gMetric ? gMetric.color : GRADE_PALETTE[0];

                  return (
                    <tr key={bal.barang_id || idx} className="hover:bg-gray-50/80">
                      <td className="py-2 px-3 text-center font-mono text-gray-500 text-[11px]">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-gray-900 w-32 whitespace-nowrap">
                        {bal.barang_id}
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-800 w-28 whitespace-nowrap">
                        {bal.no_bal}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-5 h-5 font-bold text-[10px] ${gColor.badgeBg}`}>
                          {bal.kode_grade}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-950">
                        {bal.berat_kg} kg
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#b81d24] font-semibold">
                        Rp {estPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-gray-800 font-medium">
                        {bal.nama_petani || '-'}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">
                        {bal.lokasi_gudang}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-none ${
                          bal.status_stok === 'di_gudang' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                          bal.status_stok === 'siap_kirim' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
                          bal.status_stok === 'keluar' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                          'bg-purple-50 text-purple-800 border border-purple-300'
                        }`}>
                          {bal.status_stok === 'di_gudang' ? 'Di Gudang' :
                           bal.status_stok === 'siap_kirim' ? 'Siap Kirim' :
                           bal.status_stok === 'keluar' ? 'Keluar (DO)' : 'Sample Lab'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-[11px]">
                        {bal.tanggal_masuk ? bal.tanggal_masuk.split(' ')[0] : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredBalList.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>

      </div>

      {/* Hidden DOM for High-Fidelity PDF Generation */}
      <div className="hidden">
        <div ref={printDocumentRef} className="p-8 bg-white text-gray-900 font-sans text-xs space-y-6">
          {/* Header */}
          <div className="border-b-2 border-gray-900 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">PR. SEKAR MAJU SEJAHTERA</h1>
              <p className="text-xs font-semibold text-gray-600">SISTEM DATA GUDANG TEMBAKAU & LOGISTIK ERP</p>
              <p className="text-[10px] text-gray-500">Pusat Intake & Pengolahan Tembakau Madura - Pamekasan, Jawa Timur</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold uppercase text-[#b81d24]">LAPORAN MASTER HARGA BELI & VALUASI STOK</h2>
              <p className="text-[10px] text-gray-600">Tanggal Ekspor: {formatDateHariBulanTahun(new Date().toISOString())}</p>
              <p className="text-[10px] text-gray-500">Total Mutu Terdaftar: {uniqueGrades.length} Grade</p>
            </div>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-4 gap-3 bg-gray-50 p-3 border border-gray-300 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 uppercase block">Total Mutu Grade:</span>
              <strong className="text-sm text-gray-900">{overallSummary.totalGradeCount} Grade</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase block">Total Fisik Stok:</span>
              <strong className="text-sm text-emerald-900">{overallSummary.totalStokBal} Bal ({overallSummary.totalStokKg.toLocaleString('id-ID')} kg)</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase block">Total Valuasi Aset:</span>
              <strong className="text-sm text-[#b81d24]">Rp {overallSummary.totalValuasi.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase block">Total Intake / DO:</span>
              <strong className="text-sm text-blue-900">{(overallSummary.totalIntakeKg / 1000).toFixed(1)} T / {(overallSummary.totalDoKg / 1000).toFixed(1)} T</strong>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse border border-gray-300 text-[11px]">
            <thead>
              <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-300">
                <th className="py-2 px-2 border-r border-gray-300 text-center w-8">No</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center w-12">Grade</th>
                <th className="py-2 px-3 border-r border-gray-300">Nama Mutu Grade</th>
                <th className="py-2 px-3 border-r border-gray-300 text-right">Harga Beli (Rp/kg)</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">Stok (Bal)</th>
                <th className="py-2 px-3 border-r border-gray-300 text-right">Stok (Kg)</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">% Porsi</th>
                <th className="py-2 px-3 border-r border-gray-300 text-right">Valuasi Beli (Rp)</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">Intake (Kg)</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">DO Keluar (Kg)</th>
                <th className="py-2 px-2 text-center">QC Sample</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {gradeMetrics.map((m, idx) => (
                <tr key={m.code}>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{idx + 1}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-bold">{m.code}</td>
                  <td className="py-2 px-3 border-r border-gray-300 font-semibold">{m.name}</td>
                  <td className="py-2 px-3 border-r border-gray-300 text-right font-mono">Rp {m.price.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono font-bold">{m.stokBal}</td>
                  <td className="py-2 px-3 border-r border-gray-300 text-right font-mono">{m.stokKg.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-semibold">{m.persenStokKg.toFixed(1)}%</td>
                  <td className="py-2 px-3 border-r border-gray-300 text-right font-mono font-bold">Rp {m.valuasiRupiah.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{m.intakeKg.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{m.doKg.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 text-center font-mono">{m.approvedSampleCount}/{m.totalSampleCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                <td colSpan={4} className="py-2 px-3 text-right">TOTAL KESELURUHAN:</td>
                <td className="py-2 px-2 text-center font-mono">{overallSummary.totalStokBal} Bal</td>
                <td className="py-2 px-3 text-right font-mono">{overallSummary.totalStokKg.toLocaleString('id-ID')} kg</td>
                <td className="py-2 px-2 text-center">100%</td>
                <td className="py-2 px-3 text-right font-mono">Rp {overallSummary.totalValuasi.toLocaleString('id-ID')}</td>
                <td className="py-2 px-2 text-center font-mono">{overallSummary.totalIntakeKg.toLocaleString('id-ID')}</td>
                <td className="py-2 px-2 text-center font-mono">{overallSummary.totalDoKg.toLocaleString('id-ID')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="text-gray-500 mb-12">Petugas Operator Timbang,</p>
              <p className="font-bold border-t border-gray-400 pt-1">Budi Hartono</p>
            </div>
            <div>
              <p className="text-gray-500 mb-12">Supervisor QC & Laboratorium,</p>
              <p className="font-bold border-t border-gray-400 pt-1">Ir. Hendra Wijaya</p>
            </div>
            <div>
              <p className="text-gray-500 mb-12">Kepala Gudang PR. Sekar Maju Sejahtera,</p>
              <p className="font-bold border-t border-gray-400 pt-1">Bambang Sutrisno, S.T.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="space-y-4 font-sans text-gray-800 pb-10">
      
      {/* Top Header & Tab Navigation */}
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#b81d24] text-white">
              Report & Analitik
            </span>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">
              Laporan Harga Tembakau
            </h1>
          </div>
          
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-sm border border-gray-300">
          <button
            onClick={() => setActiveTab('beli')}
            className={`px-4 py-1.5 text-xs font-bold rounded-sm transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'beli'
                ? 'bg-[#b81d24] text-white shadow-xs'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Laporan Harga Beli</span>
          </button>
          <button
            onClick={() => setActiveTab('jual')}
            className={`px-4 py-1.5 text-xs font-bold rounded-sm transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'jual'
                ? 'bg-[#b81d24] text-white shadow-xs'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <span className="inline-flex items-center justify-center font-bold leading-none w-3.5 h-3.5">Rp</span>
            <span>Laporan Harga Jual</span>
          </button>
        </div>
      </div>

      {activeTab === 'jual' ? contentJual : contentBeli}
    </div>
  );
};

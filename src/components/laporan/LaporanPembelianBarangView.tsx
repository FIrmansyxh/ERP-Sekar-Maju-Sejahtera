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
  Scale
} from 'lucide-react';
import { TransaksiPembelian, Petani } from '../../types';
import { downloadCsvFile, downloadElementAsPdf } from '../../utils/printDownload';
import { formatDateHariBulanTahun } from '../../utils/formatters';

interface LaporanPembelianBarangViewProps {
  transaksiList: TransaksiPembelian[];
  petaniList: Petani[];
  userRole?: string;
  onNavigateToTransaksi?: () => void;
}

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
        if (!item.no_bal?.toLowerCase().includes(query)) return false;
      }
      // Filter Supplier
      if (appliedFilters.supplier && appliedFilters.supplier !== 'ALL' && item.petani_id !== appliedFilters.supplier) {
        return false;
      }
      return true;
    });
  }, [transaksiList, appliedFilters]);

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

    filteredData.forEach((row) => {
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
      count: filteredData.length,
    };
  }, [filteredData]);

  // Export CSV / Excel Compatible
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = [
      'No',
      'Tanggal',
      'Kupon',
      'Supplier',
      'No Ball',
      'Kode Beli',
      'Bruto (kg)',
      'Netto (kg)',
      'Potongan (Rp)',
      'Total Harga Beli (Rp)',
      'Jumlah Bayar (Rp)',
    ];

    const rows: (string | number)[][] = filteredData.map((row, idx) => {
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
        row.no_bal || '-',
        gradeStr,
        bruto,
        row.berat_kg || 0,
        row.total_potongan || 7000,
        subtotalHrgBeli,
        jmlBayar,
      ];
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
      'TOTAL AKUMULASI',
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
            disabled={filteredData.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Excel / CSV</span>
          </button>
          
          <button
            onClick={handleDownloadPdf}
            disabled={filteredData.length === 0 || isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:opacity-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download Laporan (PDF)'}</span>
          </button>
        </div>
      </div>

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

          {/* No Ball */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              No Ball
            </label>
            <input
              type="text"
              placeholder="Semua Ball / Cari..."
              value={filterNoBall}
              onChange={(e) => setFilterNoBall(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
            />
          </div>

          {/* Supplier (Petani) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Supplier (Petani)
            </label>
            <input
              type="text"
              list="supplier-list"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              placeholder="Ketik/Pilih Supplier..."
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none truncate"
            />
            <datalist id="supplier-list">
              <option value="ALL">Semua Supplier</option>
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
              ({filteredData.length} baris data • {totals.totalBal} Bal • {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg Netto)
            </span>
          </div>
          
          <span className="text-[11px] text-gray-500 italic">
            * Potongan kuli Rp 7.000 / bal
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-gray-100/90 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-2 text-center w-12 border-r border-gray-200 whitespace-nowrap">No</th>
                <th className="py-2.5 px-2.5 border-r border-gray-200 whitespace-nowrap">Tanggal</th>
                <th className="py-2.5 px-2.5 border-r border-gray-200 whitespace-nowrap">Kupon</th>
                <th className="py-2.5 px-3 border-r border-gray-200 min-w-[160px]">Supplier</th>
                <th className="py-2.5 px-2.5 text-center border-r border-gray-200 whitespace-nowrap">No Ball</th>
                <th className="py-2.5 px-2 text-center border-r border-gray-200 whitespace-nowrap">Kode Beli</th>
                <th className="py-2.5 px-2.5 text-right border-r border-gray-200 whitespace-nowrap">Bruto (kg)</th>
                <th className="py-2.5 px-2.5 text-right border-r border-gray-200 whitespace-nowrap">Netto (kg)</th>
                <th className="py-2.5 px-2.5 text-right border-r border-gray-200 whitespace-nowrap">Potongan</th>
                <th className="py-2.5 px-3 text-right border-r border-gray-200 whitespace-nowrap">Total Harga Beli</th>
                <th className="py-2.5 px-3 text-right bg-red-50/50 font-extrabold text-[#b81d24] whitespace-nowrap">Jumlah Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-500">
                    <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold">Tidak ada data transaksi yang cocok dengan filter aktif.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Coba ubah tanggal atau klik "Reset Filter" untuk menampilkan seluruh transaksi.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => {
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
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      {/* 1. No */}
                      <td className="py-2 px-2 text-center text-gray-500 font-mono text-[11px] border-r border-gray-100 whitespace-nowrap">
                        {idx + 1}
                      </td>

                      {/* 2. Tanggal (YYYY-MM-DD) */}
                      <td className="py-2 px-2.5 text-gray-700 font-mono text-[11px] whitespace-nowrap border-r border-gray-100">
                        {tglDisplay}
                      </td>

                      {/* 3. Kupon (Full 1 row, never truncated) */}
                      <td className="py-2 px-2.5 font-mono text-gray-900 font-bold border-r border-gray-100 whitespace-nowrap">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] whitespace-nowrap font-mono font-bold text-[#b81d24]">
                          {row.no_kupon || '-'}
                        </span>
                      </td>

                      {/* 4. Supplier */}
                      <td className="py-2 px-3 text-gray-900 font-medium border-r border-gray-100">
                        <div className="font-semibold text-gray-800 leading-tight">{row.nama_petani}</div>
                        <div className="text-[10px] text-gray-400 font-mono leading-none mt-0.5">{row.nomor_kartu}</div>
                      </td>

                      {/* 5. No Ball */}
                      <td className="py-2 px-2.5 text-center font-mono font-semibold text-gray-800 border-r border-gray-100 whitespace-nowrap">
                        {row.no_bal}
                      </td>

                      {/* 6. Kode Beli */}
                      <td className="py-2 px-2 text-center border-r border-gray-100 whitespace-nowrap">
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
                      </td>

                      {/* 7. Bruto */}
                      <td className="py-2 px-2.5 text-right font-mono text-gray-700 border-r border-gray-100 whitespace-nowrap">
                        {bruto > 0 ? bruto.toFixed(1) : '-'}
                      </td>

                      {/* 8. Netto */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-900 border-r border-gray-100 bg-blue-50/20 whitespace-nowrap">
                        {netto.toFixed(1)}
                      </td>

                      {/* 9. Potongan */}
                      <td className="py-2 px-2.5 text-right font-mono text-amber-800 border-r border-gray-100 whitespace-nowrap">
                        {Math.round(totalPotonganRow).toLocaleString('id-ID')}
                      </td>

                      {/* 10. Total Harga Beli */}
                      <td className="py-2 px-3 text-right font-mono font-semibold text-gray-900 border-r border-gray-100 whitespace-nowrap">
                        {Math.round(totalHargaBeliRow).toLocaleString('id-ID')}
                      </td>

                      {/* 11. Jumlah Bayar */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#b81d24] bg-red-50/30 whitespace-nowrap">
                        {Math.round(jumlahBayarRow).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Totals  */}
            {filteredData.length > 0 && (
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
          className="p-2.5 bg-slate-900/95 hover:bg-slate-900 text-white rounded-full shadow-lg border border-slate-700/80 backdrop-blur-sm transition cursor-pointer group flex items-center justify-center hover:scale-110 active:scale-95"
          title="Geser ke Paling Atas"
        >
          <ArrowUp className="w-4 h-4 text-amber-400 group-hover:-translate-y-0.5 transition-transform" />
          <span className="sr-only">Geser ke Paling Atas</span>
        </button>
        <button
          type="button"
          onClick={scrollToBottom}
          className="p-2.5 bg-slate-900/95 hover:bg-slate-900 text-white rounded-full shadow-lg border border-slate-700/80 backdrop-blur-sm transition cursor-pointer group flex items-center justify-center hover:scale-110 active:scale-95"
          title="Geser ke Paling Bawah"
        >
          <ArrowDown className="w-4 h-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
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
                <th className="p-1 border border-gray-300">Supplier</th>
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
              {filteredData.map((row, idx) => {
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
                    <td className="p-1 border border-gray-300 text-center font-mono">{row.no_bal}</td>
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

          {/* Tanda Tangan Audit */}
          <div className="grid grid-cols-3 gap-4 pt-6 text-center text-[11px]">
            <div>
              <p className="text-gray-600">Operator Loket Timbang</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-gray-900">( Siti Rahayu )</p>
            </div>
            <div>
              <p className="text-gray-600">Petugas QC & Mutu</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-gray-900">( drg. Hendra Kusuma )</p>
            </div>
            <div>
              <p className="text-gray-600">Kepala Gudang / Mengetahui</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-gray-900">( Bambang Sutrisno, S.T. )</p>
            </div>
          </div>
        </div>
      </div>

  </div>
);
};

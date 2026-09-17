import React, { useMemo, useState, useEffect } from 'react';
import { 
  PackageSearch,
  Download,
  FileSpreadsheet,
  Filter,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react';
import { Barang } from '../../types';
import { formatNumber, formatRupiah, extractKodeBalPrefix } from '../../utils/formatters';
import { downloadExcelReport, todayStamp } from '../../utils/excelExport';
import { COMPANY_NAME } from '../../config/appInfo';
import { SortIcon } from '../common/SortIcon';

interface LaporanKodeBalViewProps {
  barangList: Barang[];
}

interface KodeBalRow {
  kode_bal: string;
  jumlah_bal: number;
  berat_bruto: number;
  berat_netto: number;
  avg_harga: number;
  total_nilai: number;
}

export const LaporanKodeBalView: React.FC<LaporanKodeBalViewProps> = ({
  barangList = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof KodeBalRow>('kode_bal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Ref for table scrolling container
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Scroll Position State for Scroll-To-Top and Scroll-To-Bottom buttons (sama persis seperti pada Laporan Pembelian)
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const mainEl = document.querySelector('main');
      const tableEl = tableContainerRef.current;

      const scrollY = window.scrollY || document.documentElement.scrollTop || mainEl?.scrollTop || tableEl?.scrollTop || 0;
      const windowHeight = window.innerHeight || mainEl?.clientHeight || tableEl?.clientHeight || document.documentElement.clientHeight;
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        mainEl?.scrollHeight || 0,
        tableEl?.scrollHeight || 0
      );

      // Sembunyikan ketika di paling atas (<= 100px) ATAU ketika sudah di paling bawah (>= docHeight - 80px)
      // Muncul kembali ketika di-scroll ke atas dari bawah atau di-scroll ke bawah dari atas
      const isAtTop = scrollY <= 100;
      const isAtBottom = scrollY + windowHeight >= docHeight - 80;

      setShowScrollButtons(!isAtTop && !isAtBottom);
    };

    const mainEl = document.querySelector('main');
    const tableEl = tableContainerRef.current;

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    if (mainEl) mainEl.addEventListener('scroll', handleScroll, { passive: true });
    if (tableEl) tableEl.addEventListener('scroll', handleScroll, { passive: true });

    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll);
      if (tableEl) tableEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        top: tableContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({
        top: mainEl.scrollHeight,
        behavior: 'smooth',
      });
    }
    window.scrollTo({
      top: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      behavior: 'smooth',
    });
  };

  const kodeBalData = useMemo(() => {
    const map = new Map<string, {
      jumlah_bal: number;
      berat_bruto: number;
      berat_netto: number;
      total_nilai: number;
    }>();

    barangList.forEach((b) => {
      if (!b.no_bal) return;
      // Ekstrak huruf di depannya saja sebagai kode bal (misal: SB-01 -> SB, HF-02 -> HF, GT-01 -> GT)
      const extracted = extractKodeBalPrefix(b.no_bal);
      const kode = extracted || 'TANPA KODE';

      if (!map.has(kode)) {
        map.set(kode, {
          jumlah_bal: 0,
          berat_bruto: 0,
          berat_netto: 0,
          total_nilai: 0,
        });
      }

      const existing = map.get(kode)!;
      existing.jumlah_bal += 1;
      existing.berat_bruto += b.berat_bruto_kg || b.berat_kg || 0; // fallback if bruto is empty
      existing.berat_netto += b.berat_kg || 0;
      existing.total_nilai += b.total_harga || 0;
    });

    const rows: KodeBalRow[] = Array.from(map.entries()).map(([kode, data]) => {
      const avgHarga = data.berat_netto > 0 ? data.total_nilai / data.berat_netto : 0;
      return {
        kode_bal: kode,
        jumlah_bal: data.jumlah_bal,
        berat_bruto: data.berat_bruto,
        berat_netto: data.berat_netto,
        avg_harga: avgHarga,
        total_nilai: data.total_nilai,
      };
    });

    return rows;
  }, [barangList]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...kodeBalData];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => item.kode_bal.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [kodeBalData, searchQuery, sortField, sortOrder]);

  const totals = useMemo(() => {
    return filteredAndSortedData.reduce((acc, curr) => ({
      jumlah_bal: acc.jumlah_bal + curr.jumlah_bal,
      berat_bruto: acc.berat_bruto + curr.berat_bruto,
      berat_netto: acc.berat_netto + curr.berat_netto,
      total_nilai: acc.total_nilai + curr.total_nilai,
    }), {
      jumlah_bal: 0,
      berat_bruto: 0,
      berat_netto: 0,
      total_nilai: 0,
    });
  }, [filteredAndSortedData]);

  const avgHargaTotal = totals.berat_netto > 0 ? totals.total_nilai / totals.berat_netto : 0;

  const handleSort = (field: keyof KodeBalRow) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: keyof KodeBalRow) => <SortIcon aktif={sortField === field} arah={sortOrder} />;

  const handleExportExcel = () => {
    downloadExcelReport(`Laporan_Kode_Bal_${todayStamp()}`, [
      {
        name: 'Kode Bal',
        title: 'Laporan Kode Bal',
        info: [searchQuery.trim() ? `Pencarian kode: ${searchQuery.trim()} · Hanya bal lunas` : 'Seluruh kode bal · Hanya bal dari kupon yang sudah lunas'],
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Kode Bal', align: 'center' },
          { header: 'Jumlah Bal', type: 'integer' },
          { header: 'Berat Bruto (Kg)', type: 'kg' },
          { header: 'Berat Netto (Kg)', type: 'kg' },
          { header: 'Rata-rata Harga (Rp/Kg)', type: 'rupiah' },
          { header: 'Total Nilai (Rp)', type: 'rupiah' },
        ],
        rows: filteredAndSortedData.map((item, idx) => [
          idx + 1,
          item.kode_bal,
          item.jumlah_bal,
          item.berat_bruto,
          item.berat_netto,
          item.avg_harga,
          item.total_nilai,
        ]),
        totalRow: ['TOTAL', '', totals.jumlah_bal, totals.berat_bruto, totals.berat_netto, avgHargaTotal, totals.total_nilai],
      },
    ]);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#b81d24] text-white rounded-sm flex items-center justify-center shrink-0 shadow-xs">
            <PackageSearch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-bold text-[10px] rounded-none uppercase tracking-wider">
                LAPORAN INVENTARIS FISIK
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                {COMPANY_NAME}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              Laporan Kode Bal
            </h1>
            <p className="text-[11px] text-gray-500">Hanya bal dari kupon yang sudah lunas; bal yang belum dibayar masih kredit.</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-gray-500 font-medium">
            <span>Total: <strong className="text-gray-900">{filteredAndSortedData.length}</strong> Kode Bal</span>
            {searchQuery.trim() && (
              <span className="text-[11px] text-gray-500 font-medium">
                (Hasil pencarian)
              </span>
            )}
          </div>

          <div className="w-full sm:w-72 md:w-80">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-laporan-kode-bal"
                type="text"
                placeholder="Cari Kode Bal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="btn-clear-search-kode-bal"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div ref={tableContainerRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-210px)] min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f8f9fa] border-b border-gray-300 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <tr className="text-xs font-bold text-gray-700">
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 select-none w-32 transition-colors"
                  onClick={() => handleSort('kode_bal')}
                >
                  <div className="flex items-center justify-between">
                    <span>Kode Bal</span>
                    {renderSortIcon('kode_bal')}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200/80 select-none w-32 transition-colors"
                  onClick={() => handleSort('jumlah_bal')}
                >
                  <div className="flex items-center justify-end">
                    <span>Jumlah Bal</span>
                    {renderSortIcon('jumlah_bal')}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200/80 select-none w-40 transition-colors"
                  onClick={() => handleSort('berat_bruto')}
                >
                  <div className="flex items-center justify-end">
                    <span>Berat Bruto</span>
                    {renderSortIcon('berat_bruto')}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200/80 select-none w-40 transition-colors"
                  onClick={() => handleSort('berat_netto')}
                >
                  <div className="flex items-center justify-end">
                    <span>Berat Netto</span>
                    {renderSortIcon('berat_netto')}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200/80 select-none transition-colors"
                  onClick={() => handleSort('avg_harga')}
                >
                  <div className="flex items-center justify-end">
                    <span>AVG Harga</span>
                    {renderSortIcon('avg_harga')}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 text-right cursor-pointer hover:bg-gray-200/80 select-none transition-colors"
                  onClick={() => handleSort('total_nilai')}
                >
                  <div className="flex items-center justify-end">
                    <span>Total Nilai</span>
                    {renderSortIcon('total_nilai')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Tidak ada data yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((row, idx) => (
                  <tr key={row.kode_bal} className={`hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="py-2.5 px-4 border-r border-gray-200 font-bold text-gray-900 bg-slate-50/50">
                      {row.kode_bal}
                    </td>
                    <td className="py-2.5 px-4 border-r border-gray-200 text-right font-medium">
                      {formatNumber(row.jumlah_bal)} <span className="text-gray-400 text-xs font-normal">Bal</span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-gray-200 text-right font-medium">
                      {formatNumber(row.berat_bruto)} <span className="text-gray-400 text-xs font-normal">Kg</span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-gray-200 text-right font-medium text-blue-700">
                      {formatNumber(row.berat_netto)} <span className="text-gray-400 text-xs font-normal">Kg</span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-gray-200 text-right font-mono text-gray-700">
                      {formatRupiah(row.avg_harga)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700 font-mono">
                      {formatRupiah(row.total_nilai)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredAndSortedData.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-gray-300 font-bold text-gray-900">
                <tr>
                  <td className="py-3 px-4 border-r border-gray-200">TOTAL</td>
                  <td className="py-3 px-4 border-r border-gray-200 text-right">{formatNumber(totals.jumlah_bal)} Bal</td>
                  <td className="py-3 px-4 border-r border-gray-200 text-right">{formatNumber(totals.berat_bruto)} Kg</td>
                  <td className="py-3 px-4 border-r border-gray-200 text-right text-blue-800">{formatNumber(totals.berat_netto)} Kg</td>
                  <td className="py-3 px-4 border-r border-gray-200 text-right font-mono">{formatRupiah(avgHargaTotal)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-800">{formatRupiah(totals.total_nilai)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Floating Scroll Controls (Sama persis seperti pada Laporan Pembelian) */}
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

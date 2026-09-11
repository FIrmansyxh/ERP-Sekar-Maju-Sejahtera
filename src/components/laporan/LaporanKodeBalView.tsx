import React, { useMemo, useState } from 'react';
import { 
  PackageSearch,
  Download,
  Filter,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Barang } from '../../types';
import { formatNumber, formatRupiah } from '../../utils/formatters';
import { downloadCsvFile } from '../../utils/printDownload';

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

  const kodeBalData = useMemo(() => {
    const map = new Map<string, {
      jumlah_bal: number;
      berat_bruto: number;
      berat_netto: number;
      total_nilai: number;
    }>();

    barangList.forEach((b) => {
      if (!b.no_bal) return;
      // Extract the letters before numbers
      const match = b.no_bal.match(/^([A-Za-z]+)/);
      const kode = match ? match[1].toUpperCase() : 'TANPA KODE';

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

  const renderSortIcon = (field: keyof KodeBalRow) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-400 ml-1" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-[#b81d24] ml-1" />
      : <ArrowDown className="w-3 h-3 text-[#b81d24] ml-1" />;
  };

  const handleExportCsv = () => {
    const headers = ['Kode Bal', 'Jumlah Bal', 'Berat Bruto (Kg)', 'Berat Netto (Kg)', 'AVG Harga (Rp)', 'Total Nilai (Rp)'];
    const rows = filteredAndSortedData.map(item => [
      item.kode_bal,
      item.jumlah_bal.toString(),
      item.berat_bruto.toString(),
      item.berat_netto.toString(),
      item.avg_harga.toFixed(2),
      item.total_nilai.toString()
    ]);
    
    // Add total row
    rows.push([
      'TOTAL',
      totals.jumlah_bal.toString(),
      totals.berat_bruto.toString(),
      totals.berat_netto.toString(),
      avgHargaTotal.toFixed(2),
      totals.total_nilai.toString()
    ]);

    downloadCsvFile(`Laporan_Kode_Bal_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-900 rounded-none flex items-center justify-center shrink-0 shadow-xs">
            <PackageSearch className="w-5 h-5 text-yellow-400" />
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
              Laporan Kode Bal
            </h1>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-slate-50 flex justify-between items-center">
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari Kode Bal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-full border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#b81d24] focus:border-[#b81d24]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f8f9fa] border-b border-gray-200">
              <tr className="text-xs font-bold text-gray-700">
                <th 
                  className="py-3 px-4 border-r border-gray-200 cursor-pointer hover:bg-gray-100 select-none w-32"
                  onClick={() => handleSort('kode_bal')}
                >
                  <div className="flex items-center justify-between">
                    <span>Kode Bal</span>
                    {renderSortIcon('kode_bal')}
                  </div>
                </th>
                <th 
                  className="py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-100 select-none w-32"
                  onClick={() => handleSort('jumlah_bal')}
                >
                  <div className="flex items-center justify-end">
                    <span>Jumlah Bal</span>
                    {renderSortIcon('jumlah_bal')}
                  </div>
                </th>
                <th 
                  className="py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-100 select-none w-40"
                  onClick={() => handleSort('berat_bruto')}
                >
                  <div className="flex items-center justify-end">
                    <span>Berat Bruto</span>
                    {renderSortIcon('berat_bruto')}
                  </div>
                </th>
                <th 
                  className="py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-100 select-none w-40"
                  onClick={() => handleSort('berat_netto')}
                >
                  <div className="flex items-center justify-end">
                    <span>Berat Netto</span>
                    {renderSortIcon('berat_netto')}
                  </div>
                </th>
                <th 
                  className="py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('avg_harga')}
                >
                  <div className="flex items-center justify-end">
                    <span>AVG Harga</span>
                    {renderSortIcon('avg_harga')}
                  </div>
                </th>
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100 select-none"
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
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Layers,
  DollarSign,
  Scale,
  Package,
  Filter,
  Download,
  Info,
  ChevronRight,
  TrendingUp,
  Tag,
  Warehouse,
} from 'lucide-react';
import { Barang, TabelHarga } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { downloadCsvFile } from '../../utils/printDownload';

interface DistribusiStokHargaBeliChartProps {
  barangList: Barang[];
  hargaList?: TabelHarga[];
  onNavigateToHarga?: () => void;
  onNavigateToGudang?: () => void;
}

type MetricMode = 'bal' | 'tonase' | 'nilai';
type ViewMode = 'bar' | 'donut' | 'dual' | 'table';
type StockScope = 'aktif' | 'semua';

// Palette warna profesional & berkarakter untuk setiap kode harga beli tembakau
const GRADE_COLORS: Record<string, string> = {
  A: '#18181b', // Zinc 900 / Super Grade
  B: '#0369a1', // Sky 700 / Premium Grade
  C: '#b45309', // Amber 700 / Standar Grade (Tobacco Gold)
  D: '#7c3aed', // Violet 600 / Medium Grade
  E: '#c2410c', // Orange 700 / Ekonomis
  F: '#4b5563', // Gray 600 / Campuran
  A1: '#0f766e', // Teal 700
  A2: '#047857', // Emerald 700
  B1: '#1d4ed8', // Blue 700
  C1: '#d97706', // Amber 600
};

const FALLBACK_PALETTE = [
  '#18181b',
  '#0369a1',
  '#b45309',
  '#0f766e',
  '#7c3aed',
  '#c2410c',
  '#b81d24',
  '#4b5563',
  '#0d9488',
  '#6366f1',
];

export const DistribusiStokHargaBeliChart: React.FC<DistribusiStokHargaBeliChartProps> = ({
  barangList = [],
  hargaList = [],
  onNavigateToHarga,
  onNavigateToGudang,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('bal');
  const [viewMode, setViewMode] = useState<ViewMode>('dual');
  const [stockScope, setStockScope] = useState<StockScope>('aktif');
  const [selectedGudang, setSelectedGudang] = useState<string>('ALL');

  // Daftar lokasi gudang unik untuk filter
  const uniqueGudangList = useMemo(() => {
    const set = new Set<string>();
    barangList.forEach((b) => {
      if (b.lokasi_gudang && b.lokasi_gudang.trim()) {
        // Ambil nama gudang sebelum garis miring jika ada format "Gudang / Blok"
        const mainGudang = b.lokasi_gudang.split('/')[0].trim();
        set.add(mainGudang);
      }
    });
    return Array.from(set).sort();
  }, [barangList]);

  // Map harga standar dari master harga
  const masterHargaMap = useMemo(() => {
    const map = new Map<string, { harga: number; nama: string;  }>();
    hargaList.forEach((h) => {
      const code = (h.kode_grade || '').trim().toUpperCase();
      if (code) {
        map.set(code, {
          harga: h.harga_per_kg || 0,
          nama: h.nama_grade || `Grade ${code}`,
          
        });
      }
    });
    return map;
  }, [hargaList]);

  // Filter bal sesuai scope dan lokasi gudang
  const filteredBarang = useMemo(() => {
    return barangList.filter((b) => {
      // Filter status stok
      if (stockScope === 'aktif') {
        if (b.status_stok !== 'di_gudang' && b.status_stok !== 'siap_kirim') {
          return false;
        }
      }

      // Filter gudang
      if (selectedGudang !== 'ALL') {
        const balGudang = (b.lokasi_gudang || '').split('/')[0].trim();
        if (!balGudang.toLowerCase().includes(selectedGudang.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [barangList, stockScope, selectedGudang]);

  // Aggregasi data per Kode Harga Beli
  const aggregatedData = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        kode_grade: string;
        nama_grade: string;
        harga_per_kg: number;
        balCount: number;
        totalKg: number;
        totalNilai: number;
        diGudangCount: number;
        siapKirimCount: number;
        color: string;
      }
    >();

    // Tambahkan dulu semua grade aktif dari master harga beli agar urutan dan kategori lengkap
    hargaList.forEach((h, idx) => {
      const code = (h.kode_grade || '').trim().toUpperCase();
      if (code && !code.includes('MULTI')) {
        const color = GRADE_COLORS[code] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
        groupMap.set(code, {
          kode_grade: code,
          nama_grade: h.nama_grade || `Grade ${code}`,
          harga_per_kg: h.harga_per_kg || 0,
          balCount: 0,
          totalKg: 0,
          totalNilai: 0,
          diGudangCount: 0,
          siapKirimCount: 0,
          color,
        });
      }
    });

    // Kumpulkan bal ke dalam kelompok kode harga beli
    filteredBarang.forEach((b) => {
      const code = (b.kode_grade || 'NON-GRADE').trim().toUpperCase();
      const existing = groupMap.get(code);

      // Tentukan harga per kg
      const hargaPerKg =
        b.harga_per_kg && b.harga_per_kg > 0
          ? b.harga_per_kg
          : masterHargaMap.get(code)?.harga || 0;

      const berat = b.berat_kg || 0;
      const subtotalNilai = b.total_harga && b.total_harga > 0 ? b.total_harga : berat * hargaPerKg;

      if (existing) {
        existing.balCount += 1;
        existing.totalKg += berat;
        existing.totalNilai += subtotalNilai;
        if (b.status_stok === 'siap_kirim') {
          existing.siapKirimCount += 1;
        } else {
          existing.diGudangCount += 1;
        }
        if (existing.harga_per_kg === 0 && hargaPerKg > 0) {
          existing.harga_per_kg = hargaPerKg;
        }
      } else {
        const colorIndex = groupMap.size % FALLBACK_PALETTE.length;
        const color = GRADE_COLORS[code] || FALLBACK_PALETTE[colorIndex];
        groupMap.set(code, {
          kode_grade: code,
          nama_grade: masterHargaMap.get(code)?.nama || `Grade ${code}`,
          harga_per_kg: hargaPerKg,
          balCount: 1,
          totalKg: berat,
          totalNilai: subtotalNilai,
          diGudangCount: b.status_stok === 'siap_kirim' ? 0 : 1,
          siapKirimCount: b.status_stok === 'siap_kirim' ? 1 : 0,
          color,
        });
      }
    });

    const rawList = Array.from(groupMap.values());

    // Hitung total keseluruhan untuk kalkulasi persentase
    const grandTotalBal = rawList.reduce((sum, item) => sum + item.balCount, 0);
    const grandTotalKg = rawList.reduce((sum, item) => sum + item.totalKg, 0);
    const grandTotalNilai = rawList.reduce((sum, item) => sum + item.totalNilai, 0);

    // Filter hanya grade yang memiliki stok atau yang terdaftar di master harga
    const listWithPercentages = rawList
      .map((item) => {
        const pctBal = grandTotalBal > 0 ? (item.balCount / grandTotalBal) * 100 : 0;
        const pctKg = grandTotalKg > 0 ? (item.totalKg / grandTotalKg) * 100 : 0;
        const pctNilai = grandTotalNilai > 0 ? (item.totalNilai / grandTotalNilai) * 100 : 0;

        return {
          ...item,
          displayName: `Grade ${item.kode_grade}`,
          labelWithPrice: `Grade ${item.kode_grade} (${formatRupiah(item.harga_per_kg)}/kg)`,
          shortPrice: `${(item.harga_per_kg / 1000).toFixed(0)}k/kg`,
          // Nilai metrik numerik untuk Recharts
          bal: item.balCount,
          tonase: Number(item.totalKg.toFixed(1)),
          tonaseTon: Number((item.totalKg / 1000).toFixed(2)),
          nilai: item.totalNilai,
          nilaiJuta: Number((item.totalNilai / 1_000_000).toFixed(2)),
          pctBal: Number(pctBal.toFixed(1)),
          pctKg: Number(pctKg.toFixed(1)),
          pctNilai: Number(pctNilai.toFixed(1)),
        };
      })
      // Urutkan berdasarkan harga per kg tertinggi ke terendah (Grade A -> F)
      .sort((a, b) => b.harga_per_kg - a.harga_per_kg || b.balCount - a.balCount);

    return {
      items: listWithPercentages,
      grandTotalBal,
      grandTotalKg,
      grandTotalNilai,
      weightedAvgPrice: grandTotalKg > 0 ? grandTotalNilai / grandTotalKg : 0,
    };
  }, [filteredBarang, hargaList, masterHargaMap]);

  // Ringkasan metrik utama
  const dominantGrade = useMemo(() => {
    if (aggregatedData.items.length === 0) return null;
    const sorted = [...aggregatedData.items].sort((a, b) => b.balCount - a.balCount);
    return sorted[0];
  }, [aggregatedData.items]);

  // Format nilai sumbu Y dan tooltip
  const formatMetricValue = (val: number, mode: MetricMode) => {
    if (mode === 'bal') {
      return `${val.toLocaleString('id-ID')} Bal`;
    }
    if (mode === 'tonase') {
      return `${val.toLocaleString('id-ID')} kg`;
    }
    return `Rp ${(val / 1_000_000).toFixed(1)} Jt`;
  };

  const currentMetricKey = useMemo(() => {
    if (metricMode === 'bal') return 'bal';
    if (metricMode === 'tonase') return 'tonase';
    return 'nilai';
  }, [metricMode]);

  const currentMetricLabel = useMemo(() => {
    if (metricMode === 'bal') return 'Jumlah Bal Fisik';
    if (metricMode === 'tonase') return 'Total Tonase (kg)';
    return 'Valuasi Stok (Rp)';
  }, [metricMode]);

  // Export CSV data distribusi stok harga beli
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Kode Grade Harga',
      'Nama Klasifikasi',
      'Tarif Harga Beli (Rp/kg)',
      'Jumlah Bal (Pcs)',
      'Total Berat (Kg)',
      'Total Berat (Ton)',
      'Valuasi Stok (Rp)',
      'Pangsa Stok Bal (%)',
      'Pangsa Tonase (%)',
      'Pangsa Nilai (%)',
      'Status Gudang',
    ];

    const rows = aggregatedData.items.map((item, idx) => [
      idx + 1,
      item.kode_grade,
      item.nama_grade,
      item.harga_per_kg,
      item.balCount,
      item.totalKg.toFixed(2),
      (item.totalKg / 1000).toFixed(2),
      item.totalNilai,
      item.pctBal,
      item.pctKg,
      item.pctNilai,
      stockScope === 'aktif' ? 'Stok Aktif di Gudang' : 'Seluruh Inventaris',
    ]);

    downloadCsvFile('Distribusi_Stok_Kode_Harga_Beli_Tembakau', headers, rows);
  };

  // Custom Tooltip Recharts yang detail dan elegan
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-gray-900/95 text-white p-3 rounded-xs shadow-xl border border-gray-700 text-xs backdrop-blur-xs min-w-[220px]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-700">
          <div className="flex items-center space-x-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-sm text-amber-300">Grade {data.kode_grade}</span>
          </div>
          <span className="font-mono text-[11px] text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded-xs">
            {formatRupiah(data.harga_per_kg)}/kg
          </span>
        </div>

        <p className="text-[11px] text-gray-300 mb-2.5 font-medium">{data.nama_grade}</p>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center text-gray-300">
            <span>Fisik Tersimpan:</span>
            <span className="font-mono font-bold text-white">
              {data.balCount.toLocaleString('id-ID')} Bal ({data.pctBal}%)
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span>Total Tonase:</span>
            <span className="font-mono font-bold text-blue-300">
              {data.totalKg.toLocaleString('id-ID')} kg ({(data.totalKg / 1000).toFixed(2)} Ton)
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span>Valuasi Modal Beli:</span>
            <span className="font-mono font-bold text-emerald-400">
              Rp {data.totalNilai.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {data.siapKirimCount > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between text-[10px] text-gray-400">
            <span>Siap Kirim: {data.siapKirimCount} Bal</span>
            <span>Di Gudang: {data.diGudangCount} Bal</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id="distribusi-stok-harga-beli-card"
      className="bg-white border border-gray-200 shadow-xs overflow-hidden"
    >
      {/* Header Panel */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-red-50 text-[#b81d24] rounded-xs">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                Distribusi Stok Bal Berdasarkan Kode Harga Beli Tembakau
              </h2>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Visualisasi sebaran inventaris bal fisik, tonase, dan nilai modal berdasarkan kode grade & tarif harga beli petani.
            </p>
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filter Scope Stok */}
            <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-xs">
              <button
                type="button"
                onClick={() => setStockScope('aktif')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer ${
                  stockScope === 'aktif'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Hanya menghitung bal yang berstatus di gudang atau siap kirim"
              >
                Stok Aktif Gudang
              </button>
              <button
                type="button"
                onClick={() => setStockScope('semua')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer ${
                  stockScope === 'semua'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Menghitung seluruh riwayat bal terdaftar (intake, siap kirim, keluar)"
              >
                Semua Inventaris
              </button>
            </div>

            {/* Filter Lokasi Gudang */}
            {uniqueGudangList.length > 1 && (
              <div className="flex items-center space-x-1.5">
                <select
                  value={selectedGudang}
                  onChange={(e) => setSelectedGudang(e.target.value)}
                  className="px-2 py-1 text-[11px] font-semibold bg-white border border-gray-300 rounded-xs text-gray-700 cursor-pointer"
                >
                  <option value="ALL">Semua Gudang ({uniqueGudangList.length})</option>
                  {uniqueGudangList.map((gud) => (
                    <option key={gud} value={gud}>
                      {gud}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xs transition flex items-center space-x-1 cursor-pointer shadow-2xs"
              title="Unduh data distribusi stok per kode harga beli dalam format CSV"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Metric Selector & View Toggle Bar */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Metrik Toggle */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-[11px] font-medium text-gray-500 mr-1.5">Tampilkan Berdasarkan:</span>
            <button
              type="button"
              onClick={() => setMetricMode('bal')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition cursor-pointer flex items-center space-x-1 ${
                metricMode === 'bal'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Package className="w-3 h-3" />
              <span>Jumlah Bal (Pcs)</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('tonase')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition cursor-pointer flex items-center space-x-1 ${
                metricMode === 'tonase'
                  ? 'bg-blue-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Scale className="w-3 h-3" />
              <span>Tonase (Kg)</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('nilai')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition cursor-pointer flex items-center space-x-1 ${
                metricMode === 'nilai'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="font-bold text-[10px]">Rp</span>
              <span>Valuasi Stok (Rp)</span>
            </button>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-xs text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('dual')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer flex items-center space-x-1 ${
                viewMode === 'dual'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Tampilkan grafik batang dan donat secara berdampingan"
            >
              <Layers className="w-3 h-3" />
              <span>Dual Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer flex items-center space-x-1 ${
                viewMode === 'bar'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Grafik Batang Komparatif"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('donut')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer flex items-center space-x-1 ${
                viewMode === 'donut'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Grafik Donat Proporsi"
            >
              <PieChartIcon className="w-3 h-3" />
              <span>Donat</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer flex items-center space-x-1 ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Tabel Rincian Lengkap"
            >
              <TableIcon className="w-3 h-3" />
              <span>Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-200 bg-gray-50 border-b border-gray-200 text-xs">
        <div className="p-3">
          <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Total Bal Terdata
          </div>
          <div className="text-base font-bold text-gray-900 mt-0.5">
            {aggregatedData.grandTotalBal.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-normal text-gray-500">Bal</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {stockScope === 'aktif' ? 'Status: Di Gudang / Siap Kirim' : 'Seluruh status intake'}
          </div>
        </div>

        <div className="p-3">
          <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Total Tonase Tersimpan
          </div>
          <div className="text-base font-bold text-blue-900 mt-0.5">
            {aggregatedData.grandTotalKg.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-normal text-gray-500">
              kg ({(aggregatedData.grandTotalKg / 1000).toFixed(2)} Ton)
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Rata-rata: {(aggregatedData.grandTotalBal > 0 ? aggregatedData.grandTotalKg / aggregatedData.grandTotalBal : 0).toFixed(1)} kg / bal
          </div>
        </div>

        <div className="p-3">
          <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Valuasi Stok Modal
          </div>
          <div className="text-base font-bold text-emerald-800 mt-0.5">
            Rp {aggregatedData.grandTotalNilai.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Tertimbang: {formatRupiah(Math.round(aggregatedData.weightedAvgPrice))}/kg
          </div>
        </div>

        <div className="p-3">
          <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Kode Harga Dominan
          </div>
          {dominantGrade ? (
            <div className="mt-0.5">
              <span className="font-bold text-gray-900">Grade {dominantGrade.kode_grade}</span>{' '}
              <span className="text-gray-500 font-mono text-[11px]">
                ({formatRupiah(dominantGrade.harga_per_kg)}/kg)
              </span>
              <div className="text-[10px] text-gray-600 font-medium mt-0.5">
                {dominantGrade.balCount} Bal ({dominantGrade.pctBal}% dari total)
              </div>
            </div>
          ) : (
            <div className="text-gray-400 mt-0.5">-</div>
          )}
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="p-4">
        {aggregatedData.items.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            <Package className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
            <p>Tidak ada data bal tembakau yang sesuai dengan filter yang dipilih.</p>
          </div>
        ) : (
          <div>
            {/* View Mode: Dual (Bar + Donut) */}
            {viewMode === 'dual' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Bar Chart (7 Cols) */}
                <div className="lg:col-span-7">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800">
                      Grafik Perbandingan: {currentMetricLabel} per Kode Harga
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Urutan: Tarif Tertinggi → Terendah
                    </span>
                  </div>
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={aggregatedData.items}
                        margin={{ top: 15, right: 15, left: 0, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="displayName"
                          tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                          tickFormatter={(val) => {
                            if (metricMode === 'nilai') {
                              return `${(val / 1_000_000).toFixed(0)}Jt`;
                            }
                            if (val >= 1000) {
                              return `${(val / 1000).toFixed(1)}k`;
                            }
                            return val;
                          }}
                        />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar
                          dataKey={currentMetricKey}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={48}
                        >
                          {aggregatedData.items.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Chart (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-800">
                      Pangsa Proporsi (%)
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {currentMetricLabel}
                    </span>
                  </div>
                  <div className="w-full h-72 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={aggregatedData.items}
                          dataKey={currentMetricKey}
                          nameKey="displayName"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={2}
                        >
                          {aggregatedData.items.map((entry, index) => (
                            <Cell key={`cell-pie-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomBarTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Summary */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        Total
                      </span>
                      <span className="text-sm font-extrabold text-gray-900">
                        {metricMode === 'bal'
                          ? `${aggregatedData.grandTotalBal} Bal`
                          : metricMode === 'tonase'
                          ? `${(aggregatedData.grandTotalKg / 1000).toFixed(1)} Ton`
                          : `Rp ${(aggregatedData.grandTotalNilai / 1_000_000).toFixed(0)} Jt`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode: Single Bar Chart */}
            {viewMode === 'bar' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold text-gray-900">
                      Grafik Batang: Distribusi {currentMetricLabel} Berdasarkan Kode Harga Beli
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-gray-600">
                    Total: {formatMetricValue(
                      metricMode === 'bal'
                        ? aggregatedData.grandTotalBal
                        : metricMode === 'tonase'
                        ? aggregatedData.grandTotalKg
                        : aggregatedData.grandTotalNilai,
                      metricMode
                    )}
                  </span>
                </div>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={aggregatedData.items}
                      margin={{ top: 15, right: 20, left: 10, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="labelWithPrice"
                        tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                        interval={0}
                        angle={-10}
                        textAnchor="end"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                        tickFormatter={(val) => {
                          if (metricMode === 'nilai') {
                            return `Rp ${(val / 1_000_000).toFixed(0)}Jt`;
                          }
                          if (val >= 1000) {
                            return `${(val / 1000).toFixed(1)}k`;
                          }
                          return val;
                        }}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar
                        dataKey={currentMetricKey}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={56}
                      >
                        {aggregatedData.items.map((entry, index) => (
                          <Cell key={`cell-bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* View Mode: Single Donut Chart */}
            {viewMode === 'donut' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-7 h-80 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={aggregatedData.items}
                        dataKey={currentMetricKey}
                        nameKey="displayName"
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={120}
                        paddingAngle={2}
                      >
                        {aggregatedData.items.map((entry, index) => (
                          <Cell key={`cell-donut-full-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomBarTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                      Total Stok
                    </span>
                    <span className="text-base font-extrabold text-gray-900">
                      {metricMode === 'bal'
                        ? `${aggregatedData.grandTotalBal} Bal`
                        : metricMode === 'tonase'
                        ? `${(aggregatedData.grandTotalKg / 1000).toFixed(1)} Ton`
                        : `Rp ${(aggregatedData.grandTotalNilai / 1_000_000).toFixed(0)} Jt`}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {aggregatedData.items.length} Kode Harga
                    </span>
                  </div>
                </div>

                {/* Legend Cards List */}
                <div className="md:col-span-5 space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  <div className="text-xs font-bold text-gray-800 mb-2">Rincian Komposisi:</div>
                  {aggregatedData.items.map((item) => (
                    <div
                      key={item.kode_grade}
                      className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xs border border-gray-200 flex items-center justify-between text-xs transition"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-3 h-3 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <span className="font-bold text-gray-900">Grade {item.kode_grade}</span>{' '}
                          <span className="text-gray-500 text-[11px]">
                            ({formatRupiah(item.harga_per_kg)}/kg)
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-gray-800">
                          {metricMode === 'bal'
                            ? `${item.balCount} Bal`
                            : metricMode === 'tonase'
                            ? `${item.totalKg.toLocaleString('id-ID')} kg`
                            : `Rp ${(item.totalNilai / 1_000_000).toFixed(1)} Jt`}
                        </div>
                        <div className="text-[10px] text-gray-500 font-semibold">
                          {metricMode === 'bal'
                            ? `${item.pctBal}%`
                            : metricMode === 'tonase'
                            ? `${item.pctKg}%`
                            : `${item.pctNilai}%`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View Mode: Table or Bottom Summary Matrix */}
            {(viewMode === 'table' || viewMode === 'dual') && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-gray-500" />
                    <span>Tabel Rincian Lengkap per Kode Tarif Harga Beli</span>
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Menampilkan {aggregatedData.items.length} kode harga beli aktif
                  </span>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Kode Grade</th>
                        <th className="py-2.5 px-3">Nama Klasifikasi Mutu</th>
                        <th className="py-2.5 px-3 text-right">Tarif Beli (Rp/kg)</th>
                        <th className="py-2.5 px-3 text-center">Fisik Bal</th>
                        <th className="py-2.5 px-3 text-center">Pangsa Bal</th>
                        <th className="py-2.5 px-3 text-right">Tonase (Kg)</th>
                        <th className="py-2.5 px-3 text-right">Valuasi Stok Modal (Rp)</th>
                        <th className="py-2.5 px-3 text-center">Status Gudang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {aggregatedData.items.map((item) => (
                        <tr key={item.kode_grade} className="hover:bg-gray-50/80 transition">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-mono font-bold text-gray-900">
                                Grade {item.kode_grade}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-700 font-medium">
                            {item.nama_grade}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                            {formatRupiah(item.harga_per_kg)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-900">
                            {item.balCount.toLocaleString('id-ID')} Bal
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center space-x-1.5">
                              <span className="font-bold text-[#b81d24]">{item.pctBal}%</span>
                              <div className="w-12 bg-gray-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-zinc-800"
                                  style={{ width: `${Math.min(100, item.pctBal * 2.5)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-900">
                            {item.totalKg.toLocaleString('id-ID')} kg
                            <span className="text-[10px] text-gray-500 block">
                              ({(item.totalKg / 1000).toFixed(2)} Ton)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                            Rp {item.totalNilai.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold rounded-xs">
                              {item.diGudangCount} Simpan
                              {item.siapKirimCount > 0 && ` • ${item.siapKirimCount} Siap Kirim`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold text-gray-900 border-t border-gray-300">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-left uppercase text-[11px]">
                          Total Keseluruhan
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {aggregatedData.grandTotalBal.toLocaleString('id-ID')} Bal
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          100.0%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-950">
                          {aggregatedData.grandTotalKg.toLocaleString('id-ID')} kg
                          <span className="text-[10px] text-gray-600 block">
                            ({(aggregatedData.grandTotalKg / 1000).toFixed(2)} Ton)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-950">
                          Rp {aggregatedData.grandTotalNilai.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] text-gray-600">
                          Rata-rata: {formatRupiah(Math.round(aggregatedData.weightedAvgPrice))}/kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info Notice */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-500">
        <div className="flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>
            Tarif dan ketentuan grade terintegrasi langsung dengan Master Tabel Harga Beli Tembakau.
          </span>
        </div>
        {onNavigateToHarga && (
          <button
            type="button"
            onClick={onNavigateToHarga}
            className="text-[#b81d24] hover:underline font-semibold flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Buka Master Harga Beli</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

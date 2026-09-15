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

// Helper pemotongan teks (truncate) untuk label pada sumbu X agar tidak saling bertumpuk
const truncateLabel = (value: string | undefined | null, maxLength: number = 12): string => {
  if (!value) return '';
  const str = String(value).trim();
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
};

export const DistribusiStokHargaBeliChart: React.FC<DistribusiStokHargaBeliChartProps> = ({
  barangList = [],
  hargaList = [],
  onNavigateToHarga,
  onNavigateToGudang,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('bal');
  const [viewMode, setViewMode] = useState<ViewMode>('dual');
  const [stockScope, setStockScope] = useState<StockScope>('aktif');
  const [filterEmptyStock, setFilterEmptyStock] = useState<boolean>(true);

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

      return true;
    });
  }, [barangList, stockScope]);

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
          shortPriceLabel: item.harga_per_kg > 0 ? `Grade ${item.kode_grade} (${(item.harga_per_kg / 1000).toLocaleString('id-ID')}k)` : `Grade ${item.kode_grade}`,
          codeLabel: `G.${item.kode_grade}`,
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

  // Data yang dikirim ke grafik: otomatis menyembunyikan grade berstok 0 agar sumbu X rapi dan tidak tumpang tindih
  const chartItems = useMemo(() => {
    if (filterEmptyStock) {
      const activeOnly = aggregatedData.items.filter((item) => item.balCount > 0 || item.totalKg > 0);
      return activeOnly.length > 0 ? activeOnly : aggregatedData.items;
    }
    return aggregatedData.items;
  }, [aggregatedData.items, filterEmptyStock]);

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

  // Custom Tooltip Recharts yang detail, informatif, dan interaktif
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    if (!data) return null;

    const avgBeratPerBal = data.balCount > 0 ? (data.totalKg / data.balCount).toFixed(1) : '0';
    const activePct = metricMode === 'nilai' ? data.pctNilai : metricMode === 'tonase' ? data.pctKg : data.pctBal;

    return (
      <div className="bg-gray-900/95 text-white p-3.5 rounded-xs shadow-2xl border border-gray-700 text-xs backdrop-blur-md min-w-[260px] max-w-[300px] pointer-events-none">
        {/* Header Tooltip */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-700/80">
          <div className="flex items-center space-x-2">
            <span
              className="w-3 h-3 rounded-full inline-block shrink-0 border border-white/40"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-sm text-amber-300">Grade {data.kode_grade}</span>
          </div>
          <span className="font-mono text-[11px] text-amber-200 bg-gray-800 px-2 py-0.5 rounded-xs font-bold border border-gray-700">
            {formatRupiah(data.harga_per_kg)}/kg
          </span>
        </div>

        <p className="text-[11px] text-gray-300 mb-2 font-medium leading-tight">{data.nama_grade}</p>

        {/* Highlight Card Sesuai Metrik Aktif */}
        <div className="bg-gray-800/80 p-2 rounded-xs mb-2.5 border border-gray-700/60">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-400 font-medium">Metrik {currentMetricLabel}:</span>
            <span className="font-mono font-black text-white text-xs">
              {formatMetricValue(
                metricMode === 'bal' ? data.bal : metricMode === 'tonase' ? data.tonase : data.nilai,
                metricMode
              )}
            </span>
          </div>
          <div className="mt-1.5">
            <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 font-mono">
              <span>Pangsa Stok:</span>
              <span className="font-bold text-amber-300">{activePct}%</span>
            </div>
            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(2, activePct))}%`,
                  backgroundColor: data.color,
                }}
              />
            </div>
          </div>
        </div>

        {/* Rincian Angka Lengkap */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center text-gray-300">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              <span>Jumlah Bal:</span>
            </span>
            <span className="font-mono font-bold text-white">
              {data.balCount.toLocaleString('id-ID')} Bal <span className="text-[10px] text-gray-400 font-normal">({data.pctBal}%)</span>
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-300">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              <span>Total Tonase:</span>
            </span>
            <span className="font-mono font-bold text-blue-300">
              {data.totalKg.toLocaleString('id-ID')} kg <span className="text-[10px] text-gray-400 font-normal">({(data.totalKg / 1000).toFixed(2)} Ton)</span>
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-300">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>Valuasi Modal:</span>
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {formatRupiah(data.totalNilai)}
            </span>
          </div>
        </div>

        {/* Status Lokasi & Rata-rata */}
        <div className="mt-2.5 pt-2 border-t border-gray-800 grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="bg-gray-800/70 p-1.5 rounded-xs">
            <p className="text-gray-400">Rata-rata/Bal</p>
            <p className="font-mono font-bold text-gray-200 mt-0.5">{avgBeratPerBal} kg/bal</p>
          </div>
          <div className="bg-gray-800/70 p-1.5 rounded-xs">
            <p className="text-gray-400">Status Stok</p>
            <p className="font-mono font-bold text-gray-200 mt-0.5 truncate">
              {data.siapKirimCount > 0 ? `${data.siapKirimCount} Siap Kirim` : `${data.diGudangCount} Di Gudang`}
            </p>
          </div>
        </div>
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
            {/* Filter Ada Stok vs Semua Grade Master */}
            <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-xs">
              <button
                type="button"
                onClick={() => setFilterEmptyStock(true)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer ${
                  filterEmptyStock
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Hanya menampilkan grade yang memiliki stok fisik di gudang agar grafik rapi"
              >
                Ada Stok ({aggregatedData.items.filter((i) => i.balCount > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterEmptyStock(false)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs transition cursor-pointer ${
                  !filterEmptyStock
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Tampilkan semua grade termasuk yang stoknya 0"
              >
                Semua Grade ({aggregatedData.items.length})
              </button>
            </div>

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
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-800">
                        Grafik Perbandingan: {currentMetricLabel} per Kode Harga
                      </span>
                      {chartItems.length > 8 && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-xs font-medium">
                          ↔ Geser grafik
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Urutan: Tarif Tertinggi → Terendah
                    </span>
                  </div>
                  <div className="w-full h-72 overflow-x-auto overflow-y-hidden">
                    <div
                      className="h-full"
                      style={{
                        minWidth: chartItems.length > 8 ? `${Math.max(480, chartItems.length * 40)}px` : '100%',
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartItems}
                          margin={{ top: 15, right: 15, left: 0, bottom: chartItems.length > 7 ? 40 : 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey={chartItems.length > 16 ? 'codeLabel' : 'displayName'}
                            tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                            interval={0}
                            angle={chartItems.length > 6 ? -35 : 0}
                            textAnchor={chartItems.length > 6 ? 'end' : 'middle'}
                            height={chartItems.length > 6 ? 45 : 30}
                            tickFormatter={(val) => truncateLabel(val, chartItems.length > 16 ? 8 : 12)}
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
                            {chartItems.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
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
                          data={chartItems}
                          dataKey={currentMetricKey}
                          nameKey="displayName"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={2}
                        >
                          {chartItems.map((entry, index) => (
                            <Cell key={`cell-pie-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomBarTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode: Single Bar Chart */}
            {viewMode === 'bar' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-900">
                      Grafik Batang: Distribusi {currentMetricLabel} Berdasarkan Kode Harga Beli
                    </span>
                    {chartItems.length > 12 && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-xs font-medium">
                        ↔ Geser horizontal untuk melihat seluruh {chartItems.length} grade
                      </span>
                    )}
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
                <div className="w-full h-80 overflow-x-auto overflow-y-hidden">
                  <div
                    className="h-full"
                    style={{
                      minWidth: chartItems.length > 12 ? `${Math.max(680, chartItems.length * 48)}px` : '100%',
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartItems}
                        margin={{ top: 15, right: 20, left: 10, bottom: chartItems.length > 5 ? 50 : 35 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey={chartItems.length > 25 ? 'codeLabel' : chartItems.length > 10 ? 'displayName' : 'shortPriceLabel'}
                          tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                          interval={0}
                          angle={chartItems.length > 5 ? -30 : 0}
                          textAnchor={chartItems.length > 5 ? 'end' : 'middle'}
                          height={chartItems.length > 5 ? 50 : 35}
                          tickFormatter={(val) => truncateLabel(val, chartItems.length > 20 ? 8 : 14)}
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
                          {chartItems.map((entry, index) => (
                            <Cell key={`cell-bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
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
                        data={chartItems}
                        dataKey={currentMetricKey}
                        nameKey="displayName"
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={120}
                        paddingAngle={2}
                      >
                        {chartItems.map((entry, index) => (
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
                      {chartItems.length} Kode Harga
                    </span>
                  </div>
                </div>

                {/* Legend Cards List */}
                <div className="md:col-span-5 space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  <div className="text-xs font-bold text-gray-800 mb-2">Rincian Komposisi:</div>
                  {chartItems.map((item, idx) => (
                    <div
                      key={`${item.kode_grade}-${idx}`}
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

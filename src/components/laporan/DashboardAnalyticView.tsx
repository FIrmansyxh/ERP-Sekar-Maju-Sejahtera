import React, { useMemo, useState } from 'react';
import { 
  DollarSign, 
  Scale, 
  Package, 
  CheckCircle2, 
  Download, 
  TrendingUp, 
  Award, 
  Building2, 
  FileText, 
  ArrowUpRight,
  ShieldCheck,
  Layers,
  Users,
  Tag,
  Activity,
  Calendar,
  Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Barang, 
  TransaksiPembelian, 
  PengirimanSample, 
  PengirimanBarang, 
  TabelHarga,
  MasterHargaJual,
  UserRole 
} from '../../types';
import { downloadCsvFile } from '../../utils/printDownload';
import { formatRupiah } from '../../utils/formatters';
import { loadHargaJualData } from '../../utils/storage';
import {
  hitungTotalModal,
  hitungTotalPenjualan,
  hitungValuasiGudang,
  hitungProfitBersih,
  hitungValuasiStokGudang,
  hitungProfitPengiriman,
  hitungModalTransaksi,
} from '../../utils/finance';
import { GRADE_PALETTE, getGradePalette } from './LaporanGradeView';
import { DistribusiStokHargaBeliChart } from './DistribusiStokHargaBeliChart';

interface DashboardAnalyticViewProps {
  transaksiList: TransaksiPembelian[];
  barangList: Barang[];
  sampleList: PengirimanSample[];
  pengirimanList: PengirimanBarang[];
  hargaList?: TabelHarga[];
  hargaJualList?: MasterHargaJual[];
  userRole: UserRole;
  onNavigateToModule?: (moduleId: string) => void;
}

// Helper pemotongan teks (truncate) untuk label pada sumbu X agar tidak saling bertumpuk
const truncateLabel = (value: string | undefined | null, maxLength: number = 10): string => {
  if (!value) return '';
  const str = String(value).trim();
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
};

export const DashboardAnalyticView: React.FC<DashboardAnalyticViewProps> = ({
  transaksiList = [],
  barangList = [],
  sampleList = [],
  pengirimanList = [],
  hargaList = [],
  hargaJualList = [],
  userRole,
  onNavigateToModule,
}) => {
  const isQCOnly = userRole === 'qc_mutu';

  // State Filter Rentang Waktu & Metrik Analisis Tren
  type PeriodeWaktu = 'mingguan' | 'bulanan' | 'kuartalan' | 'tahunan';
  type MetricTren = 'bal' | 'tonase' | 'nilai';

  const [periodeWaktu, setPeriodeWaktu] = useState<PeriodeWaktu>('bulanan');
  const [selectedTahun, setSelectedTahun] = useState<string>('semua');
  const [trendMetric, setTrendMetric] = useState<MetricTren>('bal');

  // 1. Total Pembelian (Modal Murni: Netto × Harga Beli, abaikan potongan tali/kuli/tikar)
  const totalPembelianRupiah = useMemo(() => {
    // HANYA hitung pembelian jika transaksi sudah LUNAS (dibayar)
    const lunasTrx = transaksiList.filter(t => t.status_pembayaran === 'lunas');
    return hitungTotalModal(lunasTrx);
  }, [transaksiList]);

  // Total Bal yang Dibeli
  const totalBalDibeli = useMemo(() => {
    return transaksiList.reduce((sum, t) => {
      if (t.status_pembayaran !== 'lunas') return sum;
      const count = t.total_bal || (t.items && t.items.length > 0 ? t.items.length : (t.barang_ids ? t.barang_ids.length : 1));
      return sum + count;
    }, 0);
  }, [transaksiList]);

  // 2. Tonase Masuk (Intake) (Sum Netto kg)
  const totalTonaseMasukKg = useMemo(() => {
    return transaksiList.reduce((sum, t) => {
      // HANYA hitung tonase masuk jika transaksi sudah LUNAS (dibayar)
      if (t.status_pembayaran !== 'lunas') return sum;
      return sum + (t.berat_kg || 0);
    }, 0);
  }, [transaksiList]);

  // 3. Stok Aktif di Gudang & 4. Valuasi (Stok Gudang = Sisa bal di gudang × Netto × Harga Beli)
  const stokAktifGudang = useMemo(() => {
    // Filter out items that are orphaned from non-lunas transactions if applicable
    const validRefsFromTx = new Set<string>();
    transaksiList.forEach(tx => { 
      if (tx.status_pembayaran === "lunas") {
        tx.items?.forEach(item => {
          if (item.barang_id) validRefsFromTx.add(item.barang_id);
          if (item.no_bal) validRefsFromTx.add(item.no_bal);
          if (item.barcode) validRefsFromTx.add(item.barcode);
        });
        tx.barang_ids?.forEach(id => validRefsFromTx.add(id)); 
      }
    });

    const validBarangList = barangList.filter(b => {
      if (b.transaksi_pembelian_id && !validRefsFromTx.has(b.barang_id) && !validRefsFromTx.has(b.no_bal)) return false;
      return true;
    });

    return hitungValuasiStokGudang(validBarangList, hargaList);
  }, [barangList, transaksiList, hargaList]);

  // Helper to get fallback price
  const getPriceByGrade = (kodeGrade: string) => {
    const h = (hargaList || []).find(x => (x.kode_grade || '').toUpperCase() === (kodeGrade || '').toUpperCase());
    return h ? (h.harga_per_kg || 50000) : 50000;
  };

  // 4. Valuasi (Stok Gudang) menggunakan helper hitungValuasiGudang
  const totalValuasiRupiah = useMemo(() => {
    return hitungValuasiGudang(stokAktifGudang.items, hargaList);
  }, [stokAktifGudang, hargaList]);

  // Master Harga Jual Aktif
  const activeHargaJualMaster = useMemo(() => {
    if (hargaJualList && hargaJualList.length > 0) return hargaJualList;
    return loadHargaJualData();
  }, [hargaJualList]);

  // 5. Metrik Bal Terkirim, Total Penjualan & Keuntungan Bersih (Menggunakan helper terpusat hitungProfitPengiriman)
  const shippedBalMetrics = useMemo(() => {
    return hitungProfitPengiriman(
      pengirimanList,
      barangList,
      activeHargaJualMaster,
      hargaList
    );
  }, [pengirimanList, barangList, activeHargaJualMaster, hargaList]);

  // Total Penjualan menggunakan helper hitungTotalPenjualan
  const totalPenjualanRupiah = useMemo(() => {
    return hitungTotalPenjualan([
      {
        total_nilai_deal: shippedBalMetrics.totalPenjualan,
      },
    ]);
  }, [shippedBalMetrics]);

  // Total Keuntungan Bersih = Selisih (Harga Jual - Harga Beli) bal terkirim menggunakan hitungProfitBersih
  const totalKeuntunganBersih = useMemo(() => {
    return hitungProfitBersih([
      {
        total_penjualan: shippedBalMetrics.totalPenjualan,
        total_modal: shippedBalMetrics.totalHargaBeliTerkirim,
      },
    ]);
  }, [shippedBalMetrics]);

  // Total Terkirim ke Pabrik Luar (Reguler)
  const totalTerkirimKg = shippedBalMetrics.totalKgTerkirim;
  

  // 4. Approval Rate Lab QC
  const qcStats = useMemo(() => {
    const totalSample = sampleList.length;
    const approvedSample = sampleList.filter(s => s.status === 'disetujui' || s.status === 'diterima').length;
    const rate = totalSample > 0 ? (approvedSample / totalSample) * 100 : 100;
    return {
      totalSample,
      approvedSample,
      rate,
    };
  }, [sampleList]);

  // 9.2 Top 5 Harga Beli Paling Banyak Muncul
  const topHargaBeli = useMemo(() => {
    const priceMap = new Map<number, { harga: number; count: number; totalKg: number; totalNilai: number }>();

    transaksiList.forEach(tx => { if (tx.status_pembayaran === "lunas") {
      const p = tx.harga_per_kg || 0;
      if (p > 0) {
        const existing = priceMap.get(p) || { harga: p, count: 0, totalKg: 0, totalNilai: 0 };
        existing.count += 1;
        existing.totalKg += (tx.berat_kg || 0);
        existing.totalNilai += (tx.total_harga_beli || (tx.berat_kg || 0) * p);
        priceMap.set(p, existing);
      }
      if (tx.items) {
        tx.items.forEach(item => {
          const ip = item.harga_per_kg || p;
          if (ip > 0) {
            const existing = priceMap.get(ip) || { harga: ip, count: 0, totalKg: 0, totalNilai: 0 };
            existing.count += 1;
            existing.totalKg += (item.berat_kg || 0);
            existing.totalNilai += ((item.berat_kg || 0) * ip);
            priceMap.set(ip, existing);
          }
        });
      }
    }
    });



    const list = Array.from(priceMap.values());
    const totalCount = list.reduce((sum, i) => sum + i.count, 0) || 1;
    const maxCount = Math.max(...list.map(i => i.count), 1);

    return list
      .sort((a, b) => b.count - a.count || b.harga - a.harga)
      .slice(0, 5)
      .map(item => ({
        ...item,
        percentage: (item.count / totalCount) * 100,
        relativePercentage: (item.count / maxCount) * 100,
      }));
  }, [transaksiList, hargaList]);

  // 9.3 Top 5 Petani Penyetor Terbanyak
  const topPetani = useMemo(() => {
    const map = new Map<string, { nama: string; balCount: number; totalKg: number; totalNilai: number }>();

    transaksiList.forEach(t => {
      const key = t.petani_id || t.nama_petani;
      const existing = map.get(key) || { nama: t.nama_petani, balCount: 0, totalKg: 0, totalNilai: 0 };
      
      // Murni modal harga beli tembakau (netto × harga beli), abaikan potongan
      const subtotal = hitungModalTransaksi(t);

      const balInTx = t.total_bal || (t.items && t.items.length) || (t.barang_ids && t.barang_ids.length) || 1;

      existing.balCount += balInTx;
      existing.totalKg += (t.berat_kg || 0);
      existing.totalNilai += subtotal;
      map.set(key, existing);
    });

    // Reconcile with exact bal count in inventaris bal gudang if barangList is provided
    if (barangList && barangList.length > 0) {
      map.forEach((val, key) => {
        const balInGudang = barangList.filter(b => b.petani_id === key || b.nama_petani === val.nama).length;
        if (balInGudang > 0) {
          val.balCount = balInGudang;
        }
      });
    }

    const sorted = Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
    return sorted.slice(0, 5);
  }, [transaksiList, barangList]);


  // Profitabilitas (Disinkronkan dengan rumus shippedBalMetrics)
  const profitStats = useMemo(() => {
    return {
      netProfit: shippedBalMetrics.keuntunganBersih,
      totalProfitPct: shippedBalMetrics.roiPct,
      avgProfitPctPerBal: shippedBalMetrics.totalBalTerkirim > 0 ? (shippedBalMetrics.roiPct / shippedBalMetrics.totalBalTerkirim) : 0,
      soldBalCount: shippedBalMetrics.totalBalTerkirim,
      totalHargaBeliSold: shippedBalMetrics.totalHargaBeliTerkirim,
      totalHargaJualSold: shippedBalMetrics.totalPenjualan,
    };
  }, [shippedBalMetrics]);

  // Daftar tahun unik dari data transaksi untuk filter tahun
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transaksiList.forEach((trx) => {
      if (trx.tanggal_transaksi) {
        const yr = trx.tanggal_transaksi.substring(0, 4);
        if (yr && !isNaN(Number(yr))) {
          years.add(yr);
        }
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transaksiList]);

  // Agregasi Fleksibel: Mingguan, Bulanan, Kuartalan, Tahunan
  const trendPembelianData = useMemo(() => {
    // Filter transaksi berdasarkan selectedTahun jika bukan 'semua'
    const filteredTrx = transaksiList.filter((trx) => {
      if (!trx.tanggal_transaksi) return false;
      if (selectedTahun !== 'semua') {
        return trx.tanggal_transaksi.startsWith(selectedTahun);
      }
      return true;
    });

    const periodMap = new Map<string, {
      key: string;
      label: string;
      fullLabel: string;
      totalBal: number;
      totalKg: number;
      totalNilai: number;
      countTrx: number;
    }>();

    filteredTrx.forEach((trx) => {
      if (!trx.tanggal_transaksi) return;
      const dateStr = trx.tanggal_transaksi.split('T')[0];
      const parts = dateStr.split('-');
      if (parts.length < 3) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10); // 1-12
      const day = parseInt(parts[2], 10);

      if (!year || isNaN(year) || !month || isNaN(month)) return;

      let periodKey = '';
      let label = '';
      let fullLabel = '';

      if (periodeWaktu === 'tahunan') {
        periodKey = `${year}`;
        label = `${year}`;
        fullLabel = `Tahun ${year}`;
      } else if (periodeWaktu === 'kuartalan') {
        const q = Math.ceil(month / 3);
        periodKey = `${year}-Q${q}`;
        label = `Q${q} '${String(year).slice(2)}`;
        const qMonths = q === 1 ? 'Jan-Mar' : q === 2 ? 'Apr-Jun' : q === 3 ? 'Jul-Sep' : 'Okt-Des';
        fullLabel = `Kuartal ${q} ${year} (${qMonths})`;
      } else if (periodeWaktu === 'mingguan') {
        const weekOfMonth = Math.min(4, Math.ceil(day / 7));
        const monthShort = new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'short' });
        periodKey = `${year}-${String(month).padStart(2, '0')}-W${weekOfMonth}`;
        label = `M${weekOfMonth} ${monthShort} '${String(year).slice(2)}`;
        fullLabel = `Minggu ke-${weekOfMonth} ${monthShort} ${year}`;
      } else {
        // 'bulanan' default
        periodKey = `${year}-${String(month).padStart(2, '0')}`;
        const d = new Date(year, month - 1, 1);
        label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        fullLabel = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      }

      const balCount = trx.total_bal || (trx.items && trx.items.length > 0 ? trx.items.length : (trx.barang_ids ? trx.barang_ids.length : 1));
      const kgCount = trx.berat_kg || 0;
      const nilaiCount = hitungModalTransaksi(trx);

      if (periodMap.has(periodKey)) {
        const existing = periodMap.get(periodKey)!;
        existing.totalBal += balCount;
        existing.totalKg += kgCount;
        existing.totalNilai += nilaiCount;
        existing.countTrx += 1;
      } else {
        periodMap.set(periodKey, {
          key: periodKey,
          label,
          fullLabel,
          totalBal: balCount,
          totalKg: kgCount,
          totalNilai: nilaiCount,
          countTrx: 1,
        });
      }
    });

    return Array.from(periodMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => ({
        ...item,
        totalBal: Math.round(item.totalBal),
        totalKg: Number(item.totalKg.toFixed(1)),
        totalNilai: Math.round(item.totalNilai),
        tonaseTon: Number((item.totalKg / 1000).toFixed(2)),
        nilaiJuta: Number((item.totalNilai / 1_000_000).toFixed(2)),
      }));
  }, [transaksiList, periodeWaktu, selectedTahun]);

  const grandTotalTrend = useMemo(() => {
    return trendPembelianData.reduce(
      (acc, item) => ({
        bal: acc.bal + item.totalBal,
        kg: acc.kg + item.totalKg,
        nilai: acc.nilai + item.totalNilai,
      }),
      { bal: 0, kg: 0, nilai: 0 }
    );
  }, [trendPembelianData]);

  // Custom Interactive Tooltip untuk Tren Pembelian (solid, non-transparan)
  const CustomTrendTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    if (!data) return null;

    const pctBal = grandTotalTrend.bal > 0 ? ((data.totalBal / grandTotalTrend.bal) * 100).toFixed(1) : '0';
    const pctKg = grandTotalTrend.kg > 0 ? ((data.totalKg / grandTotalTrend.kg) * 100).toFixed(1) : '0';
    const pctNilai = grandTotalTrend.nilai > 0 ? ((data.totalNilai / grandTotalTrend.nilai) * 100).toFixed(1) : '0';

    const avgBeratPerBal = data.totalBal > 0 ? (data.totalKg / data.totalBal).toFixed(1) : '0';
    const avgHargaPerKg = data.totalKg > 0 ? Math.round(data.totalNilai / data.totalKg) : 0;
    const avgNilaiPerTrx = data.countTrx > 0 ? Math.round(data.totalNilai / data.countTrx) : 0;

    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-md shadow-2xl border border-slate-700 text-xs min-w-[260px] max-w-[320px] pointer-events-none opacity-100">
        {/* Header Tooltip */}
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <span className="p-1 bg-red-950 text-red-400 rounded-xs border border-red-800">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            <div>
              <p className="font-bold text-sm text-slate-100 tracking-tight leading-tight">
                {data.fullLabel || data.label}
              </p>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Periode {periodeWaktu}
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px] bg-slate-800 text-amber-300 font-bold px-2 py-0.5 rounded-xs border border-slate-700">
            {data.countTrx} Transaksi
          </span>
        </div>

        {/* Primary Metric Highlight Box */}
        <div
          className={`p-2.5 rounded-xs mb-2.5 border ${
            trendMetric === 'nilai'
              ? 'bg-blue-950 border-blue-800'
              : trendMetric === 'tonase'
              ? 'bg-emerald-950 border-emerald-800'
              : 'bg-red-950 border-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">
              {trendMetric === 'nilai'
                ? 'Total Modal Pembelian:'
                : trendMetric === 'tonase'
                ? 'Total Tonase Tembakau:'
                : 'Volume Bal Masuk:'}
            </span>
            <span
              className={`font-mono text-sm font-black ${
                trendMetric === 'nilai'
                  ? 'text-blue-300'
                  : trendMetric === 'tonase'
                  ? 'text-emerald-300'
                  : 'text-red-300'
              }`}
            >
              {trendMetric === 'nilai'
                ? formatRupiah(data.totalNilai)
                : trendMetric === 'tonase'
                ? `${data.totalKg.toLocaleString('id-ID')} kg`
                : `${data.totalBal.toLocaleString('id-ID')} Bal`}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span>Kontribusi thd Total:</span>
            <span className="font-mono font-bold text-slate-200">
              {trendMetric === 'nilai' ? pctNilai : trendMetric === 'tonase' ? pctKg : pctBal}%
            </span>
          </div>
        </div>

        {/* Rincian Angka Lengkap */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              <span>Fisik Bal:</span>
            </span>
            <span className="font-mono font-bold text-white">
              {data.totalBal.toLocaleString('id-ID')} Bal <span className="text-[10px] text-slate-400 font-normal">({pctBal}%)</span>
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>Tonase Bersih:</span>
            </span>
            <span className="font-mono font-bold text-emerald-300">
              {data.totalKg.toLocaleString('id-ID')} kg <span className="text-[10px] text-slate-400 font-normal">({(data.totalKg / 1000).toFixed(2)} Ton)</span>
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              <span>Nilai Modal:</span>
            </span>
            <span className="font-mono font-bold text-blue-300">
              {formatRupiah(data.totalNilai)}
            </span>
          </div>
        </div>

        {/* Rata-Rata Statistik Sekunder */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="bg-slate-800 p-1.5 rounded-xs">
            <p className="text-slate-400">Rata-rata/Bal</p>
            <p className="font-mono font-bold text-slate-200 mt-0.5">{avgBeratPerBal} kg/bal</p>
          </div>
          <div className="bg-slate-800 p-1.5 rounded-xs">
            <p className="text-slate-400">Tarif Rata-rata</p>
            <p className="font-mono font-bold text-amber-300 mt-0.5">{formatRupiah(avgHargaPerKg)}/kg</p>
          </div>
        </div>
      </div>
    );
  };

  // Export functions 
  const exportBukuKasPembelian = () => {
    const headers = ['No', 'ID Transaksi', 'Kupon', 'Tanggal', 'Nama Petani', 'No Bal', 'Grade', 'Netto (kg)', 'Harga Beli (Rp/kg)', 'Potongan (Rp)', 'Jumlah Bayar (Rp)'];
    const rows = transaksiList.map((t, idx) => {
      const modal = hitungModalTransaksi(t);
      const potongan = Number(t.total_potongan || 0);
      const bayar = t.harga_final !== undefined && t.harga_final !== 0 ? t.harga_final : (modal - potongan);

      return [
        idx + 1,
        t.transaksi_id,
        t.no_kupon || '-',
        t.tanggal_transaksi ? t.tanggal_transaksi.split('T')[0] : '-',
        t.nama_petani,
        t.no_bal,
        t.kode_grade,
        t.berat_kg,
        t.harga_per_kg,
        potongan,
        bayar,
      ];
    });
    downloadCsvFile('Buku_Kas_Pembelian_Petani', headers, rows);
  };

  const exportInventarisBalGudang = () => {
    const headers = ['No', 'No Bal', 'Grade', 'Berat Netto (kg)', 'Status Stok', 'Lokasi Simpan', 'Tanggal Masuk', 'Petani'];
    const rows = barangList.map((b, idx) => [
      idx + 1,
      b.no_bal,
      b.kode_grade,
      b.berat_kg,
      b.status_stok,
      b.tanggal_masuk,
      b.nama_petani || '-',
    ]);
    downloadCsvFile('Inventaris_Bal_Gudang_Tembakau', headers, rows);
  };

  const exportDistribusiSuratJalan = () => {
    const headers = ['No', 'No Surat Jalan', 'Pabrik Tujuan', 'Nama Sopir', 'No Kendaraan', 'Total Bal', 'Total Berat (kg)', 'Tanggal Kirim', 'Status'];
    const rows = pengirimanList.map((p, idx) => [
      idx + 1,
      p.no_surat_jalan,
      p.tujuan,
      p.driver_nama,
      p.plat_nomor,
      p.total_bal,
      p.total_berat_kg,
      p.tanggal_kirim,
      p.status,
    ]);
    downloadCsvFile('Distribusi_Surat_Jalan_DO', headers, rows);
  };

  const exportLaporanQCSample = () => {
    const headers = ['No', 'Sample ID', 'Grade', 'Asal Gudang', 'Pabrik Tujuan Uji Lab', 'Berat Sample (Gram)', 'Tanggal Kirim', 'Status Hasil QC', 'Catatan'];
    const rows = sampleList.map((s, idx) => [
      idx + 1,
      s.sample_id,
      s.kode_grade,
      s.sumber,
      s.tujuan,
      s.berat_sample_gram,
      s.tanggal_kirim,
      s.status,
      s.catatan || '-',
    ]);
    downloadCsvFile('Laporan_Uji_Mutu_Sample_QC', headers, rows);
  };

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* Header Banner */}
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            
            <h1 className="text-base font-bold text-gray-900 tracking-tight">
              Dashboard Laporan & Analytic ERP
            </h1>
          </div>
          
        </div>

        {/* Header Quick Buttons */}
        {!isQCOnly && (
          <div className="flex items-center space-x-2">
            <button
              onClick={exportBukuKasPembelian}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export Transaksi Pembelian</span>
            </button>
            <button
              onClick={exportInventarisBalGudang}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Inventaris Bal</span>
            </button>
          </div>
        )}
      </div>

      {/* 9.1 Summary Cards (FINANCIAL OVERVIEW) */}
      {!isQCOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          
          {/* 1. Total Pembelian Petani */}
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between" title="Total modal murni pembelian tembakau (Berat Netto × Harga Beli/kg, abaikan potongan tali/kuli/tikar)">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Total Pembelian (Modal)
              </span>
              <span className="p-1.5 bg-red-50 text-[#b81d24] rounded-sm">
                <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4">Rp</span>
              </span>
            </div>
            <div className="text-[17px] font-bold text-[#b81d24] mt-2 font-mono">
              Rp {totalPembelianRupiah.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span title="Murni Berat Netto × Harga Beli/kg">Modal Murni Semua Bal</span>
              <span className="font-semibold text-gray-700">{totalBalDibeli} Bal ({transaksiList.length} Nota)</span>
            </div>
          </div>

          {/* 2. Total Penjualan */}
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between" title="Total penjualan bal tembakau yang sudah dikirimkan surat jalan dan barangnya sampai (Netto × Harga Jual Deal)">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Total Penjualan
              </span>
              <span className="p-1.5 bg-blue-50 text-blue-800 rounded-sm">
                <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4">Rp</span>
              </span>
            </div>
            <div className="text-[17px] font-bold text-blue-800 mt-2 font-mono">
              Rp {totalPenjualanRupiah.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span>Bal Terkirim ke Pabrik</span>
              <span className="font-semibold text-gray-700">{shippedBalMetrics.totalBalTerkirim} Bal ({shippedBalMetrics.validShippedDO.length} DO)</span>
            </div>
          </div>

          {/* 3. Valuasi Aset di Gudang */}
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between" title="Estimasi modal bal yang statusnya masih tersimpan di gudang (Berat Netto × Harga Beli/kg)">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Valuasi (Stok Gudang)
              </span>
              <span className="p-1.5 bg-amber-50 text-amber-800 rounded-sm">
                <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4">Rp</span>
              </span>
            </div>
            <div className="text-[17px] font-bold text-amber-800 mt-2 font-mono">
              Rp {totalValuasiRupiah.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span>Sisa Bal di Gudang</span>
              <span className="font-semibold text-gray-700">{stokAktifGudang.count} Bal ({stokAktifGudang.totalKg.toLocaleString('id-ID')} kg)</span>
            </div>
          </div>

          {/* 4. Total Keuntungan Bersih */}
          <div className={`bg-white p-4 border shadow-xs relative overflow-hidden ${totalKeuntunganBersih >= 0 ? 'border-emerald-200 bg-emerald-50/10' : 'border-rose-200 bg-rose-50/10'}`}>
            <div className="flex items-center justify-between" title="Total dari selisih (Harga Jual - Harga Beli) setiap bal yang sudah dikirimkan">
              <span className={`text-xs font-bold uppercase tracking-wide ${totalKeuntunganBersih >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                Keuntungan Bersih
              </span>
              <span className={`p-1.5 rounded-sm ${totalKeuntunganBersih >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4">Rp</span>
              </span>
            </div>
            <div className={`text-[17px] font-bold mt-2 font-mono ${totalKeuntunganBersih >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {totalKeuntunganBersih < 0 ? '-' : ''}Rp {Math.abs(totalKeuntunganBersih).toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span className="italic text-gray-600 truncate mr-1">Selisih Jual - Beli Bal Terkirim</span>
              <span className={`font-bold font-mono ${totalKeuntunganBersih >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {shippedBalMetrics.totalPenjualan > 0 ? `${shippedBalMetrics.profitMarginPct >= 0 ? '+' : ''}${shippedBalMetrics.profitMarginPct.toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* 9.1b Operational Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 2. Tonase Masuk (Intake) */}
        {!isQCOnly ? (
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tonase Masuk (Intake)
              </span>
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-sm">
                <Scale className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">
              {totalTonaseMasukKg.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500">kg ({(totalTonaseMasukKg / 1000).toFixed(2)} Ton)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
              <span>Total Dikeluarkan/Terkirim:</span>
              <span className="font-semibold text-slate-800">{totalTerkirimKg.toLocaleString('id-ID')} kg</span>
            </div>
          </div>
        ) : null}

        {/* 3. Stok Aktif di Gudang */}
        {!isQCOnly ? (
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Stok Aktif di Gudang
              </span>
              <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded-sm">
                <Package className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-bold text-emerald-950 mt-2">
              {stokAktifGudang.totalKg.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500">kg ({(stokAktifGudang.totalKg / 1000).toFixed(2)} Ton)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
              <span>Fisik Bal Tersimpan:</span>
              <span className="font-semibold text-emerald-900">{stokAktifGudang.count} Bal</span>
            </div>
          </div>
        ) : null}

        {/* 4. Approval Rate Lab QC */}
        <div className={`bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden ${isQCOnly ? 'col-span-full' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Approval Rate Lab QC
            </span>
            <span className="p-1.5 bg-purple-50 text-purple-800 rounded-sm">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            {qcStats.rate.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Disetujui Lab:</span>
            <span className="font-semibold text-purple-900">
              {qcStats.approvedSample} dari {qcStats.totalSample} sampel
            </span>
          </div>
        </div>

      </div>

      

      {/* Visualisasi Recharts: Tren Pembelian dengan Filter Rentang Waktu */}
      {!isQCOnly && (
        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          {/* Header & Controls Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 mb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-[#b81d24]" />
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                  Tren Pembelian Tembakau
                </h3>
                {trendPembelianData.length > 8 && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-xs font-medium">
                    ↔ Geser horizontal ({trendPembelianData.length} data)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Analisis tren {trendMetric === 'bal' ? 'volume bal' : trendMetric === 'tonase' ? 'tonase (kg)' : 'nilai modal (Rp)'} berdasarkan periode {periodeWaktu}
              </p>
            </div>

            {/* Filter Tools: Periode, Metrik, dan Tahun */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Pilihan Periode Waktu */}
              <div className="inline-flex bg-gray-100 p-0.5 rounded-xs border border-gray-200">
                <button
                  type="button"
                  onClick={() => setPeriodeWaktu('mingguan')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition-colors ${
                    periodeWaktu === 'mingguan'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Tampilkan per Minggu"
                >
                  Mingguan
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodeWaktu('bulanan')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition-colors ${
                    periodeWaktu === 'bulanan'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Tampilkan per Bulan"
                >
                  Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodeWaktu('kuartalan')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition-colors ${
                    periodeWaktu === 'kuartalan'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Tampilkan per Kuartal (Q1-Q4)"
                >
                  Kuartalan
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodeWaktu('tahunan')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition-colors ${
                    periodeWaktu === 'tahunan'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Tampilkan per Tahun"
                >
                  Tahunan
                </button>
              </div>

              {/* Filter Tahun */}
              {availableYears.length > 0 && (
                <div className="flex items-center">
                  <select
                    value={selectedTahun}
                    onChange={(e) => setSelectedTahun(e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-200 text-gray-700 font-medium px-2 py-1 rounded-xs focus:ring-1 focus:ring-red-600 focus:outline-none"
                    aria-label="Pilih Filter Tahun"
                  >
                    <option value="semua">Semua Tahun</option>
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Tahun {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Metrik Pilihan Toggle */}
              <div className="inline-flex bg-gray-100 p-0.5 rounded-xs border border-gray-200">
                <button
                  type="button"
                  onClick={() => setTrendMetric('bal')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition-colors ${
                    trendMetric === 'bal'
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Bal
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMetric('tonase')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition-colors ${
                    trendMetric === 'tonase'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Kg
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMetric('nilai')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition-colors ${
                    trendMetric === 'nilai'
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Rp
                </button>
              </div>
            </div>
          </div>

          {/* Sub-bar Total Ringkasan Periode Terpilih */}
          <div className="flex flex-wrap items-center justify-between bg-gray-50/80 px-3 py-1.5 rounded-xs mb-3 text-xs border border-gray-100">
            <span className="text-gray-600">
              Periode Aktif: <strong className="text-gray-900 capitalize">{periodeWaktu}</strong> {selectedTahun !== 'semua' ? `(${selectedTahun})` : '(Semua Tahun)'} &bull; {trendPembelianData.length} rentang data
            </span>
            <div className="flex items-center space-x-3 font-mono text-[11px]">
              <span className="text-gray-700">
                Total Bal: <strong className="text-gray-900">{grandTotalTrend.bal.toLocaleString('id-ID')}</strong>
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-700">
                Tonase: <strong className="text-emerald-800">{grandTotalTrend.kg.toLocaleString('id-ID')} kg</strong>
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-700">
                Modal: <strong className="text-blue-800">{formatRupiah(grandTotalTrend.nilai)}</strong>
              </span>
            </div>
          </div>

          {trendPembelianData.length > 0 ? (
            <div className="w-full overflow-x-auto overflow-y-hidden">
              <div
                className="h-64"
                style={{
                  minWidth: trendPembelianData.length > 8 ? `${Math.max(500, trendPembelianData.length * 52)}px` : '100%',
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendPembelianData} margin={{ top: 10, right: 15, left: 10, bottom: trendPembelianData.length > 6 ? 28 : 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#6B7280' }} 
                      interval={0}
                      angle={trendPembelianData.length > 6 ? -25 : 0}
                      textAnchor={trendPembelianData.length > 6 ? 'end' : 'middle'}
                      height={trendPembelianData.length > 6 ? 40 : 25}
                      tickFormatter={(val) => {
                        const maxLen = trendPembelianData.length > 12 ? 7 : trendPembelianData.length > 8 ? 9 : 14;
                        return truncateLabel(val, maxLen);
                      }}
                      dy={trendPembelianData.length > 6 ? 5 : 8}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      tickFormatter={(value) => {
                        if (trendMetric === 'nilai') {
                          if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
                          return `${(value / 1_000_000).toFixed(0)}Jt`;
                        }
                        if (trendMetric === 'tonase') {
                          if (value >= 1000) return `${(value / 1000).toFixed(1)}t`;
                          return `${value}kg`;
                        }
                        return `${value.toLocaleString('id-ID')}`;
                      }}
                      width={80}
                    />
                    <Tooltip
                      content={<CustomTrendTooltip />}
                      cursor={{ fill: 'rgba(243, 244, 246, 0.7)' }}
                      wrapperStyle={{ zIndex: 100, outline: 'none' }}
                    />
                    <Bar 
                      dataKey={trendMetric === 'nilai' ? 'totalNilai' : trendMetric === 'tonase' ? 'totalKg' : 'totalBal'} 
                      fill={trendMetric === 'nilai' ? '#1d4ed8' : trendMetric === 'tonase' ? '#047857' : '#b81d24'} 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={56}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-64 w-full flex items-center justify-center bg-gray-50 border border-dashed border-gray-200">
              <span className="text-sm text-gray-500 font-medium">Belum ada data transaksi pada periode ini</span>
            </div>
          )}
        </div>
      )}

      {/* Visualisasi Recharts: Distribusi Stok Bal Berdasarkan Kode Harga Beli Tembakau */}
      {!isQCOnly && (
        <DistribusiStokHargaBeliChart
          barangList={barangList}
          hargaList={hargaList}
          onNavigateToHarga={onNavigateToModule ? () => onNavigateToModule('modul-6-laporan-grade') : undefined}
        />
      )}

      {/* Main Analytic Content Row */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* 9.2 Top 5 Harga Beli Paling Banyak Muncul */}
        {!isQCOnly && (
          <div className="bg-white p-4 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Top 5 Harga Beli Paling Banyak Muncul
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Top 5 harga beli per kg yang paling sering tercatat dalam transaksi pembelian
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {onNavigateToModule && (
                  <button
                    onClick={() => onNavigateToModule('modul-6-laporan-grade')}
                    className="px-2 py-1 bg-red-50 text-[#b81d24] hover:bg-red-100 text-[11px] font-bold rounded-xs transition cursor-pointer flex items-center space-x-1"
                  >
                    <span>Laporan Harga</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-[11px] font-bold">
                  {topHargaBeli.length} Kategori Harga
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {topHargaBeli.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">Belum ada data transaksi pembelian</div>
              ) : (
                topHargaBeli.map((item, idx) => {
                  return (
                    <div key={idx} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 flex items-center justify-center font-bold text-white text-[10px] bg-zinc-900">
                            #{idx + 1}
                          </span>
                          <span className="font-mono font-bold text-emerald-700">{formatRupiah(item.harga)}/kg</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-gray-900">{item.count} Transaksi</span>
                          <span className="text-gray-400 mx-1">|</span>
                          <span className="font-mono text-gray-600">{item.totalKg.toLocaleString('id-ID')} kg</span>
                          <span className="text-gray-400 mx-1">|</span>
                          <span className="font-bold text-[#b81d24]">{item.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-none overflow-hidden">
                        <div 
                          className="h-full bg-zinc-900 transition-all duration-300"
                          style={{ width: `${Math.max(item.count > 0 ? 4 : 0, item.relativePercentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 9.3 Top 5 Petani Penyetor Terbanyak */}
        {!isQCOnly && (
          <div className="bg-white p-4 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Top 5 Petani Penyetor Terbanyak
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Penyetor dengan volume tonase tembakau terbesar
                </p>
              </div>
              <Award className="w-4 h-4 text-amber-600" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 text-[10px] uppercase">
                    <th className="py-2 px-2 text-center w-8">Rank</th>
                    <th className="py-2 px-3">Nama Petani</th>
                    <th className="py-2 px-2 text-center">Jumlah Bal</th>
                    <th className="py-2 px-2 text-right">Total Tonase</th>
                    <th className="py-2 px-3 text-right">Total Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topPetani.map((petani, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80">
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold ${
                          idx === 0 ? 'bg-amber-500 text-white' :
                          idx === 1 ? 'bg-gray-400 text-white' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900">
                        {petani.nama}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold text-gray-700">
                        {petani.balCount} Bal
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-blue-900">
                        {petani.totalKg.toLocaleString('id-ID')} kg
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#b81d24]">
                        Rp {petani.totalNilai.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* 9.4 Pusat Unduh Dokumen & Laporan Audit */}
      <div className="bg-white p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-gray-100">
          <FileText className="w-4 h-4 text-[#b81d24]" />
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Pusat Unduh Dokumen & Laporan Audit (CSV / Excel)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Card 1: Buku Kas Pembelian */}
          {!isQCOnly && (
            <div className="p-3 bg-gray-50 border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900">Buku Kas Pembelian</span>
                  <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4 text-gray-400">Rp</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Rekapitulasi seluruh setoran timbang, potongan kuli, dan jumlah bayar petani.
                </p>
              </div>
              <button
                onClick={exportBukuKasPembelian}
                className="mt-3 w-full py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-600" />
                <span>Unduh CSV</span>
              </button>
            </div>
          )}

          {/* Card 2: Inventaris Bal Gudang */}
          {!isQCOnly && (
            <div className="p-3 bg-gray-50 border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900">Inventaris Bal Gudang</span>
                  <Package className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Daftar seluruh bal tembakau fisik, status stok, dan lokasi penyimpanan.
                </p>
              </div>
              <button
                onClick={exportInventarisBalGudang}
                className="mt-3 w-full py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-600" />
                <span>Unduh CSV</span>
              </button>
            </div>
          )}

          {/* Card 3: Distribusi Surat Jalan */}
          {!isQCOnly && (
            <div className="p-3 bg-gray-50 border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900">Distribusi Surat Jalan</span>
                  <Building2 className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Log surat jalan delivery order pengiriman tembakau ke pabrik rokok rekanan.
                </p>
              </div>
              <button
                onClick={exportDistribusiSuratJalan}
                className="mt-3 w-full py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-600" />
                <span>Unduh CSV</span>
              </button>
            </div>
          )}

          {/* Card 4: Laporan QC Sample */}
          <div className={`p-3 bg-gray-50 border border-gray-200 flex flex-col justify-between ${isQCOnly ? 'col-span-full' : ''}`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-900">Laporan QC Sample</span>
                <CheckCircle2 className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Data pengujian mutu laboratorium dan persetujuan grading sampel tembakau.
              </p>
            </div>
            <button
              onClick={exportLaporanQCSample}
              className="mt-3 w-full py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span>Unduh CSV</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

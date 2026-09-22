import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Scale,
  Package,
  CheckCircle2,
  Download,
  Award,
  FileText,
  ArrowUpRight,
  Activity,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Barang, 
  TransaksiPembelian, 
  PengirimanSample,
  BatchPengirimanSample,
  PengirimanBarang, 
  TabelHarga,
  MasterHargaJual,
  UserRole 
} from '../../types';
import { downloadExcelReport, labelStatusPengiriman, labelStatusSample, labelStatusStok, todayStamp } from '../../utils/excelExport';
import { formatRupiah } from '../../utils/formatters';
import { filterBarangLunas, isTransaksiLunas, labelStatusBayar } from '../../utils/statusBayar';
import { beratBrutoItemSample } from '../../utils/beratKirim';
import {
  hitungTotalModal,
  hitungTotalPenjualan,
  hitungValuasiGudang,
  hitungProfitBersih,
  hitungValuasiStokGudang,
  hitungProfitPengiriman,
  hitungModalTransaksi,
  nettoTransaksi,
} from '../../utils/finance';
import { DistribusiStokHargaBeliChart } from './DistribusiStokHargaBeliChart';
import { hitungResumeSample } from '../../utils/resumePengiriman';

interface DashboardAnalyticViewProps {
  transaksiList: TransaksiPembelian[];
  barangList: Barang[];
  /** Baris sample per bal (dari batch sample final) */
  sampleList: PengirimanSample[];
  batchSampleList?: BatchPengirimanSample[];
  pengirimanList: PengirimanBarang[];
  hargaList?: TabelHarga[];
  hargaJualList?: MasterHargaJual[];
  isRefreshing?: boolean;
  userRole: UserRole;
  onNavigateToModule?: (moduleId: string) => void;
  onRefreshSources?: () => void | Promise<void>;
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
  batchSampleList = [],
  pengirimanList = [],
  hargaList = [],
  hargaJualList = [],
  isRefreshing = false,
  userRole,
  onNavigateToModule,
  onRefreshSources,
}) => {
  // State Filter Rentang Waktu & Metrik Analisis Tren
  type PeriodeWaktu = 'mingguan' | 'bulanan' | 'kuartalan' | 'tahunan';
  type MetricTren = 'bal' | 'tonase' | 'nilai';

  const [periodeWaktu, setPeriodeWaktu] = useState<PeriodeWaktu>('bulanan');
  const [selectedTahun, setSelectedTahun] = useState<string>('semua');
  const [trendMetric, setTrendMetric] = useState<MetricTren>('bal');

  // 1. Total Pembelian (Modal Murni: Netto × Harga Beli, abaikan potongan tali/kuli/tikar)
  const totalPembelianRupiah = useMemo(() => {
    // HANYA hitung pembelian jika transaksi sudah LUNAS (dibayar)
    const lunasTrx = transaksiList.filter((t) => isTransaksiLunas(t));
    return hitungTotalModal(lunasTrx);
  }, [transaksiList]);

  // Total Bal yang Dibeli
  const totalBalDibeli = useMemo(() => {
    return transaksiList.reduce((sum, t) => {
      if (!isTransaksiLunas(t)) return sum;
      const count = t.total_bal || (t.items && t.items.length > 0 ? t.items.length : (t.barang_ids ? t.barang_ids.length : 1));
      return sum + count;
    }, 0);
  }, [transaksiList]);

  // 2. Tonase Masuk (Intake) (Sum Netto kg)
  const totalTonaseMasukKg = useMemo(() => {
    return transaksiList.reduce((sum, t) => {
      // HANYA hitung tonase masuk jika transaksi sudah LUNAS (dibayar)
      if (!isTransaksiLunas(t)) return sum;
      return sum + nettoTransaksi(t);
    }, 0);
  }, [transaksiList]);

  // 3. Stok Aktif di Gudang & 4. Valuasi (Stok Gudang = Sisa bal di gudang × Netto × Harga Beli)
  // Aset dan valuasi hanya dari bal kupon yang sudah dibayar; yang belum dibayar masih kredit
  const barangLunasList = useMemo(() => filterBarangLunas(barangList, transaksiList), [barangList, transaksiList]);

  const stokAktifGudang = useMemo(() => {
    return hitungValuasiStokGudang(barangLunasList, hargaList);
  }, [barangLunasList, hargaList]);

  // Helper to get fallback price
  
  // 4. Valuasi (Stok Gudang) menggunakan helper hitungValuasiGudang
  const totalValuasiRupiah = useMemo(() => {
    return hitungValuasiGudang(stokAktifGudang.items, hargaList);
  }, [stokAktifGudang, hargaList]);

  // 5. Metrik Bal Terkirim, Total Penjualan & Keuntungan Bersih (Menggunakan helper terpusat hitungProfitPengiriman)
  const shippedBalMetrics = useMemo(() => {
    return hitungProfitPengiriman(
      pengirimanList,
      barangList,
      hargaJualList,
      hargaList
    );
  }, [pengirimanList, barangList, hargaJualList, hargaList]);

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
  

  // Sample yang disetujui pembeli dibanding yang sudah dijawab (sama dengan Resume Laporan Pengiriman)
  const qcStats = useMemo(() => hitungResumeSample(sampleList), [sampleList]);

  // 9.2 Top 5 Harga Beli Paling Banyak Muncul
  const topHargaBeli = useMemo(() => {
    const priceMap = new Map<number, { harga: number; count: number; totalKg: number; totalNilai: number }>();

    const tambah = (harga: number, kg: number) => {
      if (harga <= 0) return;
      const existing = priceMap.get(harga) || { harga, count: 0, totalKg: 0, totalNilai: 0 };
      existing.count += 1;
      existing.totalKg += kg;
      existing.totalNilai += kg * harga;
      priceMap.set(harga, existing);
    };
    transaksiList.forEach((tx) => {
      if (!isTransaksiLunas(tx)) return;
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((item) => tambah(item.harga_per_kg || tx.harga_per_kg || 0, item.berat_kg || 0));
      } else {
        tambah(tx.harga_per_kg || 0, tx.berat_kg || 0);
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
  }, [transaksiList]);

  // 9.3 Top 5 Petani Penyetor Terbanyak
  const topPetani = useMemo(() => {
    const map = new Map<string, { nama: string; balCount: number; totalKg: number; totalNilai: number }>();

    transaksiList.forEach(t => {
      if (!isTransaksiLunas(t)) return;
      const key = t.petani_id || t.nama_petani;
      const existing = map.get(key) || { nama: t.nama_petani, balCount: 0, totalKg: 0, totalNilai: 0 };
      
      // Murni modal harga beli tembakau (netto × harga beli), abaikan potongan
      const subtotal = hitungModalTransaksi(t);

      const balInTx = t.total_bal || (t.items && t.items.length) || (t.barang_ids && t.barang_ids.length) || 1;

      existing.balCount += balInTx;
      existing.totalKg += nettoTransaksi(t);
      existing.totalNilai += subtotal;
      map.set(key, existing);
    });

    // Reconcile with exact bal count in inventaris bal gudang if barangList is provided
    if (barangLunasList.length > 0) {
      map.forEach((val, key) => {
        const balInGudang = barangLunasList.filter(b => b.petani_id === key || b.nama_petani === val.nama).length;
        if (balInGudang > 0) {
          val.balCount = balInGudang;
        }
      });
    }

    const sorted = Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
    return sorted.slice(0, 5);
  }, [transaksiList, barangLunasList]);


  // Profitabilitas (Disinkronkan dengan rumus shippedBalMetrics)
  
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
      // Tren nilai pembelian hanya dari kupon yang sudah dibayar
      if (!trx.tanggal_transaksi || !isTransaksiLunas(trx)) return false;
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
          <span className="font-mono text-[10px] bg-slate-800 text-slate-200 font-bold px-2 py-0.5 rounded-xs border border-slate-700">
            {data.countTrx} Transaksi
          </span>
        </div>

        {/* Primary Metric Highlight Box */}
        <div className="p-2.5 rounded-xs mb-2.5 border bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">
              {trendMetric === 'nilai'
                ? 'Total Modal Pembelian:'
                : trendMetric === 'tonase'
                ? 'Total Tonase Tembakau:'
                : 'Volume Bal Masuk:'}
            </span>
            <span className="font-mono text-sm font-black text-white">
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
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
              <span>Tonase Bersih:</span>
            </span>
            <span className="font-mono font-bold text-white">
              {data.totalKg.toLocaleString('id-ID')} kg <span className="text-[10px] text-slate-400 font-normal">({(data.totalKg / 1000).toFixed(2)} Ton)</span>
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
              <span>Nilai Modal:</span>
            </span>
            <span className="font-mono font-bold text-white">
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
            <p className="font-mono font-bold text-slate-200 mt-0.5">{formatRupiah(avgHargaPerKg)}/kg</p>
          </div>
        </div>
      </div>
    );
  };

  // Export functions 
  const exportBukuKasPembelian = () => {
    const rows = transaksiList.map((t) => {
      const modal = hitungModalTransaksi(t);
      const potongan = Number(t.total_potongan || 0);
      const bayar = t.harga_final !== undefined && t.harga_final !== 0 ? t.harga_final : (modal - potongan);
      const noBal = t.items && t.items.length > 0
        ? t.items.map((it) => it.no_bal || it.barcode).filter(Boolean).join(', ')
        : (t.no_bal || '-');
      return { t, modal, potongan, bayar, noBal, balCount: t.total_bal || t.items?.length || 1 };
    });

    downloadExcelReport(`Buku_Kas_Pembelian_Petani_${todayStamp()}`, [
      {
        name: 'Buku Kas Pembelian',
        title: 'Buku Kas Pembelian Petani',
        info: ['Seluruh transaksi pembelian'],
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Kupon', align: 'center' },
          { header: 'Tanggal', type: 'date' },
          { header: 'Nama Petani' },
          { header: 'Jumlah Bal', type: 'integer' },
          { header: 'No Bal', width: 28 },
          { header: 'Grade', align: 'center' },
          { header: 'Netto (Kg)', type: 'kg' },
          { header: 'Total Harga Beli (Rp)', type: 'rupiah' },
          { header: 'Potongan (Rp)', type: 'rupiah' },
          { header: 'Jumlah Bayar (Rp)', type: 'rupiah' },
          { header: 'Status Bayar', align: 'center' },
        ],
        rows: rows.map(({ t, modal, potongan, bayar, noBal, balCount }, idx) => [
          idx + 1,
          t.no_kupon || '-',
          t.tanggal_transaksi,
          t.nama_petani,
          balCount,
          noBal,
          t.kode_grade || '-',
          nettoTransaksi(t),
          modal,
          potongan,
          bayar,
          labelStatusBayar(t),
        ]),
        totalRow: [
          `TOTAL (${rows.length} transaksi)`, '', '', '',
          rows.reduce((sum, r) => sum + r.balCount, 0),
          '', '',
          rows.reduce((sum, r) => sum + nettoTransaksi(r.t), 0),
          rows.reduce((sum, r) => sum + r.modal, 0),
          rows.reduce((sum, r) => sum + r.potongan, 0),
          rows.reduce((sum, r) => sum + r.bayar, 0),
          '',
        ],
      },
    ]);
  };

  const exportInventarisBalGudang = () => {
    const hargaBeliGrade = new Map(hargaList.map((h) => [(h.kode_grade || '').toUpperCase(), h.harga_per_kg || 0]));
    const lunasIds = new Set(barangLunasList.map((b) => b.barang_id));
    const rows = barangList.map((b) => {
      const hargaBeli = b.harga_per_kg || hargaBeliGrade.get((b.kode_grade || '').toUpperCase()) || 0;
      return { b, hargaBeli, nilai: (b.berat_kg || 0) * hargaBeli, lunas: lunasIds.has(b.barang_id) };
    });
    // Total berat dan nilai hanya dari bal yang sudah lunas
    const rowsLunas = rows.filter((r) => r.lunas);

    downloadExcelReport(`Inventaris_Bal_Gudang_${todayStamp()}`, [
      {
        name: 'Inventaris Bal',
        title: 'Inventaris Bal Gudang Tembakau',
        info: ['Seluruh bal tercatat. Total berat dan nilai hanya menghitung bal yang sudah lunas.'],
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'No Bal', align: 'center' },
          { header: 'Grade', align: 'center' },
          { header: 'Petani' },
          { header: 'Tanggal Masuk', type: 'date' },
          { header: 'Berat Netto (Kg)', type: 'kg' },
          { header: 'Harga Beli (Rp/Kg)', type: 'rupiah' },
          { header: 'Nilai Beli (Rp)', type: 'rupiah' },
          { header: 'Status Bayar', align: 'center' },
          { header: 'Status Stok', align: 'center' },
        ],
        rows: rows.map(({ b, hargaBeli, nilai, lunas }, idx) => [
          idx + 1,
          b.no_bal,
          b.kode_grade,
          b.nama_petani || '-',
          b.tanggal_masuk,
          b.berat_kg,
          hargaBeli,
          nilai,
          lunas ? 'Lunas' : 'Belum Lunas',
          labelStatusStok(b.status_stok),
        ]),
        totalRow: [
          `TOTAL LUNAS (${rowsLunas.length} dari ${rows.length} bal)`, '', '', '', '',
          rowsLunas.reduce((sum, r) => sum + (r.b.berat_kg || 0), 0),
          '',
          rowsLunas.reduce((sum, r) => sum + r.nilai, 0),
          '',
          '',
        ],
      },
    ]);
  };

  const exportDistribusiSuratJalan = () => {
    downloadExcelReport(`Distribusi_Surat_Jalan_DO_${todayStamp()}`, [
      {
        name: 'Surat Jalan DO',
        title: 'Distribusi Surat Jalan (DO)',
        info: ['Seluruh surat jalan pengiriman'],
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'No Surat Jalan', align: 'center' },
          { header: 'Tanggal Kirim', type: 'date' },
          { header: 'Pabrik Tujuan' },
          { header: 'Nama Sopir' },
          { header: 'No Kendaraan', align: 'center' },
          { header: 'Total Bal', type: 'integer' },
          { header: 'Total Netto (Kg)', type: 'kg' },
          { header: 'Nilai DO (Rp)', type: 'rupiah' },
          { header: 'Status', align: 'center' },
        ],
        rows: pengirimanList.map((p, idx) => [
          idx + 1,
          p.no_surat_jalan,
          p.tanggal_kirim,
          p.tujuan,
          p.driver_nama || '-',
          p.plat_nomor || '-',
          p.total_bal,
          p.total_berat_kg,
          p.total_nilai_deal || 0,
          labelStatusPengiriman(p.status),
        ]),
        totalRow: [
          `TOTAL (${pengirimanList.length} DO)`, '', '', '', '', '',
          pengirimanList.reduce((sum, p) => sum + (p.total_bal || 0), 0),
          pengirimanList.reduce((sum, p) => sum + (p.total_berat_kg || 0), 0),
          pengirimanList.reduce((sum, p) => sum + (p.total_nilai_deal || 0), 0),
          '',
        ],
      },
    ]);
  };

  const exportLaporanQCSample = () => {
    const batches = batchSampleList.filter((b) => b.status !== 'draft' && b.status !== 'dibatalkan');
    const items = batches.flatMap((batch) => (batch.items || []).map((it) => ({ batch, it })));

    downloadExcelReport(`Laporan_Uji_Mutu_Sample_QC_${todayStamp()}`, [
      {
        name: 'Sample QC',
        title: 'Laporan Uji Mutu Sample QC',
        info: [`${batches.length} batch sample`],
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Kode Batch', align: 'center' },
          { header: 'Tanggal Kirim', type: 'date' },
          { header: 'Tujuan / Buyer' },
          { header: 'No Bal', align: 'center' },
          { header: 'No Jadi', align: 'center' },
          { header: 'Grade', align: 'center' },
          { header: 'Petani' },
          { header: 'Bruto (Kg)', type: 'kg' },
          { header: 'Harga Tawaran (Rp/Kg)', type: 'rupiah' },
          { header: 'Harga Deal (Rp/Kg)', type: 'rupiah' },
          { header: 'Nilai (Rp)', type: 'rupiah' },
          { header: 'Status Hasil QC', align: 'center' },
          { header: 'Sudah DO', align: 'center' },
          { header: 'Catatan' },
        ],
        rows: items.map(({ batch, it }, idx) => {
          const harga = it.harga_deal_kg || it.harga_tawaran_kg || 0;
          return [
            idx + 1,
            batch.kode_batch,
            batch.tanggal_kirim,
            batch.tujuan_buyer,
            it.no_bal,
            it.kode_bal_pembeli || '-',
            it.kode_grade,
            it.nama_petani || '-',
            beratBrutoItemSample(it),
            it.harga_tawaran_kg,
            it.harga_deal_kg || '-',
            beratBrutoItemSample(it) * harga,
            labelStatusSample(it.status_item),
            it.sudah_dikirim_do ? 'Ya' : 'Belum',
            it.alasan_tolak || it.catatan_nego || '-',
          ];
        }),
        totalRow: [
          `TOTAL (${items.length} bal)`, '', '', '', '', '', '', '',
          items.reduce((sum, { it }) => sum + beratBrutoItemSample(it), 0),
          '', '',
          items.reduce((sum, { it }) => sum + beratBrutoItemSample(it) * (it.harga_deal_kg || it.harga_tawaran_kg || 0), 0),
          '', '', '',
        ],
      },
    ]);
  };

  const kartuRingkasan: Array<{ judul: string; nilai: string; negatif?: boolean; label: string; rincian: string }> = [
    {
      judul: 'Total Pembelian (Modal)',
      nilai: `Rp ${totalPembelianRupiah.toLocaleString('id-ID')}`,
      label: 'Bal Lunas',
      rincian: `${totalBalDibeli} Bal (${transaksiList.filter((t) => isTransaksiLunas(t)).length} Nota)`,
    },
    {
      judul: 'Total Penjualan',
      nilai: `Rp ${totalPenjualanRupiah.toLocaleString('id-ID')}`,
      label: 'Bal Terjual',
      rincian: `${shippedBalMetrics.totalBalTerkirim} Bal (${shippedBalMetrics.validShippedDO.length} DO)`,
    },
    {
      judul: 'Valuasi Stok Gudang',
      nilai: `Rp ${totalValuasiRupiah.toLocaleString('id-ID')}`,
      label: 'Bal di Gudang',
      rincian: `${stokAktifGudang.count} Bal (${stokAktifGudang.totalKg.toLocaleString('id-ID')} kg)`,
    },
    {
      judul: 'Keuntungan Bersih',
      nilai: `${totalKeuntunganBersih < 0 ? '-' : ''}Rp ${Math.abs(totalKeuntunganBersih).toLocaleString('id-ID')}`,
      negatif: totalKeuntunganBersih < 0,
      label: 'Margin',
      rincian:
        shippedBalMetrics.totalPenjualan > 0
          ? `${shippedBalMetrics.profitMarginPct >= 0 ? '+' : ''}${shippedBalMetrics.profitMarginPct.toFixed(1)}%`
          : '0%',
    },
  ];

  const kartuOperasional = [
    {
      judul: 'Tonase Masuk',
      Ikon: Scale,
      nilai: totalTonaseMasukKg,
      label: 'Terkirim',
      rincian: `${totalTerkirimKg.toLocaleString('id-ID')} kg`,
    },
    {
      judul: 'Stok Aktif di Gudang',
      Ikon: Package,
      nilai: stokAktifGudang.totalKg,
      label: 'Bal di Gudang',
      rincian: `${stokAktifGudang.count} Bal`,
    },
  ];

  const tombolPeriode: Array<{ id: PeriodeWaktu; label: string }> = [
    { id: 'mingguan', label: 'Mingguan' },
    { id: 'bulanan', label: 'Bulanan' },
    { id: 'kuartalan', label: 'Kuartalan' },
    { id: 'tahunan', label: 'Tahunan' },
  ];
  const tombolMetrik: Array<{ id: MetricTren; label: string }> = [
    { id: 'bal', label: 'Bal' },
    { id: 'tonase', label: 'Kg' },
    { id: 'nilai', label: 'Rp' },
  ];

  const daftarUnduhan = [
    { judul: 'Buku Kas Pembelian', Ikon: FileText, unduh: exportBukuKasPembelian },
    { judul: 'Inventaris Bal Gudang', Ikon: Package, unduh: exportInventarisBalGudang },
    { judul: 'Distribusi Surat Jalan', Ikon: FileText, unduh: exportDistribusiSuratJalan },
    { judul: 'Laporan Sample', Ikon: CheckCircle2, unduh: exportLaporanQCSample },
  ];

  return (
    <div className="space-y-4 font-sans text-gray-800">
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#b81d24] text-white rounded-sm flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Dashboard Analytic</h1>
        </div>
        {onRefreshSources && (
          <button
            type="button"
            onClick={() => void onRefreshSources()}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-60"
          >
            <Activity className={`w-3.5 h-3.5 text-gray-500 ${isRefreshing ? 'animate-pulse' : ''}`} />
            <span>{isRefreshing ? 'Memuat…' : 'Muat Ulang Data'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kartuRingkasan.map((k) => (
          <div key={k.judul} className="bg-white p-4 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{k.judul}</span>
              <span className="p-1.5 bg-red-50 text-[#b81d24] rounded-sm">
                <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4 text-[11px]">Rp</span>
              </span>
            </div>
            <div className={`text-[17px] font-bold mt-2 font-mono ${k.negatif ? 'text-[#b81d24]' : 'text-gray-900'}`}>{k.nilai}</div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span>{k.label}</span>
              <span className="font-semibold text-gray-700">{k.rincian}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kartuOperasional.map(({ judul, Ikon, nilai, label, rincian }) => (
          <div key={judul} className="bg-white p-4 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{judul}</span>
              <span className="p-1.5 bg-gray-100 text-gray-700 rounded-sm">
                <Ikon className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">
              {nilai.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500">kg ({(nilai / 1000).toFixed(2)} Ton)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
              <span>{label}</span>
              <span className="font-semibold text-gray-800">{rincian}</span>
            </div>
          </div>
        ))}

        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sample Disetujui</span>
            <span className="p-1.5 bg-gray-100 text-gray-700 rounded-sm">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">{qcStats.persenSetuju === null ? '-' : `${qcStats.persenSetuju.toFixed(1)}%`}</div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
            <span>Disetujui</span>
            <span className="font-semibold text-gray-800">
              {qcStats.disetujui} dari {qcStats.disetujui + qcStats.nego + qcStats.ditolak} bal dijawab
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 border border-gray-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 mb-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-[#b81d24]" />
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Tren Pembelian Tembakau</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex bg-gray-100 p-0.5 rounded-xs border border-gray-200">
              {tombolPeriode.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodeWaktu(p.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition-colors ${
                    periodeWaktu === p.id ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {availableYears.length > 0 && (
              <select
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(e.target.value)}
                className="text-xs bg-white border border-gray-300 text-gray-700 font-medium px-2 py-1 rounded-xs focus:outline-none focus:border-[#b81d24]"
                aria-label="Pilih Tahun"
              >
                <option value="semua">Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            )}

            <div className="inline-flex bg-gray-100 p-0.5 rounded-xs border border-gray-200">
              {tombolMetrik.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTrendMetric(m.id)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-xs transition-colors ${
                    trendMetric === m.id ? 'bg-[#b81d24] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 bg-gray-50/80 px-3 py-1.5 rounded-xs mb-3 border border-gray-100 font-mono text-[11px] text-gray-700">
          <span>
            Total Bal: <strong className="text-gray-900">{grandTotalTrend.bal.toLocaleString('id-ID')}</strong>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            Tonase: <strong className="text-gray-900">{grandTotalTrend.kg.toLocaleString('id-ID')} kg</strong>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            Modal: <strong className="text-gray-900">{formatRupiah(grandTotalTrend.nilai)}</strong>
          </span>
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
                  <Tooltip content={<CustomTrendTooltip />} cursor={{ fill: 'rgba(243, 244, 246, 0.7)' }} wrapperStyle={{ zIndex: 100, outline: 'none' }} />
                  <Bar
                    dataKey={trendMetric === 'nilai' ? 'totalNilai' : trendMetric === 'tonase' ? 'totalKg' : 'totalBal'}
                    fill="#b81d24"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={56}
                    animationDuration={600}
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

      <DistribusiStokHargaBeliChart
        barangList={barangLunasList}
        hargaList={hargaList}
        onNavigateToHarga={onNavigateToModule ? () => onNavigateToModule('modul-6-laporan-grade') : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Top 5 Harga Beli Terbanyak</h3>
            {onNavigateToModule && (
              <button
                onClick={() => onNavigateToModule('modul-6-laporan-grade')}
                className="px-2 py-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-[11px] font-semibold rounded-xs transition cursor-pointer flex items-center space-x-1"
              >
                <span>Laporan Harga</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {topHargaBeli.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">Belum ada data pembelian lunas</div>
            ) : (
              topHargaBeli.map((item, idx) => (
                <div key={item.harga} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 flex items-center justify-center font-bold text-white text-[10px] bg-zinc-900">{idx + 1}</span>
                      <span className="font-mono font-bold text-gray-900">{formatRupiah(item.harga)}/kg</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-gray-900">{item.count} Bal</span>
                      <span className="text-gray-400 mx-1">|</span>
                      <span className="font-mono text-gray-600">{item.totalKg.toLocaleString('id-ID')} kg</span>
                      <span className="text-gray-400 mx-1">|</span>
                      <span className="font-bold text-[#b81d24]">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 overflow-hidden">
                    <div className="h-full bg-zinc-900" style={{ width: `${Math.max(item.count > 0 ? 4 : 0, item.relativePercentage)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Top 5 Petani Penyetor Terbanyak</h3>
            <Award className="w-4 h-4 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 text-[10px] uppercase">
                  <th className="py-2 px-2 text-center w-8">No</th>
                  <th className="py-2 px-3">Nama Petani</th>
                  <th className="py-2 px-2 text-center">Jumlah Bal</th>
                  <th className="py-2 px-2 text-right">Total Tonase</th>
                  <th className="py-2 px-3 text-right">Total Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topPetani.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      Belum ada data pembelian lunas
                    </td>
                  </tr>
                ) : (
                  topPetani.map((petani, idx) => (
                    <tr key={`${petani.nama}-${idx}`} className="hover:bg-gray-50/80">
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold ${
                            idx === 0 ? 'bg-[#b81d24] text-white' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900">{petani.nama}</td>
                      <td className="py-2 px-2 text-center font-mono font-semibold text-gray-700">{petani.balCount} Bal</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-gray-900">{petani.totalKg.toLocaleString('id-ID')} kg</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">Rp {petani.totalNilai.toLocaleString('id-ID')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-gray-100">
          <Download className="w-4 h-4 text-[#b81d24]" />
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Unduh Laporan (Excel)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {daftarUnduhan.map(({ judul, Ikon, unduh }) => (
            <div key={judul} className="p-3 bg-gray-50 border border-gray-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-900">{judul}</span>
                <Ikon className="w-4 h-4 text-gray-400" />
              </div>
              <button
                onClick={unduh}
                className="mt-3 w-full py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Unduh Excel</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
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
  Tag
} from 'lucide-react';
import { 
  Barang, 
  TransaksiPembelian, 
  PengirimanSample, 
  PengirimanBarang, 
  TabelHarga,
  UserRole 
} from '../../types';
import { downloadCsvFile } from '../../utils/printDownload';
import { formatRupiah } from '../../utils/formatters';
import { GRADE_PALETTE, getGradePalette } from './LaporanGradeView';
import { DistribusiStokHargaBeliChart } from './DistribusiStokHargaBeliChart';

interface DashboardAnalyticViewProps {
  transaksiList: TransaksiPembelian[];
  barangList: Barang[];
  sampleList: PengirimanSample[];
  pengirimanList: PengirimanBarang[];
  hargaList?: TabelHarga[];
  userRole: UserRole;
  onNavigateToModule?: (moduleId: string) => void;
}

export const DashboardAnalyticView: React.FC<DashboardAnalyticViewProps> = ({
  transaksiList = [],
  barangList = [],
  sampleList = [],
  pengirimanList = [],
  hargaList = [],
  userRole,
  onNavigateToModule,
}) => {
  const isQCOnly = userRole === 'qc_mutu';

  // 1. Total Pembelian Petani (Sum Jumlah Bayar)
  const totalPembelianRupiah = useMemo(() => {
    return transaksiList.reduce((sum, t) => {
      const subtotal = t.total_harga_beli || (t.berat_kg * t.harga_per_kg);
      const jmlBayar = t.harga_final || (subtotal - (t.total_potongan || 7000));
      return sum + jmlBayar;
    }, 0);
  }, [transaksiList]);

  // 2. Tonase Masuk (Intake) (Sum Netto kg)
  const totalTonaseMasukKg = useMemo(() => {
    return transaksiList.reduce((sum, t) => sum + (t.berat_kg || 0), 0);
  }, [transaksiList]);

  // Total Terkirim ke Pabrik Luar (Reguler)
  const totalTerkirimKg = useMemo(() => {
    return pengirimanList.reduce((sum, p) => sum + (p.total_berat_kg || 0), 0);
  }, [pengirimanList]);

  // 3. Stok Aktif di Gudang (Di Gudang / Siap Kirim)
  const stokAktifGudang = useMemo(() => {
    const balAktif = barangList.filter(b => b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim');
    const totalKg = balAktif.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
    return {
      count: balAktif.length,
      totalKg,
    };
  }, [barangList]);

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

    transaksiList.forEach(tx => {
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
    });

    if (priceMap.size === 0 && hargaList) {
      hargaList.forEach(h => {
        if (h.harga_per_kg > 0) {
          priceMap.set(h.harga_per_kg, { harga: h.harga_per_kg, count: 1, totalKg: 50, totalNilai: h.harga_per_kg * 50 });
        }
      });
    }

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
      
      const subtotal = t.total_harga_beli || (t.berat_kg * t.harga_per_kg);
      const jmlBayar = t.harga_final || (subtotal - (t.total_potongan || 7000));

      const balInTx = t.total_bal || (t.items && t.items.length) || (t.barang_ids && t.barang_ids.length) || 1;

      existing.balCount += balInTx;
      existing.totalKg += (t.berat_kg || 0);
      existing.totalNilai += jmlBayar;
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


  // Profitabilitas
  const profitStats = useMemo(() => {
    let totalHargaBeliSold = 0;
    let totalHargaJualSold = 0;
    let soldBalCount = 0;
    let totalPercentageSum = 0;

    pengirimanList.forEach((pengiriman) => {
      if (pengiriman.status === 'batal') return;
      
      pengiriman.barang_ids.forEach((balId) => {
        const bal = barangList.find(b => b.barang_id === balId);
        if (bal) {
          const hargaBeli = bal.harga_per_kg || 0;
          const hargaJual = pengiriman.harga_deal_map?.[balId] || 0;
          const berat = bal.berat_kg || 0;

          if (hargaJual > 0 && hargaBeli > 0 && berat > 0) {
            totalHargaBeliSold += hargaBeli * berat;
            totalHargaJualSold += hargaJual * berat;
            soldBalCount += 1;
            
            const balProfitPct = ((hargaJual - hargaBeli) / hargaBeli) * 100;
            totalPercentageSum += balProfitPct;
          }
        }
      });
    });

    const netProfit = totalHargaJualSold - totalHargaBeliSold;
    const totalProfitPct = totalHargaBeliSold > 0 ? (netProfit / totalHargaBeliSold) * 100 : 0;
    const avgProfitPctPerBal = soldBalCount > 0 ? totalPercentageSum / soldBalCount : 0;

    return {
      netProfit,
      totalProfitPct,
      avgProfitPctPerBal,
      soldBalCount,
      totalHargaBeliSold,
      totalHargaJualSold,
    };
  }, [pengirimanList, barangList]);

  // Export functions 
  const exportBukuKasPembelian = () => {
    const headers = ['No', 'ID Transaksi', 'Kupon', 'Tanggal', 'Nama Petani', 'No Bal', 'Grade', 'Netto (kg)', 'Harga Beli (Rp/kg)', 'Potongan (Rp)', 'Jumlah Bayar (Rp)'];
    const rows = transaksiList.map((t, idx) => [
      idx + 1,
      t.transaksi_id,
      t.no_kupon || '-',
      t.tanggal_transaksi ? t.tanggal_transaksi.split('T')[0] : '-',
      t.nama_petani,
      t.no_bal,
      t.kode_grade,
      t.berat_kg,
      t.harga_per_kg,
      t.total_potongan || 7000,
      t.harga_final || (t.berat_kg * t.harga_per_kg - (t.total_potongan || 7000)),
    ]);
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
      b.lokasi_gudang,
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

      {/* 9.1 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* 1. Total Pembelian Petani */}
        {!isQCOnly ? (
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Total Pembelian Petani
              </span>
              <span className="p-1.5 bg-red-50 text-[#b81d24] rounded-sm">
                <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4">Rp</span>
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">
              Rp {totalPembelianRupiah.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
              <span>Total Setoran Timbang</span>
              <span className="font-semibold text-gray-700">{transaksiList.length} Bal</span>
            </div>
          </div>
        ) : null}

        {/* 2. Tonase Masuk (Intake) */}
        {!isQCOnly ? (
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tonase Masuk (Intake)
              </span>
              <span className="p-1.5 bg-blue-50 text-blue-800 rounded-sm">
                <Scale className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">
              {totalTonaseMasukKg.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500">kg ({(totalTonaseMasukKg / 1000).toFixed(2)} Ton)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100">
              <span>Terkirim ke Pabrik:</span>
              <span className="font-semibold text-blue-900">{totalTerkirimKg.toLocaleString('id-ID')} kg</span>
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

      
      {/* 9.1b Analisis Profitabilitas (Keuntungan) */}
      {!isQCOnly && (
        <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
           <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col">
             <h3 className="text-sm font-bold text-gray-900 tracking-tight">Analisis Keuntungan Penjualan</h3>
             <p className="text-[11px] text-gray-500 mt-0.5">Hanya menghitung Bal yang telah berhasil dijual (dikirim).</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="p-4">
                 <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Keuntungan Bersih</div>
                 <div className={`text-xl font-bold mt-2 ${profitStats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {profitStats.netProfit >= 0 ? '+' : ''} Rp {profitStats.netProfit.toLocaleString('id-ID')}
                 </div>
                 <div className="text-[11px] text-gray-500 mt-1">
                    Dari {profitStats.soldBalCount} Bal terjual
                 </div>
              </div>
              <div className="p-4">
                 <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Persentase Keuntungan Total</div>
                 <div className={`text-xl font-bold mt-2 ${profitStats.totalProfitPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {profitStats.totalProfitPct >= 0 ? '+' : ''} {profitStats.totalProfitPct.toFixed(2)}%
                 </div>
                 <div className="text-[11px] text-gray-500 mt-1">
                    Margin atas total modal Rp {profitStats.totalHargaBeliSold.toLocaleString('id-ID')}
                 </div>
              </div>
              <div className="p-4">
                 <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rata-rata Margin per Bal</div>
                 <div className={`text-xl font-bold mt-2 ${profitStats.avgProfitPctPerBal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {profitStats.avgProfitPctPerBal >= 0 ? '+' : ''} {profitStats.avgProfitPctPerBal.toFixed(2)}%
                 </div>
                 <div className="text-[11px] text-gray-500 mt-1">
                    Rata-rata persentase untung di setiap bal
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Visualisasi Recharts: Distribusi Stok Bal Berdasarkan Kode Harga Beli Tembakau */}
      {!isQCOnly && (
        <DistribusiStokHargaBeliChart
          barangList={barangList}
          hargaList={hargaList}
          onNavigateToHarga={onNavigateToModule ? () => onNavigateToModule('modul-6-laporan-grade') : undefined}
          onNavigateToGudang={onNavigateToModule ? () => onNavigateToModule('modul-6-laporan-gudang') : undefined}
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

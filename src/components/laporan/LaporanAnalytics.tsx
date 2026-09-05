import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter, 
  Scale, 
  DollarSign, 
  Package, 
  FlaskConical, 
  Truck, 
  User, 
  FileSpreadsheet, 
  TrendingUp, 
  Sparkles,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { 
  Petani, 
  Barang, 
  TabelHarga, 
  TransaksiPembelian, 
  PengirimanSample, 
  PengirimanBarang, 
  UserRole 
} from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { GRADE_COLOR_MAP } from '../../data/initialHargaData';
import { downloadCsvFile } from '../../utils/printDownload';

interface LaporanAnalyticsProps {
  petaniList: Petani[];
  barangList: Barang[];
  hargaList: TabelHarga[];
  transaksiList: TransaksiPembelian[];
  sampleList: PengirimanSample[];
  pengirimanList: PengirimanBarang[];
  userRole: UserRole;
}

export const LaporanAnalytics: React.FC<LaporanAnalyticsProps> = ({
  petaniList = [],
  barangList = [],
  hargaList = [],
  transaksiList = [],
  sampleList = [],
  pengirimanList = [],
  userRole,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'month' | 'year'>('all');

  // Executive KPI Calculations
  const totalPembelianRp = transaksiList.reduce((acc, tx) => acc + (tx.harga_final || 0), 0);
  const totalTonaseMasukKg = transaksiList.reduce((acc, tx) => acc + (tx.berat_kg || 0), 0);
  const totalTonaseKeluarKg = pengirimanList.reduce((acc, k) => acc + (k.total_berat_kg || 0), 0);

  const stokAktifBal = barangList.filter((b) => b.status_stok === 'di_gudang');
  const totalStokAktifKg = stokAktifBal.reduce((acc, b) => acc + (b.berat_kg || 0), 0);

  // Approval Rate Sample
  const totalSampleCount = sampleList.length;
  const sampleDisetujui = sampleList.filter((s) => s.status === 'disetujui').length;
  const approvalRate = totalSampleCount > 0 ? Math.round((sampleDisetujui / totalSampleCount) * 100) : 0;

  // Grade Distribution Calculation (Top 5 Active Bal)
  const gradeDistribution = useMemo(() => {
    const activeGrades = Array.from(new Set(barangList.filter(b => b.status_stok === 'di_gudang').map(b => b.kode_grade).filter(Boolean)));
    const grades = activeGrades.length > 0 ? activeGrades : ['A', 'B', 'C', 'D', 'E', 'F'];
    return grades.map((g) => {
      const itemsInGrade = barangList.filter((b) => b.kode_grade === g && b.status_stok === 'di_gudang');
      const countBal = itemsInGrade.length;
      const totalKg = itemsInGrade.reduce((acc, b) => acc + (b.berat_kg || 0), 0);
      return {
        grade: g,
        bal: countBal,
        kg: totalKg,
        pct: stokAktifBal.length > 0 ? Math.round((countBal / stokAktifBal.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.bal - a.bal)
    .slice(0, 5);
  }, [barangList, stokAktifBal]);

  // Top 5 Contributing Farmers
  const topPetani = useMemo(() => {
    const farmerMap: Record<string, { nama: string; totalKg: number; totalRp: number; countBal: number }> = {};

    transaksiList.forEach((tx) => {
      const key = tx.petani_id || tx.nama_petani;
      if (!farmerMap[key]) {
        farmerMap[key] = {
          nama: tx.nama_petani,
          totalKg: 0,
          totalRp: 0,
          countBal: 0,
        };
      }
      farmerMap[key].totalKg += (tx.berat_kg || 0);
      farmerMap[key].totalRp += (tx.harga_final || 0);
      const balInTx = tx.total_bal || (tx.items && tx.items.length) || (tx.barang_ids && tx.barang_ids.length) || 1;
      farmerMap[key].countBal += balInTx;
    });

    // Reconcile with exact bal count in inventaris bal gudang
    if (barangList && barangList.length > 0) {
      Object.keys(farmerMap).forEach((key) => {
        const balInGudang = barangList.filter((b) => b.petani_id === key || b.nama_petani === farmerMap[key].nama).length;
        if (balInGudang > 0) {
          farmerMap[key].countBal = balInGudang;
        }
      });
    }

    return Object.values(farmerMap)
      .sort((a, b) => b.totalKg - a.totalKg)
      .slice(0, 5);
  }, [transaksiList, barangList]);

  // CSV Exporter Utility
  const handleExportCSV = (type: 'transaksi' | 'stok' | 'pengiriman' | 'sample') => {
    let filename = `laporan_${type}_${new Date().toISOString().split('T')[0]}.csv`;

    if (type === 'transaksi') {
      const headers = ['No Transaksi', 'Tanggal', 'Nama Petani', 'ID Petani', 'No Bal', 'Grade', 'Berat (KG)', 'Harga/Kg', 'Potongan', 'Total Bersih'];
      const rows = transaksiList.map((tx) => [
        tx.transaksi_id,
        tx.tanggal_transaksi,
        tx.nama_petani,
        tx.petani_id,
        tx.no_bal,
        tx.kode_grade,
        tx.berat_kg,
        tx.harga_per_kg,
        tx.total_potongan,
        tx.harga_final,
      ]);
      downloadCsvFile(filename, headers, rows);
    } else if (type === 'stok') {
      const headers = ['No Bal', 'No Bal', 'Grade', 'Berat (KG)', 'Status Stok', 'Lokasi Gudang', 'Petani Asal', 'Tanggal Masuk', 'Tanggal Keluar'];
      const rows = barangList.map((b) => [
        b.barang_id,
        b.no_bal,
        b.kode_grade,
        b.berat_kg,
        b.status_stok,
        b.lokasi_gudang,
        b.nama_petani || '',
        b.tanggal_masuk,
        b.tanggal_keluar || '',
      ]);
      downloadCsvFile(filename, headers, rows);
    } else if (type === 'pengiriman') {
      const headers = ['No Surat Jalan', 'Tanggal Kirim', 'Pabrik Tujuan', 'Total Bal', 'Total Berat (KG)', 'Driver', 'Plat Truk', 'Ref Sample'];
      const rows = pengirimanList.map((k) => [
        k.no_surat_jalan,
        k.tanggal_kirim,
        k.tujuan,
        k.total_bal,
        k.total_berat_kg,
        k.driver_nama || '',
        k.plat_nomor || '',
        k.sample_id_ref || '',
      ]);
      downloadCsvFile(filename, headers, rows);
    } else if (type === 'sample') {
      const headers = ['ID Sample', 'Tanggal Kirim', 'Tujuan Lab/Pabrik', 'Grade', 'Berat (Gram)', 'Sumber Gudang', 'Status Respon', 'Tanggal Respon', 'Catatan'];
      const rows = sampleList.map((s) => [
        s.sample_id,
        s.tanggal_kirim,
        s.tujuan,
        s.kode_grade,
        s.berat_sample_gram,
        s.sumber,
        s.status,
        s.tanggal_respon || '',
        s.catatan || '',
      ]);
      downloadCsvFile(filename, headers, rows);
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs text-gray-800">
      
      {/* Top Banner & Export Actions */}
      <div className="bg-white p-4 border border-gray-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">
            Laporan Eksekutif, Rekapitulasi & Analitik Gudang
          </h2>
          
        </div>

        {/* Quick Export Dropdown */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleExportCSV('transaksi')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#545b62] hover:bg-[#464c52] text-white rounded-sm text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Transaksi</span>
          </button>

          <button
            onClick={() => handleExportCSV('stok')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#b81d24] hover:bg-[#a0181e] text-white rounded-sm text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Inventaris Bal</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total Pembelian */}
        <div className="bg-white p-3.5 border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Total Pembelian Petani
          </span>
          <div className="text-lg font-bold text-gray-900 font-mono">
            {formatRupiah(totalPembelianRp)}
          </div>
          <p className="text-[11px] text-gray-500">
            Dari <strong className="font-mono text-gray-800">{transaksiList.length}</strong> kupon timbang
          </p>
        </div>

        {/* Tonase Masuk vs Keluar */}
        <div className="bg-white p-3.5 border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Tonase Masuk (Intake)
          </span>
          <div className="text-lg font-bold text-emerald-700 font-mono">
            {totalTonaseMasukKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
            <span className="text-xs font-sans text-gray-500">KG</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Terkirim pabrik: <strong className="font-mono text-gray-800">{totalTonaseKeluarKg.toLocaleString('id-ID')} kg</strong>
          </p>
        </div>

        {/* Stok Aktif */}
        <div className="bg-white p-3.5 border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Stok Aktif di Gudang
          </span>
          <div className="text-lg font-bold text-[#b81d24] font-mono">
            {totalStokAktifKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
            <span className="text-xs font-sans text-gray-500">KG</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Tersimpan: <strong className="font-mono text-gray-800">{stokAktifBal.length} Bal</strong> fisik
          </p>
        </div>

        {/* Sample QC Approval Rate */}
        <div className="bg-white p-3.5 border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Approval Rate Lab QC
          </span>
          <div className="text-lg font-bold text-amber-700 font-mono">
            {approvalRate}%
          </div>
          <p className="text-[11px] text-gray-500">
            <strong className="font-mono text-emerald-600">{sampleDisetujui}</strong> dari {totalSampleCount} sample lolos
          </p>
        </div>

      </div>

      {/* Two-Column Analytics Layout: Grade Distribution & Top Farmers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left: Grade Stock Breakdown */}
        <div className="bg-white p-4 border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#b81d24]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900">
                Distribusi Stok Bal per Mutu Grade
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-gray-600">
              Total {stokAktifBal.length} Bal Aktif
            </span>
          </div>

          {/* Progress Bars per Grade */}
          <div className="space-y-2.5">
            {gradeDistribution.map((item) => {
              return (
                <div key={item.grade} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 bg-gray-800 text-white flex items-center justify-center font-bold text-[10px]">
                        {item.grade}
                      </span>
                      <span className="font-bold text-gray-800">Grade {item.grade}</span>
                    </div>

                    <div className="font-mono text-gray-700 text-xs">
                      <strong>{item.bal} Bal</strong> ({item.kg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg) • <span className="text-[#b81d24] font-bold">{item.pct}%</span>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full h-2 bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-[#b81d24] transition-all duration-500"
                      style={{ width: `${Math.max(item.pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Top 5 Penyetor Petani */}
        <div className="bg-white p-4 border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-[#b81d24]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900">
                Top 5 Petani Penyetor Terbanyak
              </h3>
            </div>
            <span className="text-xs text-gray-500 font-mono">Berdasarkan Tonase (Kg)</span>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {topPetani.length === 0 ? (
              <div className="text-center py-6 text-gray-400">Belum ada transaksi pembelian tercatat</div>
            ) : (
              topPetani.map((farmer, index) => (
                <div key={farmer.nama} className="py-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-5 h-5 flex items-center justify-center font-bold text-xs ${
                      index === 0
                        ? 'bg-[#b81d24] text-white font-bold'
                        : index === 1
                        ? 'bg-gray-700 text-white'
                        : index === 2
                        ? 'bg-gray-400 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-bold text-gray-900 block">{farmer.nama}</span>
                      <span className="text-[11px] text-gray-500 font-mono">{farmer.countBal} Bal disetor</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-gray-900 block">
                      {farmer.totalKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                      {formatRupiah(farmer.totalRp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Export Center Box */}
      <div className="bg-[#f8f9fa] border border-gray-300 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-gray-900 font-bold text-xs uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4 text-[#b81d24]" />
            <span>Pusat Unduh Dokumen & Laporan Audit (CSV / Excel)</span>
          </div>
          <span className="text-[11px] font-mono text-gray-500">Siap Diimpor ke Spreadsheet</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          
          <button
            onClick={() => handleExportCSV('transaksi')}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-1.5 text-left transition cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Buku Kas Pembelian</span>
              <Download className="w-3.5 h-3.5 text-[#b81d24]" />
            </div>
            <p className="text-[11px] text-gray-500">
              Rekap seluruh kupon timbang, harga per grade, dan potongan operasional.
            </p>
          </button>

          <button
            onClick={() => handleExportCSV('stok')}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-1.5 text-left transition cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Inventaris Bal Gudang</span>
              <Download className="w-3.5 h-3.5 text-[#b81d24]" />
            </div>
            <p className="text-[11px] text-gray-500">
              Rincian nomor bal, grade mutu, berat timbang, dan histori status bal fisik.
            </p>
          </button>

          <button
            onClick={() => handleExportCSV('pengiriman')}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-1.5 text-left transition cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Distribusi Surat Jalan</span>
              <Download className="w-3.5 h-3.5 text-[#b81d24]" />
            </div>
            <p className="text-[11px] text-gray-500">
              Log pengiriman pabrik rokok, tonase truk, nama sopir, dan plat armada.
            </p>
          </button>

          <button
            onClick={() => handleExportCSV('sample')}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-1.5 text-left transition cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Laporan QC Sample</span>
              <Download className="w-3.5 h-3.5 text-[#b81d24]" />
            </div>
            <p className="text-[11px] text-gray-500">
              Histori pengiriman sample lab, respon buyer, dan rasio persetujuan mutu.
            </p>
          </button>

        </div>
      </div>

    </div>
  );
};

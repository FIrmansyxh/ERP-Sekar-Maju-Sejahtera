const fs = require('fs');
const file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Insert new metrics logic
const targetLogic = `  // 3. Stok Aktif di Gudang (Di Gudang / Siap Kirim)
  const stokAktifGudang = useMemo(() => {
    const balAktif = barangList.filter(b => b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim');
    const totalKg = balAktif.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
    return {
      count: balAktif.length,
      totalKg,
    };
  }, [barangList]);`;

const newLogic = `  // 3. Stok Aktif di Gudang (Di Gudang / Siap Kirim)
  const stokAktifGudang = useMemo(() => {
    const balAktif = barangList.filter(b => b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim');
    const totalKg = balAktif.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
    return {
      count: balAktif.length,
      totalKg,
    };
  }, [barangList]);

  // NEW: Total Penjualan (Omset)
  const totalPenjualanRupiah = useMemo(() => {
    return pengirimanList.reduce((sum, p) => sum + (p.total_nilai_deal || 0), 0);
  }, [pengirimanList]);

  // NEW: Valuasi Aset (Nilai Saat Ini)
  const totalValuasiRupiah = useMemo(() => {
    const priceMap = new Map<string, number>();
    (hargaList || []).forEach(h => {
      priceMap.set((h.kode_grade || '').toUpperCase(), h.harga_per_kg || 0);
    });
    
    const balAktif = barangList.filter(b => b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim');
    return balAktif.reduce((sum, b) => {
       const price = priceMap.get((b.kode_grade || '').toUpperCase()) || 0;
       return sum + ((b.berat_kg || 0) * price);
    }, 0);
  }, [barangList, hargaList]);
  
  // NEW: Keuntungan Bersih = Penjualan + Valuasi Aset - Pembelian
  const totalKeuntunganBersih = totalPenjualanRupiah + totalValuasiRupiah - totalPembelianRupiah;
`;

code = code.replace(targetLogic, newLogic);

const targetCards = `      {/* 9.1 Summary Cards */}
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
        ) : null}`;

const newCards = `      {/* 9.1 Summary Cards (FINANCIAL OVERVIEW) */}
      {!isQCOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          
          {/* 1. Total Pembelian Petani */}
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between" title="Total akumulasi uang yang dibayarkan kepada petani (Arus Kas Keluar historis)">
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
              <span>Seluruh Uang Keluar</span>
              <span className="font-semibold text-gray-700">{transaksiList.length} Nota</span>
            </div>
          </div>

          {/* 2. Total Penjualan */}
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between" title="Total nilai uang dari barang yang telah laku dan dikirim">
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
              <span>Barang yang Laku/Keluar</span>
              <span className="font-semibold text-gray-700">{pengirimanList.length} DO</span>
            </div>
          </div>

          {/* 3. Valuasi Aset di Gudang */}
          <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between" title="Estimasi nilai harta berupa tembakau yang FISIKNYA SAAT INI MASIH ADA DI GUDANG">
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
              <span>Nilai Harta Saat Ini</span>
              <span className="font-semibold text-gray-700">{stokAktifGudang.count} Bal</span>
            </div>
          </div>

          {/* 4. Total Keuntungan Bersih */}
          <div className="bg-white p-4 border border-emerald-200 shadow-xs relative overflow-hidden bg-emerald-50/10">
            <div className="flex items-center justify-between" title="Penjualan + Valuasi Aset - Total Pembelian">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Keuntungan Bersih
              </span>
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-sm">
                <span className="inline-flex items-center justify-center font-bold leading-none w-4 h-4">Rp</span>
              </span>
            </div>
            <div className={\`text-[17px] font-bold mt-2 font-mono \${totalKeuntunganBersih >= 0 ? 'text-emerald-700' : 'text-red-600'}\`}>
              {totalKeuntunganBersih < 0 ? '-' : ''}Rp {Math.abs(totalKeuntunganBersih).toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span className="italic text-emerald-800/70 truncate mr-2">(Penjualan + Valuasi) - Modal</span>
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
        ) : null}`;

code = code.replace(targetCards, newCards);
fs.writeFileSync(file, code);
console.log("Patched logic and cards in dashboard.");

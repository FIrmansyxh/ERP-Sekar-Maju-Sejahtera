const fs = require('fs');
const file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetLogic = `  // NEW: Total Penjualan (Omset)
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
  }, [barangList, hargaList]);`;

const newLogic = `  // Helper to get price
  const getPriceByGrade = (kodeGrade: string) => {
    const h = (hargaList || []).find(x => (x.kode_grade || '').toUpperCase() === (kodeGrade || '').toUpperCase());
    return h ? (h.harga_per_kg || 0) : 0;
  };

  // NEW: Total Penjualan (Omset)
  const totalPenjualanRupiah = useMemo(() => {
    // Only completed/sent items count as Penjualan
    const completedPengiriman = pengirimanList.filter(p => p.status === 'diterima' || p.status === 'dikirim');
    return completedPengiriman.reduce((sum, p) => {
      if (p.total_nilai_deal && p.total_nilai_deal > 0) return sum + p.total_nilai_deal;
      
      // Fallback: calculate from items using current price, or fallback constant
      let fallbackVal = 0;
      (p.barang_ids || []).forEach(bid => {
        const b = barangList.find(x => x.barang_id === bid);
        if (b) {
          fallbackVal += (b.berat_kg || 0) * getPriceByGrade(b.kode_grade);
        }
      });
      if (fallbackVal === 0) fallbackVal = (p.total_berat_kg || 0) * 125000;
      return sum + fallbackVal;
    }, 0);
  }, [pengirimanList, barangList, hargaList]);

  // NEW: Valuasi Aset (Nilai Saat Ini)
  const totalValuasiRupiah = useMemo(() => {
    // Find which pengirimans are NOT completed (still loading/in transit)
    const activePengirimanIds = new Set(
      pengirimanList
        .filter(p => p.status !== 'diterima' && p.status !== 'dikirim')
        .map(p => p.pengiriman_id)
    );

    const balValuasi = barangList.filter(b => {
      if (b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim') return true;
      // If it's physically out but the delivery is NOT finished, it stays in Valuation
      if (b.status_stok === 'keluar' && b.pengiriman_id && activePengirimanIds.has(b.pengiriman_id)) {
        return true;
      }
      return false;
    });

    return balValuasi.reduce((sum, b) => {
      return sum + ((b.berat_kg || 0) * getPriceByGrade(b.kode_grade));
    }, 0);
  }, [barangList, pengirimanList, hargaList]);`;

code = code.replace(targetLogic, newLogic);

// Wait, we need to update stokAktifGudang as well for the label, so it matches the count!
const targetStokAktif = `  // 3. Stok Aktif di Gudang (Di Gudang / Siap Kirim)
  const stokAktifGudang = useMemo(() => {
    const balAktif = barangList.filter(b => b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim');
    const totalKg = balAktif.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
    return {
      count: balAktif.length,
      totalKg,
    };
  }, [barangList]);`;

const newStokAktif = `  // 3. Stok Aktif di Gudang & Transit (Di Gudang / Siap Kirim / Transit)
  const stokAktifGudang = useMemo(() => {
    const activePengirimanIds = new Set(
      pengirimanList
        .filter(p => p.status !== 'diterima' && p.status !== 'dikirim')
        .map(p => p.pengiriman_id)
    );

    const balAktif = barangList.filter(b => {
      if (b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim') return true;
      if (b.status_stok === 'keluar' && b.pengiriman_id && activePengirimanIds.has(b.pengiriman_id)) return true;
      return false;
    });

    const totalKg = balAktif.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
    return {
      count: balAktif.length,
      totalKg,
    };
  }, [barangList, pengirimanList]);`;

code = code.replace(targetStokAktif, newStokAktif);
fs.writeFileSync(file, code);
console.log('Patched dashboard logic for penjualan and valuasi.');

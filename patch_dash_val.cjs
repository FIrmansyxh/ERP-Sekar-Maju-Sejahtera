const fs = require('fs');
const file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetLogic = `  // Helper to get price
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

const newLogic = `  // Helper to get price
  const getPriceByGrade = (kodeGrade: string) => {
    const h = (hargaList || []).find(x => (x.kode_grade || '').toUpperCase() === (kodeGrade || '').toUpperCase());
    return h ? (h.harga_per_kg || 0) : 0;
  };

  // NEW: Total Penjualan (Omset)
  const totalPenjualanRupiah = useMemo(() => {
    const completedPengiriman = pengirimanList.filter(p => p.status === 'diterima' || p.status === 'dikirim');
    return completedPengiriman.reduce((sum, p) => {
      // Prioritize explicit deal value on the DO
      if (p.total_nilai_deal && p.total_nilai_deal > 0) return sum + p.total_nilai_deal;
      
      // Otherwise, iterate through goods and use harga_deal_map or fallback to actual buy price
      let DOValue = 0;
      let hasValidItemVal = false;
      
      (p.barang_ids || []).forEach(bid => {
        const b = barangList.find(x => x.barang_id === bid);
        if (b) {
          const hargaJual = p.harga_deal_map?.[bid] || 0;
          if (hargaJual > 0) {
            DOValue += (b.berat_kg || 0) * hargaJual;
            hasValidItemVal = true;
          } else {
            // fallback: use buy price (b.harga_per_kg) or grade price so we don't zero out sales
            const fallbackPrice = b.harga_per_kg || getPriceByGrade(b.kode_grade);
            DOValue += (b.berat_kg || 0) * fallbackPrice;
            if (fallbackPrice > 0) hasValidItemVal = true;
          }
        }
      });
      
      // extreme fallback if all failed (e.g., missing items)
      if (!hasValidItemVal || DOValue === 0) {
        DOValue = (p.total_berat_kg || 0) * 125000;
      }
      return sum + DOValue;
    }, 0);
  }, [pengirimanList, barangList, hargaList]);

  // NEW: Valuasi Aset (Nilai Saat Ini)
  const totalValuasiRupiah = useMemo(() => {
    const activePengirimanIds = new Set(
      pengirimanList
        .filter(p => p.status !== 'diterima' && p.status !== 'dikirim')
        .map(p => p.pengiriman_id)
    );

    const balValuasi = barangList.filter(b => {
      if (b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim') return true;
      if (b.status_stok === 'keluar' && b.pengiriman_id && activePengirimanIds.has(b.pengiriman_id)) return true;
      return false;
    });

    return balValuasi.reduce((sum, b) => {
      // Use actual buy price if available, fallback to market grade price
      const price = b.harga_per_kg || getPriceByGrade(b.kode_grade);
      return sum + ((b.berat_kg || 0) * price);
    }, 0);
  }, [barangList, pengirimanList, hargaList]);`;

code = code.replace(targetLogic, newLogic);
fs.writeFileSync(file, code);
console.log('Fixed Penjualan calculation!');

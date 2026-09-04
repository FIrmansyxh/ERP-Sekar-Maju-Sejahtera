import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

memo_code = """
  // Compute harga jual suggestions
  const hargaJualSuggestions = useMemo(() => {
    const q = scanHargaJual.trim().toLowerCase();
    if (!q) return [];
    
    let matches = activeHargaJualList.filter((h) => 
      h.status_aktif !== false && 
      (h.kode.toLowerCase().includes(q) || h.harga_jual.toString().includes(q))
    );

    matches.sort((a, b) => {
      const aStarts = a.kode.toLowerCase().startsWith(q);
      const bStarts = b.kode.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.kode.localeCompare(b.kode);
    });

    return matches.slice(0, 10);
  }, [activeHargaJualList, scanHargaJual]);

  const handleSelectSuggestedHargaJual = (hj: MasterHargaJual) => {
    setScanHargaJual(hj.kode);
    setIsHargaJualDropdownOpen(false);
    setTimeout(() => {
      // simulate submit
      handleScanHargaJualSubmitWithCode(hj);
    }, 50);
  };

  const handleScanHargaJualSubmitWithCode = (foundHJ: MasterHargaJual) => {
    if (!pendingScanBal) {
      setScanSampleAlert({
        type: 'error',
        message: 'Gagal: Data Bal Gudang belum lengkap. Silakan ulangi dari awal.',
      });
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    const newItem = {
      barangId: pendingScanBal.barang_id,
      noBal: pendingScanBal.no_bal || pendingScanBal.barang_id,
      kodeBalPembeli: scanPembeli.trim() || (pendingScanBal.no_bal || pendingScanBal.barang_id),
      grade: pendingScanBal.kode_grade || '-',
      beratBalKg: pendingScanBal.berat_kg,
      kodeHargaJual: foundHJ.kode,
      hargaTawaranKg: foundHJ.harga_jual,
    };

    setSelectedBalItems((prev) => [...prev, newItem]);
    setScanSampleAlert({
      type: 'success',
      message: `BERHASIL DITAMBAHKAN: Bal #${newItem.noBal} masuk ke tabel dengan Harga Jual ${foundHJ.kode}.`,
    });
    
    // Reset for next bal
    setPendingScanBal(null);
    setScanGudang('');
    setScanPembeli('');
    setScanHargaJual('');
    setTimeout(() => inputGudangRef.current?.focus(), 100);
  };
"""

content = content.replace("const handleScanHargaJualSubmit = () => {", memo_code + "\n  const handleScanHargaJualSubmit = () => {")

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)
print("fixed")

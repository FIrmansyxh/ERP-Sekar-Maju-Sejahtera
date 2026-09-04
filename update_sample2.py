import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

handlers = """  const handleScanGudangSubmit = () => {
    const trimmed = scanGudang.trim();
    if (!trimmed) return;
    
    const targetBal = barangList.find(
      (b) =>
        (b.no_bal || '').toLowerCase() === trimmed.toLowerCase() ||
        (b.barang_id || '').toLowerCase() === trimmed.toLowerCase()
    );

    if (!targetBal) {
      setScanSampleAlert({
        type: 'error',
        message: `BAL TIDAK DITEMUKAN: Kode "${trimmed}" tidak terdaftar di database gudang!`,
      });
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }
    if (targetBal.status_stok !== 'di_gudang') {
      setScanSampleAlert({
        type: 'error',
        message: `BAL TIDAK DAPAT DIAMBIL SAMPLE: Status bal #${targetBal.no_bal || targetBal.barang_id} adalah "${targetBal.status_stok}" (Bukan di gudang)!`,
      });
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }
    if (selectedBalItems.some((it) => it.barangId === targetBal.barang_id)) {
      setScanSampleAlert({
        type: 'warning',
        message: `Bal #${targetBal.no_bal || targetBal.barang_id} sudah ada dalam tabel sample batch ini.`,
      });
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    setPendingScanBal(targetBal);
    setScanSampleAlert({
      type: 'success',
      message: `LANGKAH 1 SUKSES: Bal Gudang #${targetBal.no_bal || targetBal.barang_id} ditemukan. Lanjut scan Bal Pembeli.`,
    });
    setTimeout(() => inputPembeliRef.current?.focus(), 100);
  };

  const handleScanPembeliSubmit = () => {
    const trimmed = scanPembeli.trim();
    if (!trimmed) return;
    
    setScanSampleAlert({
      type: 'success',
      message: `LANGKAH 2 SUKSES: Kode Bal Pembeli tercatat "${trimmed}". Lanjut scan Grade.`,
    });
    setTimeout(() => inputGradeRef.current?.focus(), 100);
  };

  const handleScanGradeSubmit = () => {
    const trimmed = scanGrade.trim();
    if (!trimmed) return;
    if (!pendingScanBal) {
      setScanSampleAlert({
        type: 'error',
        message: 'Gagal: Data Bal Gudang belum lengkap. Silakan ulangi dari awal.',
      });
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    const scannedGrade = trimmed.toUpperCase();
    const defaultHJ = activeHargaJualList.find((h) => h.status_aktif !== false);
    
    const newItem = {
      barangId: pendingScanBal.barang_id,
      noBal: pendingScanBal.no_bal || pendingScanBal.barang_id,
      kodeBalPembeli: scanPembeli.trim() || (pendingScanBal.no_bal || pendingScanBal.barang_id),
      grade: scannedGrade,
      beratBalKg: pendingScanBal.berat_kg,
      kodeHargaJual: defaultHJ ? defaultHJ.kode : '',
      hargaTawaranKg: defaultHJ ? defaultHJ.harga_jual : getDefaultPriceByGrade(scannedGrade),
    };

    setSelectedBalItems((prev) => [...prev, newItem]);
    setScanSampleAlert({
      type: 'success',
      message: `BERHASIL DITAMBAHKAN: Bal #${newItem.noBal} dengan Kode Pembeli "${newItem.kodeBalPembeli}" (Grade: ${newItem.grade}) masuk ke tabel.`,
    });
    
    // Reset for next bal
    setPendingScanBal(null);
    setScanGudang('');
    setScanPembeli('');
    setScanGrade('');
    setTimeout(() => inputGudangRef.current?.focus(), 100);
  };"""

content = re.sub(r'const handleProcessScanSample = \(scannedText: string\) => \{.*?setTimeout\(\(\) => sampleScannerRef\.current\?\.focus\(\), 100\);\n\s*\}\n\s*\};\n', handlers + '\n', content, flags=re.DOTALL)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

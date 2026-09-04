import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

harga_jual_logic = """  const handleScanHargaJualSubmit = () => {
    const trimmed = scanHargaJual.trim();
    if (!trimmed) return;
    if (!pendingScanBal) {
      setScanSampleAlert({
        type: 'error',
        message: 'Gagal: Data Bal Gudang belum lengkap. Silakan ulangi dari awal.',
      });
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    const scannedKode = trimmed.toUpperCase();
    const foundHJ = activeHargaJualList.find((h) => h.kode.toUpperCase() === scannedKode);
    
    if (!foundHJ) {
      setScanSampleAlert({
        type: 'error',
        message: `Gagal: Kode Harga Jual "${trimmed}" tidak ditemukan di Master Harga Jual.`,
      });
      setTimeout(() => inputHargaJualRef.current?.focus(), 100);
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

# replace state names and refs
content = content.replace("const [scanGrade, setScanGrade] = useState('');", "const [scanHargaJual, setScanHargaJual] = useState('');")
content = content.replace("const inputGradeRef = React.useRef<HTMLInputElement>(null);", "const inputHargaJualRef = React.useRef<HTMLInputElement>(null);")

# replace handleScanGradeSubmit
content = re.sub(r'const handleScanGradeSubmit = \(\) => \{.*?setTimeout\(\(\) => inputGudangRef\.current\?\.focus\(\), 100\);\n\s*\};\n', harga_jual_logic, content, flags=re.DOTALL)

content = content.replace("value={scanGrade}", "value={scanHargaJual}")
content = content.replace("onChange={(e) => setScanGrade(e.target.value)}", "onChange={(e) => setScanHargaJual(e.target.value)}")
content = content.replace("handleScanGradeSubmit", "handleScanHargaJualSubmit")
content = content.replace("!scanGrade.trim()", "!scanHargaJual.trim()")
content = content.replace("inputGradeRef", "inputHargaJualRef")
content = content.replace("Lanjut scan Grade", "Lanjut scan Harga Jual")


with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

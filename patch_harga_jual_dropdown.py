import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

state_repl = """
  const [isHargaJualDropdownOpen, setIsHargaJualDropdownOpen] = useState(false);
  const [highlightedHargaJualIndex, setHighlightedHargaJualIndex] = useState(0);
  const hargaJualDropdownRef = React.useRef<HTMLDivElement>(null);
"""
content = re.sub(r'const hargaJualDropdownRef = React\.useRef<HTMLDivElement>\(null\);\n', '', content)
content = content.replace("const balDropdownRef = React.useRef<HTMLDivElement>(null);", "const balDropdownRef = React.useRef<HTMLDivElement>(null);" + state_repl)

memo_repl = """
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

content = content.replace("// Select a bal from autocomplete dropdown directly", memo_repl + "\n  // Select a bal from autocomplete dropdown directly")

# Modify handleScanHargaJualSubmit to use handleScanHargaJualSubmitWithCode
orig_submit = """const scannedKode = trimmed.toUpperCase();
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
    setTimeout(() => inputGudangRef.current?.focus(), 100);"""

new_submit = """const scannedKode = trimmed.toUpperCase();
    const foundHJ = activeHargaJualList.find((h) => h.kode.toUpperCase() === scannedKode);
    
    if (!foundHJ) {
      setScanSampleAlert({
        type: 'error',
        message: `Gagal: Kode Harga Jual "${trimmed}" tidak ditemukan di Master Harga Jual.`,
      });
      setTimeout(() => inputHargaJualRef.current?.focus(), 100);
      return;
    }
    handleScanHargaJualSubmitWithCode(foundHJ);"""

content = content.replace(orig_submit, new_submit)

# Update outside click logic
click_repl = """  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (balDropdownRef.current && !balDropdownRef.current.contains(e.target as Node)) {
        setIsBalDropdownOpen(false);
      }
      if (hargaJualDropdownRef.current && !hargaJualDropdownRef.current.contains(e.target as Node)) {
        setIsHargaJualDropdownOpen(false);
      }
    };"""

content = re.sub(r'// Close dropdown if clicked outside\n  useEffect\(\(\) => \{\n    const handleClickOutside = \(e: MouseEvent\) => \{\n      if \(balDropdownRef\.current && !balDropdownRef\.current\.contains\(e\.target as Node\)\) \{\n        setIsBalDropdownOpen\(false\);\n      \}\n    \};\n', click_repl + '\n', content)


input_hj_repl = """                      <div className="relative flex-1">
                        <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          ref={inputHargaJualRef}
                          type="text"
                          disabled={!pendingScanBal}
                          placeholder={pendingScanBal ? "Scan Harga Jual & Enter" : "Tunggu Langkah 2"}
                          value={scanHargaJual}
                          onChange={(e) => {
                            setScanHargaJual(e.target.value);
                            setIsHargaJualDropdownOpen(true);
                            setHighlightedHargaJualIndex(0);
                          }}
                          onFocus={() => {
                            if (scanHargaJual.trim().length > 0) setIsHargaJualDropdownOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (isHargaJualDropdownOpen && hargaJualSuggestions.length > 0) {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setHighlightedHargaJualIndex((prev) => Math.min(prev + 1, hargaJualSuggestions.length - 1));
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setHighlightedHargaJualIndex((prev) => Math.max(prev - 1, 0));
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSelectSuggestedHargaJual(hargaJualSuggestions[highlightedHargaJualIndex]);
                              } else if (e.key === 'Escape') {
                                setIsHargaJualDropdownOpen(false);
                              }
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              handleScanHargaJualSubmit();
                            }
                          }}
                          className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                        />
                        
                        {/* Dropdown Autocomplete Harga Jual */}
                        {isHargaJualDropdownOpen && scanHargaJual.trim().length > 0 && (
                          <div
                            ref={hargaJualDropdownRef}
                            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-300 rounded-sm shadow-xl max-h-72 overflow-y-auto divide-y divide-gray-100"
                          >
                            <div className="px-3 py-1.5 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between border-b border-gray-200">
                              <span>Rekomendasi Harga Jual ({hargaJualSuggestions.length}):</span>
                            </div>
                            {hargaJualSuggestions.length > 0 ? (
                              hargaJualSuggestions.map((hj, idx) => {
                                const isHighlighted = idx === highlightedHargaJualIndex;
                                return (
                                  <button
                                    key={hj.harga_jual_id}
                                    type="button"
                                    onClick={() => handleSelectSuggestedHargaJual(hj)}
                                    onMouseEnter={() => setHighlightedHargaJualIndex(idx)}
                                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition cursor-pointer ${
                                      isHighlighted ? 'bg-red-50 text-red-950 border-l-4 border-[#b81d24]' : 'hover:bg-gray-50 text-gray-800'
                                    }`}
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono font-bold text-xs text-gray-900 bg-amber-100 px-1.5 py-0.5 rounded-xs border border-amber-300">
                                          {hj.kode}
                                        </span>
                                        <span className="text-[11px] font-mono font-semibold text-gray-600">
                                          {formatRupiah(hj.harga_jual)}/kg
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="p-3 text-xs text-gray-500 text-center">
                                Tidak ada Harga Jual cocok dgn "{scanHargaJual}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>"""

old_input_hj = """                      <div className="relative flex-1">
                        <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          ref={inputHargaJualRef}
                          type="text"
                          disabled={!pendingScanBal}
                          placeholder={pendingScanBal ? "Scan Harga Jual & Enter" : "Tunggu Langkah 2"}
                          value={scanHargaJual}
                          onChange={(e) => setScanHargaJual(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleScanHargaJualSubmit();
                            }
                          }}
                          className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                        />
                      </div>"""

content = content.replace(old_input_hj, input_hj_repl)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)
print("patched hj dropdown")

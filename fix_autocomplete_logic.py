import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

# Add states for autocomplete
state_repl = """  const [scanGudang, setScanGudang] = useState('');
  const [isBalDropdownOpen, setIsBalDropdownOpen] = useState(false);
  const [highlightedBalIndex, setHighlightedBalIndex] = useState(0);
  const balDropdownRef = React.useRef<HTMLDivElement>(null);"""

content = re.sub(r'\s*const \[scanGudang, setScanGudang\] = useState\(\'\'\);', '\n' + state_repl, content)

# Add logic for useMemo balSuggestions
memo_repl = """
  // Compute bal suggestions dynamically based on scanGudang
  const balSuggestions = useMemo(() => {
    const q = scanGudang.trim().toLowerCase();
    if (!q) return [];
    const qClean = q.replace(/[^a-zA-Z0-9]/g, '');
    const pool = availableBalList.length > 0 ? availableBalList : barangList;
    
    let matches = pool.filter((b) => {
      const bNo = (b.no_bal || b.barang_id).toLowerCase();
      const bNoClean = bNo.replace(/[^a-zA-Z0-9]/g, '');
      return bNoClean.includes(qClean) || (b.barang_id && b.barang_id.toLowerCase().includes(qClean));
    });

    matches = matches.filter(b => b.status_stok === 'di_gudang');

    matches.sort((a, b) => {
      const aNo = a.no_bal || a.barang_id;
      const bNo = b.no_bal || b.barang_id;
      const aStarts = aNo.toLowerCase().startsWith(qClean);
      const bStarts = bNo.toLowerCase().startsWith(qClean);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' });
    });

    return matches.slice(0, 20);
  }, [availableBalList, barangList, scanGudang]);

  const handleSelectSuggestedBal = (bal: Barang) => {
    if (selectedBalItems.some((it) => it.barangId === bal.barang_id)) {
      setScanSampleAlert({
        type: 'warning',
        message: `Bal #${bal.no_bal || bal.barang_id} sudah ada dalam tabel sample batch ini.`,
      });
      setIsBalDropdownOpen(false);
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    setPendingScanBal(bal);
    setScanSampleAlert({
      type: 'success',
      message: `LANGKAH 1 SUKSES: Bal Gudang #${bal.no_bal || bal.barang_id} dipilih. Lanjut scan Bal Pembeli.`,
    });
    setIsBalDropdownOpen(false);
    setScanGudang(bal.no_bal || bal.barang_id); // set display to the selected one
    setTimeout(() => inputPembeliRef.current?.focus(), 100);
  };
"""

content = re.sub(r'// Filter & Search State', memo_repl + '\n  // Filter & Search State', content)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

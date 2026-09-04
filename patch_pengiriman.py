import re

with open('src/components/pengiriman/PengirimanManagement.tsx', 'r') as f:
    content = f.read()

state_repl = """  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [highlightedBatchIndex, setHighlightedBatchIndex] = useState(0);
  const [scanBatchId, setScanBatchId] = useState('');
  const batchDropdownRef = React.useRef<HTMLDivElement>(null);
  const inputBatchRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(e.target as Node)) {
        setIsBatchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
"""

content = content.replace("  const [availableBalsMemo, setAvailableBalsMemo] = useState<Barang[]>([]);", "  const [availableBalsMemo, setAvailableBalsMemo] = useState<Barang[]>([]);\n" + state_repl)

memo_repl = """  const availableBatches = useMemo(() => {
    return activeBatchSampleList.filter(
      (b) => (b.items || []).length > 0 && (b.status === 'selesai_deal' || b.status === 'deal_sebagian')
    );
  }, [activeBatchSampleList]);

  const batchSuggestions = useMemo(() => {
    const q = scanBatchId.trim().toLowerCase();
    if (!q) return availableBatches.slice(0, 5); // show recent 5 by default
    return availableBatches.filter((b) => 
      b.kode_batch.toLowerCase().includes(q) || 
      b.tujuan_buyer.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [availableBatches, scanBatchId]);

  const handleSelectSuggestedBatch = (batchId: string) => {
    setScanBatchId(batchId);
    setIsBatchDropdownOpen(false);
    handleSelectBatchForShipment(batchId);
  };
"""

content = re.sub(r'  const availableBatches = useMemo\(\(\) => \{\n    return activeBatchSampleList\.filter\(\n      \(b\) => \(b\.items \|\| \[\]\)\.length > 0 && \(b\.status === \'selesai_deal\' \|\| b\.status === \'deal_sebagian\'\)\n    \);\n  \}, \[activeBatchSampleList\]\);', memo_repl, content)

# Change <select> to <input> with autocomplete
old_select = """                    <select
                      value={selectedBatchSampleId}
                      onChange={(e) => handleSelectBatchForShipment(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-amber-300 rounded-xs focus:ring-1 focus:ring-amber-500 text-gray-900"
                    >
                      {availableBatches.length === 0 ? (
                        <option value="">Tidak ada batch sample yang tersedia</option>
                      ) : (
                        availableBatches.map((b) => {
                          const items = b.items || [];
                          const accCount = items.filter((it) => it.status_item === 'disetujui' && !it.sudah_dikirim_do).length;
                          return (
                            <option key={b.batch_id} value={b.batch_id}>
                              {b.kode_batch} • {b.tujuan_buyer} • {items.length} Bal Sample ({accCount} Bal Di-ACC) • Deal: {formatRupiah(b.total_nilai_deal || 0)}
                            </option>
                          );
                        })
                      )}
                    </select>"""

new_input = """                    <div className="relative">
                      <div className="flex items-center absolute left-3 top-2 text-amber-500">
                        <Search className="w-3.5 h-3.5" />
                      </div>
                      <input
                        ref={inputBatchRef}
                        type="text"
                        placeholder="Ketik kode batch (Misal: SPL0001)..."
                        value={scanBatchId}
                        onChange={(e) => {
                          setScanBatchId(e.target.value);
                          setIsBatchDropdownOpen(true);
                          setHighlightedBatchIndex(0);
                        }}
                        onFocus={() => {
                          setIsBatchDropdownOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (isBatchDropdownOpen && batchSuggestions.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setHighlightedBatchIndex((prev) => Math.min(prev + 1, batchSuggestions.length - 1));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setHighlightedBatchIndex((prev) => Math.max(prev - 1, 0));
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSelectSuggestedBatch(batchSuggestions[highlightedBatchIndex].batch_id);
                              setScanBatchId(batchSuggestions[highlightedBatchIndex].kode_batch);
                            } else if (e.key === 'Escape') {
                              setIsBatchDropdownOpen(false);
                            }
                          }
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs font-mono font-bold bg-white border border-amber-300 rounded-xs focus:ring-1 focus:ring-amber-500 text-gray-900 placeholder-gray-400 uppercase"
                      />
                      
                      {/* Dropdown Autocomplete Batch */}
                      {isBatchDropdownOpen && (
                        <div
                          ref={batchDropdownRef}
                          className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-300 rounded-sm shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100"
                        >
                          {batchSuggestions.length > 0 ? (
                            batchSuggestions.map((b, idx) => {
                              const isHighlighted = idx === highlightedBatchIndex;
                              const items = b.items || [];
                              const accCount = items.filter((it) => it.status_item === 'disetujui' && !it.sudah_dikirim_do).length;
                              
                              return (
                                <button
                                  key={b.batch_id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectSuggestedBatch(b.batch_id);
                                    setScanBatchId(b.kode_batch);
                                  }}
                                  onMouseEnter={() => setHighlightedBatchIndex(idx)}
                                  className={`w-full px-3 py-2 text-left flex flex-col gap-0.5 transition cursor-pointer ${
                                    isHighlighted ? 'bg-amber-50 text-amber-950 border-l-4 border-amber-500' : 'hover:bg-gray-50 text-gray-800 border-l-4 border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-xs">
                                      {b.kode_batch}
                                    </span>
                                    <span className="font-bold text-xs">{b.tujuan_buyer}</span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 flex gap-2">
                                    <span>Total: {items.length} Bal</span>
                                    <span className="text-emerald-600 font-semibold text-[10px]">Di-ACC: {accCount} Bal</span>
                                    <span className="text-gray-400">|</span>
                                    <span>Deal: {formatRupiah(b.total_nilai_deal || 0)}</span>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="p-3 text-xs text-gray-500 text-center">
                              Tidak ada batch cocok dgn "{scanBatchId}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>"""

content = content.replace(old_select, new_input)

with open('src/components/pengiriman/PengirimanManagement.tsx', 'w') as f:
    f.write(content)
print("patched pengiriman")

import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

replacement = """                    <label className="block text-[11px] font-bold text-gray-700 mb-1">No Bal</label>
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-8" />
                    <input
                      ref={inputGudangRef}
                      type="text"
                      placeholder="Scan / ketik No. Bal Gudang"
                      value={scanGudang}
                      onChange={(e) => {
                         setScanGudang(e.target.value);
                         setIsBalDropdownOpen(true);
                         setHighlightedBalIndex(0);
                      }}
                      onFocus={() => {
                        if (scanGudang.trim().length > 0) setIsBalDropdownOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (isBalDropdownOpen && balSuggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlightedBalIndex((prev) => Math.min(prev + 1, balSuggestions.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightedBalIndex((prev) => Math.max(prev - 1, 0));
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSelectSuggestedBal(balSuggestions[highlightedBalIndex]);
                          } else if (e.key === 'Escape') {
                            setIsBalDropdownOpen(false);
                          }
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanGudangSubmit();
                        }
                      }}
                      className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold"
                    />
                    
                    {isBalDropdownOpen && scanGudang.trim().length > 0 && (
                      <div
                        ref={balDropdownRef}
                        className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-300 rounded-sm shadow-xl max-h-72 overflow-y-auto divide-y divide-gray-100"
                      >
                        <div className="px-3 py-1.5 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between border-b border-gray-200">
                          <span>Rekomendasi Bal Gudang ({balSuggestions.length}):</span>
                          <span className="text-[10px] text-gray-400 font-normal lowercase">Pilih dgn Enter atau Klik</span>
                        </div>
                        {balSuggestions.length > 0 ? (
                          balSuggestions.map((bal, idx) => {
                            const isSelectedInBatch = selectedBalItems.some((it) => it.barangId === bal.barang_id);
                            const isHighlighted = idx === highlightedBalIndex;
                            return (
                              <button
                                key={bal.barang_id}
                                type="button"
                                onClick={() => handleSelectSuggestedBal(bal)}
                                onMouseEnter={() => setHighlightedBalIndex(idx)}
                                className={`w-full px-3 py-2 text-left flex items-center justify-between transition cursor-pointer ${
                                  isHighlighted ? 'bg-red-50 text-red-950 border-l-4 border-[#b81d24]' : 'hover:bg-gray-50 text-gray-800'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-xs text-gray-900 bg-amber-100 px-1.5 py-0.5 rounded-xs border border-amber-300">
                                      #{bal.no_bal || bal.barang_id}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 text-[10px] font-bold rounded-xs">
                                      Grade {bal.kode_grade}
                                    </span>
                                    <span className="text-[11px] font-mono font-semibold text-gray-600">
                                      {formatNumber(bal.berat_kg, 1)} Kg
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  {isSelectedInBatch ? (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-xs border border-amber-200">
                                      ✓ Masuk
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
                                      + Pilih
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-xs text-gray-500 text-center">
                            Tidak ada No Bal cocok dgn "{scanGudang}"
                          </div>
                        )}
                      </div>
                    )}"""


# Replace the old input definition block
old_input = r"""<label className="block text-\[11px\] font-bold text-gray-700 mb-1">No Bal</label>
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-8" />
                    <input
                      ref=\{inputGudangRef\}
                      type="text"
                      placeholder="Scan / ketik No\. Bal Gudang"
                      value=\{scanGudang\}
                      onChange=\{\(e\) => setScanGudang\(e\.target\.value\)\}
                      onKeyDown=\{\(e\) => \{
                        if \(e\.key === 'Enter'\) \{
                          e\.preventDefault\(\);
                          handleScanGudangSubmit\(\);
                        \}
                      \}\}
                      className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-\[#b81d24\] focus:ring-0 rounded-xs text-gray-900 font-bold"
                    />"""

content = re.sub(old_input, replacement, content, flags=re.DOTALL)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

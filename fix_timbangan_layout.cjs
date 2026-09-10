const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/TimbanganPageView.tsx', 'utf8');

const targetStart = `{/* Main Workspace */}`;
const targetEnd = `{/* Footer Actions */}`;

const parts = code.split(targetStart);
if (parts.length > 1) {
  const innerParts = parts[1].split(targetEnd);
  
  const replacement = `
              <div className="p-8 flex-1 flex flex-col justify-center">
                <div className="max-w-2xl mx-auto w-full space-y-8">
                  
                  {/* Top section: Bruto and Netto side-by-side but balanced */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Bruto Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        Berat Kotor (Bruto) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          ref={beratBrutoInputRef}
                          type="number"
                          step="0.1"
                          min="0"
                          value={beratBrutoInput}
                          disabled={isActiveBalWeighed}
                          onChange={(e) => setBeratBrutoInput(e.target.value)}
                          onKeyDown={handleKeyDownWeight}
                          className="w-full bg-white border border-slate-300 rounded-md py-2.5 px-4 text-lg font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition"
                          placeholder="0.0"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                          <span className="text-slate-500 font-semibold text-sm">KG</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">Ketik lalu tekan Enter untuk simpan.</p>
                    </div>

                    {/* Netto Display */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        Berat Bersih (Netto)
                      </label>
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-md py-2.5 px-4 flex items-center justify-between">
                        <span className="text-lg font-bold text-slate-800">{liveNetto}</span>
                        <span className="text-slate-500 font-semibold text-sm">KG</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                         <span className="text-slate-500">Potongan Tara:</span>
                         <span className="font-semibold text-slate-600">{liveBruto ? liveTara : 0} KG</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom section: Ganti Tikar */}
                  <div className="pt-2 border-t border-slate-100">
                     <label className="flex items-center space-x-3 cursor-pointer group w-max mb-3">
                       <div className="relative flex items-center">
                         <input
                           type="checkbox"
                           checked={activeBalItem.ganti_tikar}
                           onChange={() => handleToggleGantiTikar(activeBalItem.item_id)}
                           disabled={isActiveBalWeighed}
                           className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                         />
                       </div>
                       <div>
                         <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition">Ada Ganti Tikar?</span>
                       </div>
                     </label>
                     
                     {activeBalItem.ganti_tikar && (
                       <div className="ml-7 max-w-xs">
                         <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nominal Potongan Tikar (Rp)</label>
                         <input
                           type="number"
                           value={potTikarInput}
                           onChange={(e) => setPotTikarInput(parseFloat(e.target.value) || 0)}
                           disabled={isActiveBalWeighed}
                           className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                         />
                       </div>
                     )}
                  </div>

                </div>
              </div>

              `;
  fs.writeFileSync('src/components/transaksi/TimbanganPageView.tsx', parts[0] + targetStart + replacement + targetEnd + innerParts[1]);
}


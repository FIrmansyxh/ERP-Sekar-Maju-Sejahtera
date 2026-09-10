const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/TimbanganPageView.tsx', 'utf8');

let newForm = `            <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-xs mt-4">
              <div className="flex items-center space-x-3 px-5 py-4 border-b border-slate-100">
                <Package className="w-6 h-6 text-slate-600" />
                <h2 className="text-xl font-medium text-slate-700">Input Berat</h2>
              </div>
              
              <div className="p-6 space-y-6">
                {isActiveBalWeighed && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-center justify-between">
                     <span className="text-amber-800 text-sm">Bal sudah ditimbang & terkunci.</span>
                     <button onClick={() => handleUnlockActiveBal(activeBalItem.item_id)} className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded text-sm transition">Buka Kunci</button>
                  </div>
                )}

                {/* Form Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-y-6 gap-x-4">
                  {/* No Ball */}
                  <label className="text-slate-600 text-[15px]">No. Ball</label>
                  <div className="relative">
                    <select 
                      className="w-full sm:w-2/3 lg:w-1/2 appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 px-4 pr-10 rounded text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                      value={activeBalItem.item_id}
                      onChange={(e) => setActiveBalItemId(e.target.value)}
                    >
                      <option value="" disabled>Pilih Noball</option>
                      {workingItems.map(item => (
                        <option key={item.item_id} value={item.item_id}>{item.no_bal}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute w-5 h-5 text-slate-400 right-[calc(100%-66.666%+12px)] sm:right-[calc(100%-66.666%+12px)] lg:right-[calc(100%-50%+12px)] top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Berat / Bruto */}
                  <label className="text-slate-600 text-[15px]">Berat / Bruto</label>
                  <div>
                    <input 
                      ref={beratBrutoInputRef}
                      type="number"
                      step="0.1"
                      min="0"
                      value={beratBrutoInput}
                      disabled={isActiveBalWeighed}
                      onChange={(e) => setBeratBrutoInput(e.target.value)}
                      onKeyDown={handleKeyDownWeight}
                      className="w-full sm:w-2/3 lg:w-1/2 bg-white border border-slate-300 text-slate-700 py-2.5 px-4 rounded text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  {/* Berat / Netto */}
                  <label className="text-slate-600 text-[15px]">Berat / Netto</label>
                  <div>
                    <input 
                      type="text"
                      value={liveNetto}
                      disabled
                      className="w-full sm:w-2/3 lg:w-1/2 bg-[#eef1f5] border border-slate-300 text-slate-700 py-2.5 px-4 rounded text-sm focus:outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Ganti Tikar */}
                  <label className="text-slate-600 text-[15px]">Ganti Tikar</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={activeBalItem.ganti_tikar}
                        onChange={() => handleToggleGantiTikar(activeBalItem.item_id)}
                        disabled={isActiveBalWeighed}
                        className="w-[18px] h-[18px] rounded-sm border-slate-400 text-slate-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-slate-700 text-sm">Ya</span>
                    </label>
                    {activeBalItem.ganti_tikar && (
                      <input 
                        type="number"
                        value={potTikarInput}
                        onChange={(e) => setPotTikarInput(parseFloat(e.target.value) || 0)}
                        disabled={isActiveBalWeighed}
                        className="w-32 bg-white border border-slate-300 text-slate-700 py-1.5 px-3 rounded text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                      />
                    )}
                  </div>
                  
                  {/* Empty cell for grid alignment on desktop */}
                  <div className="hidden sm:block"></div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApplyWeightForActiveBal}
                      disabled={isActiveBalWeighed || !liveBruto || liveBruto <= 0}
                      className="bg-[#f0ad4e] hover:bg-[#ec971f] text-white px-5 py-2.5 rounded text-sm font-medium flex items-center justify-center sm:justify-start space-x-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Data</span>
                    </button>
                  </div>
                </div>
                
                {/* Footer showing table entries controls to match the mockup */}
                <div className="pt-8 flex items-center space-x-2 text-slate-600 text-sm">
                  <span>Show</span>
                  <select className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                  <span>entries</span>
                </div>
              </div>
            </div>`;

let startMarker = '<div className="bg-white border border-slate-200 shadow-2xs rounded-sm overflow-hidden">';
let endMarker = '          ) : (';

let startIndex = code.indexOf(startMarker);
let endIndex = code.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  let before = code.substring(0, startIndex);
  let after = code.substring(endIndex);
  code = before + newForm + '\n' + after;
  fs.writeFileSync('src/components/transaksi/TimbanganPageView.tsx', code);
  console.log("Successfully replaced TimbanganPageView form block.");
} else {
  console.log("Markers not found");
}

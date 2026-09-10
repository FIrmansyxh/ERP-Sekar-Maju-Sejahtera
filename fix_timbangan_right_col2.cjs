const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/TimbanganPageView.tsx', 'utf8');

const rightColStart = `{/* Right Column: Active Bal Weighing Workbench (8 Cols) */}`;

const parts = code.split(rightColStart);

if (parts.length > 1) {
  let before = parts[0];
  let replacement = `
        {/* Right Column: Active Bal Weighing Workbench (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
          {activeBalItem ? (
            <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">
              {/* Enterprise Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 text-blue-700 p-2.5 rounded-lg">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                      Weighing: {activeBalItem.no_bal}
                    </h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-sm">
                        Grade {activeBalItem.kode_grade}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Barcode: {activeBalItem.barcode}
                      </span>
                    </div>
                  </div>
                </div>
                {isActiveBalWeighed && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    Terkunci
                  </span>
                )}
              </div>

              {/* Main Workspace */}
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto w-full">
                  
                  {/* Left part: Inputs */}
                  <div className="space-y-6">
                    {/* Bruto Input */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                          className="w-full bg-white border border-slate-300 rounded-md py-3 px-4 text-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition"
                          placeholder="0.00"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                          <span className="text-slate-500 font-semibold">KG</span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">Masukkan berat kotor hasil timbangan.</p>
                    </div>

                    {/* Ganti Tikar Checkbox */}
                    <div className="pt-2">
                       <label className="flex items-center space-x-3 cursor-pointer group">
                         <div className="relative flex items-center">
                           <input
                             type="checkbox"
                             checked={activeBalItem.ganti_tikar}
                             onChange={() => handleToggleGantiTikar(activeBalItem.item_id)}
                             disabled={isActiveBalWeighed}
                             className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                           />
                         </div>
                         <div>
                           <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition">Ada Ganti Tikar?</span>
                         </div>
                       </label>
                       
                       {activeBalItem.ganti_tikar && (
                         <div className="mt-3 ml-8">
                           <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal Potongan Tikar (Rp)</label>
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

                  {/* Right part: Output / Netto Display */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-center text-center space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Berat Bersih (Netto)</h3>
                    </div>
                    <div className="text-6xl font-black text-slate-800 tracking-tighter">
                      {liveNetto} <span className="text-2xl text-slate-500 font-bold ml-1">KG</span>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200 flex justify-between text-sm">
                      <span className="text-slate-500">Potongan Tara:</span>
                      <span className="font-bold text-slate-700">{liveBruto ? activeTara : 0} KG</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  {isActiveBalWeighed ? (
                    <button
                      type="button"
                      onClick={() => handleUnlockActiveBal(activeBalItem.item_id)}
                      className="text-amber-600 hover:text-amber-700 font-semibold text-sm flex items-center transition"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Buka Kunci (Edit Ulang)
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500">Pastikan data sudah benar sebelum menyimpan.</p>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    disabled={isActiveBalWeighed || !liveBruto || liveBruto <= 0}
                    onClick={handleApplyWeightForActiveBal}
                    className="bg-[#f0ad4e] hover:bg-[#ec971f] text-white px-6 py-2.5 rounded-md text-sm font-semibold shadow-sm flex items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Timbangan
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-sm flex flex-col items-center justify-center h-full">
              <Scale className="w-16 h-16 mb-4 text-slate-200" />
              <h3 className="text-lg font-bold text-slate-700">Tidak ada bal yang aktif dipilih</h3>
              <p className="text-sm text-slate-500 max-w-md mt-2">
                Silakan scan barcode stiker bal atau pilih dari daftar bal di sebelah kiri untuk mulai menimbang.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
`
  // We need to match the final closing tags from the old string or just append to it
  fs.writeFileSync('src/components/transaksi/TimbanganPageView.tsx', before + replacement);
}


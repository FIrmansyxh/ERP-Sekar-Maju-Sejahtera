import re

with open('src/components/transaksi/TimbanganPageView.tsx', 'r') as f:
    content = f.read()

# We want to replace everything from `          {activeBalItem ? (` to `          ) : (`
# Wait, let's replace the whole `activeBalItem` block up to `) : (`.

pattern = r"(\s*\{activeBalItem \? \([\s\S]*?\)\s*:\s*\()"
repl = """          {activeBalItem ? (
            <div className="bg-white border border-slate-200 shadow-2xs rounded-sm overflow-hidden">
              
              {/* Enterprise Header */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <Scale className="w-4 h-4 text-slate-300" />
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
                      Input Berat Bal: {activeBalItem.no_bal}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Petani: {currentTx?.nama_petani} • Kupon: <span className="font-mono text-slate-200">{currentTx?.no_kupon}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-200 font-mono font-medium text-xs rounded-xs border border-slate-700">
                    Grade {activeBalItem.kode_grade} ({formatRupiah(activeBalItem.harga_per_kg)}/kg)
                  </span>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-4 space-y-3.5">
                
                {/* Info Bar for Already Weighed Items */}
                {isActiveBalWeighed && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-start space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-0.5">Sudah Ditimbang</h4>
                      <p className="text-[11px] text-amber-700">Nomor bal ini sudah memiliki data berat dan tersimpan. Anda hanya dapat melihat datanya (Mode Baca).</p>
                    </div>
                  </div>
                )}
                
                {/* Input Fields */}
                <div className="space-y-3.5">
                  
                  {/* Berat Bruto Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Berat / Bruto (Kg) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Berat timbangan kotor sebelum dikurangi tara
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        ref={beratBrutoInputRef}
                        type="number"
                        step="0.1"
                        value={beratBrutoInput}
                        onChange={(e) => setBeratBrutoInput(e.target.value)}
                        onKeyDown={handleKeyDownWeight}
                        placeholder="0.0"
                        disabled={isActiveBalWeighed}
                        className={`w-full border rounded-sm px-4 py-2 text-xl font-mono font-semibold tabular-nums focus:outline-none placeholder:text-slate-300 ${isActiveBalWeighed ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-900 border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800'}`}
                        autoFocus
                      />
                      <span className="absolute right-4 top-2 text-slate-400 font-mono font-semibold text-sm">
                        KG
                      </span>
                    </div>

                    {/* Quick weight buttons */}
                    <div className="flex items-center space-x-1.5 mt-2 overflow-x-auto pb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Preset:</span>
                      {[50, 55, 60, 62.5, 65, 70, 75].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setBeratBrutoInput(val);
                            beratBrutoInputRef.current?.focus();
                          }}
                          disabled={isActiveBalWeighed}
                          className={`px-2.5 py-1 border rounded-xs text-[10px] font-mono font-medium transition ${isActiveBalWeighed ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 cursor-pointer'}`}
                        >
                          {val} kg
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ganti Tikar Toggle Row */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={activeBalItem.ganti_tikar}
                        onChange={() => handleToggleGantiTikar(activeBalItem.item_id)}
                        disabled={isActiveBalWeighed}
                        className={`w-4 h-4 rounded-xs border-slate-300 text-slate-900 focus:ring-slate-900 ${isActiveBalWeighed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-900">
                          Ganti Tikar (+Rp 75.000 / Bal)
                        </span>
                        <p className="text-[10px] text-slate-500">
                          {activeBalItem.ganti_tikar
                            ? 'Tikar diganti. Tara: 2kg (<50), 3kg (50-59), 4kg (≥60)'
                            : 'Tikar madura. Tara: 3kg (<50), 4kg (50-59), 5kg (≥60)'}
                        </p>
                      </div>
                    </label>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-xs bg-slate-200/80 text-slate-800 border border-slate-300/60 font-mono">
                      Tara: {liveTara} Kg
                    </span>
                  </div>

                  {/* Berat Netto Result Box */}
                  <div className="p-2.5 bg-slate-900 text-white rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-center border border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Berat Bruto</span>
                      <p className="text-base font-mono font-semibold text-slate-100 tabular-nums">{liveBruto.toFixed(1)} Kg</p>
                    </div>
                    <div className="border-x border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Potongan Tara</span>
                      <p className="text-base font-mono font-semibold text-slate-300 tabular-nums">-{liveTara.toFixed(1)} Kg</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Netto Final</span>
                      <p className="text-xl font-mono font-bold text-slate-100 tabular-nums">{liveNetto.toFixed(1)} Kg</p>
                    </div>
                  </div>

                  {/* Realtime Potongan & Subtotal Calculation */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-[11px] space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Kotor ({liveNetto} kg × {formatRupiah(activeBalItem.harga_per_kg)}):</span>
                      <span className="font-mono font-semibold text-slate-900">{formatRupiah(liveTotalKotor)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>
                        Potongan (Kuli, Tali{activeBalItem.ganti_tikar ? ', Tikar' : ''}):
                      </span>
                      <span className="font-mono font-medium text-slate-700">-{formatRupiah(livePotTotal)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between text-xs font-semibold text-slate-900">
                      <span>Subtotal Bersih:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(liveSubtotalBersih)}</span>
                    </div>
                  </div>

                  {/* Lokasi Gudang Blok */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                        Alokasi Blok Gudang
                      </label>
                      <select
                        value={lokasiBlok}
                        onChange={(e) => setLokasiBlok(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-sm px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                      >
                        <option value="Blok A (Utara)">Blok A (Utara - Grade Super)</option>
                        <option value="Blok B (Timur)">Blok B (Timur - Grade Bagus)</option>
                        <option value="Blok C (Barat)">Blok C (Barat - Grade Sedang)</option>
                        <option value="Blok D (Selatan)">Blok D (Selatan - Grade Standar)</option>
                        <option value="Blok E (Penyangga)">Blok E (Penyangga)</option>
                        <option value="Blok F (Transit Sample)">Blok F (Transit Sample)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                        Petugas Timbang
                      </label>
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-sm px-2 py-1 text-[11px] text-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 truncate">
                          <User className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">
                            {currentUser?.nama_lengkap || 'Operator Timbang'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button Enterprise Style */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleApplyWeightForActiveBal}
                    disabled={isActiveBalWeighed}
                    className={`w-full py-2.5 font-medium text-xs uppercase tracking-wider rounded-sm transition flex items-center justify-center space-x-2 shadow-2xs ${isActiveBalWeighed ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'}`}
                  >
                    <Check className={`w-4 h-4 ${isActiveBalWeighed ? 'text-slate-400' : 'text-slate-200'}`} />
                    <span>{isActiveBalWeighed ? 'Sudah Disimpan' : 'Simpan Data Timbangan Bal (Enter)'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : ("""

content = re.sub(pattern, repl, content, count=1)

with open('src/components/transaksi/TimbanganPageView.tsx', 'w') as f:
    f.write(content)

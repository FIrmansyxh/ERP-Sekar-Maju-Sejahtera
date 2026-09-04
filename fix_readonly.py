import re

with open('src/components/transaksi/TimbanganPageView.tsx', 'r') as f:
    content = f.read()

# 1. Add `isActiveBalWeighed` inside component before return
var_pattern = r"(  const isGantiTikarActive = Boolean\(activeBalItem\?\.ganti_tikar\);)"
var_replacement = r"""  const isActiveBalWeighed = (activeBalItem?.berat_kg || 0) > 0;
\1"""
content = re.sub(var_pattern, var_replacement, content)

# 2. Block handleApplyWeightForActiveBal
apply_pattern = r"(  const handleApplyWeightForActiveBal = \(\) => \{\n    if \(!activeBalItem \|\| !currentTx\) return;)"
apply_replacement = r"""\1
    
    if (isActiveBalWeighed) {
      setScanFeedback({ text: 'Bal ini sudah ditimbang. Data tidak bisa diubah.', isError: true });
      return;
    }"""
content = re.sub(apply_pattern, apply_replacement, content)

# 3. Add Banner above the input section
banner_pattern = r"(                \{/\* Bal Overview Strip \*/\})"
banner_replacement = r"""                {/* Info Bar for Already Weighed Items */}
                {isActiveBalWeighed && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-start space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-0.5">Sudah Ditimbang</h4>
                      <p className="text-[11px] text-amber-700">Nomor bal ini sudah memiliki data berat dan tersimpan. Anda hanya dapat melihat datanya (Mode Baca).</p>
                    </div>
                  </div>
                )}
                
\1"""
content = re.sub(banner_pattern, banner_replacement, content)

# 4. Disable `beratBrutoInput`
input_pattern = r"(<input\s*ref=\{beratBrutoInputRef\}\s*type=\"number\"\s*step=\"0\.1\"\s*value=\{beratBrutoInput\}\s*onChange=\{\(e\) => setBeratBrutoInput\(e\.target\.value\)\}\s*onKeyDown=\{handleKeyDownWeight\}\s*placeholder=\"0\.0\")"
input_replacement = r"""\1
                        disabled={isActiveBalWeighed}"""
content = re.sub(input_pattern, input_replacement, content)
# update input styling for disabled state
input_class_pattern = r"(className=\"w-full bg-white border border-slate-300 rounded-sm px-4 py-2\.5 text-2xl font-mono font-semibold text-slate-900 tabular-nums focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 placeholder:text-slate-300\")"
input_class_replacement = r"""className={`w-full border rounded-sm px-4 py-2.5 text-2xl font-mono font-semibold tabular-nums focus:outline-none placeholder:text-slate-300 ${isActiveBalWeighed ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-900 border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800'}`}"""
content = re.sub(input_class_pattern, input_class_replacement, content)

# 5. Disable Preset Buttons
preset_btn_pattern = r"(<button\s*key=\{val\}\s*type=\"button\"\s*onClick=\{\(\) => \{\s*setBeratBrutoInput\(val\);\s*beratBrutoInputRef\.current\?\.focus\(\);\s*\}\}\s*)(className=\"px-2\.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xs text-xs font-mono font-medium transition cursor-pointer\")"
preset_btn_replacement = r"""\1
                          disabled={isActiveBalWeighed}
                          className={`px-2.5 py-1 border rounded-xs text-xs font-mono font-medium transition ${isActiveBalWeighed ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 cursor-pointer'}`}"""
content = re.sub(preset_btn_pattern, preset_btn_replacement, content)

# 6. Disable Ganti Tikar Checkbox
tikar_pattern = r"(<input\s*type=\"checkbox\"\s*checked=\{activeBalItem\.ganti_tikar\}\s*onChange=\{\(\) => handleToggleGantiTikar\(activeBalItem\.item_id\)\}\s*)(className=\"w-4 h-4 rounded-xs border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer\")"
tikar_replacement = r"""\1
                        disabled={isActiveBalWeighed}
                        className={`w-4 h-4 rounded-xs border-slate-300 text-slate-900 focus:ring-slate-900 ${isActiveBalWeighed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}"""
content = re.sub(tikar_pattern, tikar_replacement, content)

# 7. Disable Save Button
save_btn_pattern = r"(<button\s*type=\"button\"\s*onClick=\{handleApplyWeightForActiveBal\}\s*)(className=\"w-full py-2\.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs uppercase tracking-wider rounded-sm transition flex items-center justify-center space-x-2 cursor-pointer shadow-2xs\"\s*>)"
save_btn_replacement = r"""\1
                    disabled={isActiveBalWeighed}
                    className={`w-full py-2.5 font-medium text-xs uppercase tracking-wider rounded-sm transition flex items-center justify-center space-x-2 shadow-2xs ${isActiveBalWeighed ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'}`}
                  >"""
content = re.sub(save_btn_pattern, save_btn_replacement, content)

# also change the icon / text of the save button
save_text_pattern = r"(<Check className=\"w-4 h-4 text-slate-200\" />\s*<span>Simpan Data Timbangan Bal \(Enter\)</span>)"
save_text_replacement = r"""<Check className={`w-4 h-4 ${isActiveBalWeighed ? 'text-slate-400' : 'text-slate-200'}`} />
                    <span>{isActiveBalWeighed ? 'Sudah Disimpan' : 'Simpan Data Timbangan Bal (Enter)'}</span>"""
content = re.sub(save_text_pattern, save_text_replacement, content)


with open('src/components/transaksi/TimbanganPageView.tsx', 'w') as f:
    f.write(content)

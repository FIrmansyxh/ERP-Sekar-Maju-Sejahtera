import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Replace the input and remove dropdown
new_input_block = """                <div className="relative">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={inputNoBal}
                    autoComplete="off"
                    onChange={(e) => setInputNoBal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleKeyDownAdder(e);
                      }
                    }}
                    placeholder={`Contoh: ${getNextSuggestedNoBal().replace(/-/g, '')}`}
                    className="w-full bg-white border border-slate-300 rounded-sm px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 uppercase"
                  />
                  {inputNoBal && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputNoBal('');
                        barcodeInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>"""

# Find the block starting at `<div className="relative">` up to before `</div> {/* Grade Selection */}`
# We will just replace everything between `<label className="block text-xs font-semibold text-slate-700 mb-1">\s*No. Bal <span className="text-rose-500">\*</span>\s*</label>` and `</div>\s*\{\/\*\s*Grade Selection\s*\*\/\}`
pattern = r"""(<label className="block text-xs font-semibold text-slate-700 mb-1">\s*No\. Bal <span className="text-rose-500">\*</span>\s*</label>)[\s\S]*?(</div>\s*\{\/\*\s*Grade Selection\s*\*\/\})"""

content = re.sub(pattern, r"\1\n" + new_input_block + r"\n              \2", content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)
print("Cleaned Dropdown")

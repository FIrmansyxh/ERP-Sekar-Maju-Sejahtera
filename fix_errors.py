import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# 1. Remove sorting dropdown click outside logic
content = re.sub(r"const\s*handleClickOutside\s*=\s*\(event:\s*MouseEvent\)\s*=>\s*\{[\s\S]*?\}\s*\}", "", content)

# 2. Fix the input field to not use missing state variables
input_pattern = r"""<input\s*ref=\{barcodeInputRef\}\s*type="text"\s*value=\{inputNoBal\}\s*onChange=\{\(e\) => \{[\s\S]*?\}\}\s*onFocus=\{\(\) => \{[\s\S]*?\}\}\s*onKeyDown=\{\(e\) => \{[\s\S]*?\}\}\s*placeholder=\{`Contoh: \$\{getNextSuggestedNoBal\(\)\}`\}\s*className="w-full bg-white border border-slate-300 rounded-sm px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"\s*\/>"""
new_input = """<input
                    ref={barcodeInputRef}
                    type="text"
                    value={inputNoBal}
                    autoComplete="off"
                    onChange={(e) => {
                      setInputNoBal(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleKeyDownAdder(e);
                      }
                    }}
                    placeholder={`Contoh: ${getNextSuggestedNoBal().replace(/-/g, '')}`}
                    className="w-full bg-white border border-slate-300 rounded-sm px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 uppercase"
                  />"""
content = re.sub(input_pattern, new_input, content)

# 3. Remove the clear button's setIsBalDropdownOpen(false)
content = content.replace("setIsBalDropdownOpen(false);", "")

# 4. Remove the dropdown element
dropdown_pattern = r"\{\/\*\s*Autocomplete Dropdown\s*\*\/\}[\s\S]*?(\{\/\*\s*Add Button\s*\*\/\}|</div>\s*<div\s*className=\"md:col-span-3\")"
content = re.sub(dropdown_pattern, r"\1", content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)
print("Fixed errors")

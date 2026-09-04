import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Replace the entire input structure 
old_structure = r"""<div className="relative">\s*<input\s*ref=\{barcodeInputRef\}\s*type="text"\s*value=\{inputNoBal\}[\s\S]*?className="w-full bg-white border border-slate-300 rounded-sm px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"\s*\/>[\s\S]*?<\/button>\s*\)\}\s*<\/div>\s*\{\/\*\s*Autocomplete Dropdown\s*\*\/\}[\s\S]*?\}\s*<\/div>"""
# The dropdown is nested. I will use a robust way by finding the "No Bal Input" block.

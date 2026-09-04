import re

with open('src/components/transaksi/KasirPageView.tsx', 'r') as f:
    content = f.read()

# Remove import
content = re.sub(r"import\s*{\s*SampleLabelPrintModal,\s*SampleLabelData\s*}\s*from\s*'./SampleLabelPrintModal';\n", "", content)

# Remove state declaration
content = re.sub(r"\s*const\s*\[sampleLabelsToPrint,\s*setSampleLabelsToPrint\]\s*=\s*useState<SampleLabelData\[\]\s*\|\s*null>\(null\);", "", content)

# Remove handleOpenSampleLabelPrint function
content = re.sub(r"\s*const\s*handleOpenSampleLabelPrint\s*=\s*\(tx:\s*TransaksiPembelian\)\s*=>\s*\{[\s\S]*?setSampleLabelsToPrint\(labels\);\s*\};", "", content)

# Remove button
button_pattern = r"\s*<button\s*type=\"button\"\s*onClick=\{\(\)\s*=>\s*handleOpenSampleLabelPrint\(tx\)\}\s*className=\"p-1\.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xs transition cursor-pointer\"\s*title=\"Cetak Label Sample QC Bal\"\s*>\s*<Tag className=\"w-3\.5 h-3\.5\" />\s*</button>"
content = re.sub(button_pattern, "", content)

# Remove modal
modal_pattern = r"\s*\{\/\*\s*Sample Label Print Modal\s*\*\/\}\s*<SampleLabelPrintModal\s*isOpen=\{Boolean\(sampleLabelsToPrint\)\}\s*onClose=\{\(\)\s*=>\s*setSampleLabelsToPrint\(null\)\}\s*samples=\{sampleLabelsToPrint\s*\|\|\s*\[\]\}\s*\/>"
content = re.sub(modal_pattern, "", content)

with open('src/components/transaksi/KasirPageView.tsx', 'w') as f:
    f.write(content)

print("KasirPageView cleaned.")

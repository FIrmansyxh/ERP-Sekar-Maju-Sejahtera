import re

with open('src/components/transaksi/TransaksiManagement.tsx', 'r') as f:
    content = f.read()

# Remove import
content = re.sub(r"import\s*{\s*SampleLabelPrintModal,\s*SampleLabelData\s*}\s*from\s*'./SampleLabelPrintModal';\n", "", content)

# Remove state declaration
content = re.sub(r"\s*const\s*\[sampleLabelsToPrint,\s*setSampleLabelsToPrint\]\s*=\s*useState<SampleLabelData\[\]\s*\|\s*null>\(null\);", "", content)

# Remove handleOpenSampleLabelForTx function
content = re.sub(r"\s*const\s*handleOpenSampleLabelForTx\s*=\s*\(tx:\s*TransaksiPembelian\)\s*=>\s*\{[\s\S]*?setSampleLabelsToPrint\(samples\);\s*\};", "", content)

# Remove button 1
btn_pattern1 = r"\s*\{\/\*\s*2\.\s*Cetak Label Sample QC Admin 3 \(Amber Tag\)\s*\*\/\}\s*<button\s*type=\"button\"\s*onClick=\{\(\)\s*=>\s*handleOpenSampleLabelForTx\(tx\)\}\s*className=\"w-7 h-7 rounded-sm bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs\"\s*title=\"Cetak Label Sample QC \(Admin 3\)\"\s*>\s*<Tag className=\"w-3\.5 h-3\.5\" \/>\s*<\/button>"
content = re.sub(btn_pattern1, "", content)

# Remove modal
modal_pattern = r"\s*\{\/\*\s*Modal Cetak Label Sample QC \(Admin 3\)\s*\*\/\}\s*\{sampleLabelsToPrint\s*&&\s*\(\s*<SampleLabelPrintModal\s*isOpen=\{Boolean\(sampleLabelsToPrint\)\}\s*onClose=\{\(\)\s*=>\s*setSampleLabelsToPrint\(null\)\}\s*samples=\{sampleLabelsToPrint\}\s*onConfirmStored=\{\(\)\s*=>\s*setSampleLabelsToPrint\(null\)\}\s*\/>\s*\)\}"
content = re.sub(modal_pattern, "", content)

# There is also an inline setSampleLabelsToPrint call when saving sortir
content = re.sub(r"\s*setSampleLabelsToPrint\(sampleLabels\);", "", content)

with open('src/components/transaksi/TransaksiManagement.tsx', 'w') as f:
    f.write(content)

print("TransaksiManagement cleaned.")

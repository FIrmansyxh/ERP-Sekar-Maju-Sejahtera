import re

with open('src/components/pengiriman/PengirimanManagement.tsx', 'r') as f:
    content = f.read()

# Remove handlers
handlers = r'// Quick action: verify all bales\n\s*const handleVerifyAllBales = \(\) => \{.*?\};\n\n\s*// Select all bales in active batch\n\s*const handleSelectAllBatchBales = \(\) => \{.*?\};\n\n\s*// Select only approved \(ACC\) bales in active batch\n\s*const handleSelectOnlyAccBatchBales = \(\) => \{.*?\};\n\n\s*// Deselect all bales\n\s*const handleDeselectAllBatchBales = \(\) => \{.*?\};\n'

content = re.sub(handlers, '', content, flags=re.DOTALL)

# Remove "Verifikasi Semua Bal Otomatis" button
button1 = r'\{sourceMode === \'sample_batch\' && \(\n\s*<button\n\s*type="button"\n\s*onClick=\{handleVerifyAllBales\}.*?<span>Verifikasi Semua Bal Otomatis</span>\n\s*</button>\n\s*\)\}'
content = re.sub(button1, '', content, flags=re.DOTALL)

# Remove "Pilih Cepat" block
button2 = r'\{sourceMode === \'sample_batch\' && \(\n\s*<div className="flex items-center space-x-1\.5 flex-wrap">\n\s*<span className="text-\[11px\] font-bold text-gray-700 mr-1">Pilih Cepat:</span>\n.*?Kosongkan Pilihan\n\s*</button>\n\s*</div>\n\s*\)\}'
content = re.sub(button2, '', content, flags=re.DOTALL)

with open('src/components/pengiriman/PengirimanManagement.tsx', 'w') as f:
    f.write(content)

print("done")

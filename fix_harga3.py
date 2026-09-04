import re

with open('src/components/pengiriman/PengirimanManagement.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'\s*setCustomHargaMap\(\{.*?\}\);\n', '\n', content)
content = re.sub(r'catatan: catatan,', 'catatan: \'\',', content)

with open('src/components/pengiriman/PengirimanManagement.tsx', 'w') as f:
    f.write(content)

print("done")

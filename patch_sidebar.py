import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

# Add hargaCount prop
content = content.replace('hargaJualCount?: number;', 'hargaJualCount?: number;\n  hargaCount?: number;')
content = content.replace('hargaJualCount = 0,', 'hargaJualCount = 0,\n  hargaCount = 0,')

# Rename "Master Kualitas & Harga" to "Master Harga Beli"
content = content.replace("title: 'Master Kualitas & Harga',", "title: 'Master Harga Beli',")
content = content.replace("<span>Master Kualitas & Harga</span>", "<span>Master Harga Beli</span>")
content = content.replace("6 Grade", "{hargaCount} Kode")
content = content.replace("{hargaJualCount ?? 6} Kode", "{hargaJualCount} Kode")
content = content.replace("Tarif Acuan Grade A-F", "Kode & Kriteria Tembakau")

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
print("patched")

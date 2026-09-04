import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Fix double +
content = content.replace("<span>+ Tambah Bal</span>", "<span>Tambah Bal</span>")

# Reset grade after adding
pattern = r"// Clear and prepare for next scan\s*setInputNoBal\(''\);\s*setIsGantiTikar\(false\);"
replacement = """// Clear and prepare for next scan
    setInputNoBal('');
    setSelectedGrade('');
    setHargaSatuan(0);
    setIsGantiTikar(false);"""
content = re.sub(pattern, replacement, content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

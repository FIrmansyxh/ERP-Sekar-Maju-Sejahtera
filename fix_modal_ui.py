import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

# Fix double +
content = content.replace("<span>+ Tambah Baris Manual</span>", "<span>Tambah Baris Manual</span>")

# Reset grade after adding manual row
pattern_manual = r"(setLastScannedId\(newId\);\s*\};)"
replacement_manual = r"""\1
    setActiveDefaultGrade('');"""
content = re.sub(pattern_manual, replacement_manual, content)

# Reset grade after adding scanned row
pattern_scan = r"(setScannerFeedback\(\{\s*text: `✓ Stiker Barcode[^;]*?\}\);\s*setScannerInputValue\(''\);\s*if \(scannerInputRef\.current\) \{\s*scannerInputRef\.current\.focus\(\);\s*\})"
replacement_scan = r"""\1
    setActiveDefaultGrade('');"""
content = re.sub(pattern_scan, replacement_scan, content)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)

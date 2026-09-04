import re
with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

pattern_scan = r"(setScannerInputValue\(''\);\s*// Re-focus scanner input for continuous gun scanning\s*if \(scannerInputRef\.current\) \{\s*scannerInputRef\.current\.focus\(\);\s*\})"
replacement_scan = r"""\1
    setActiveDefaultGrade('');"""
content = re.sub(pattern_scan, replacement_scan, content)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)

import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

# Make activeDefaultGrade empty by default
content = re.sub(r"const \[activeDefaultGrade,\s*setActiveDefaultGrade\]\s*=\s*useState\(defaultGrade\);", "const [activeDefaultGrade, setActiveDefaultGrade] = useState('');", content)

# Check in handleAddManualRow
handle_add_manual = r"(const handleAddManualRow = \(\) => \{)"
new_handle_add_manual = r"""\1
    if (!activeDefaultGrade) {
      alert('Pilih Mutu/Grade terlebih dahulu sebelum menambah baris!');
      return;
    }"""
content = re.sub(handle_add_manual, new_handle_add_manual, content, count=1)

# Check in handleScannerSubmit
handle_scanner = r"(const handleScannerSubmit = \(e\?: React\.FormEvent\) => \{)"
new_handle_scanner = r"""\1
    if (!activeDefaultGrade) {
      setScannerFeedback({
        text: 'Pilih Mutu/Grade terlebih dahulu sebelum menscan!',
        isError: true,
      });
      return;
    }"""
content = re.sub(handle_scanner, new_handle_scanner, content, count=1)

# Ensure select has an empty option
select_pattern = r"(<select\s*value=\{activeDefaultGrade\}\s*onChange=\{\(e\) => \{\s*setActiveDefaultGrade\(e\.target\.value\);\s*\}\}\s*className=\"w-full bg-white border border-gray-300 rounded-sm px-3 py-1\.5 text-sm font-semibold text-gray-900 focus:outline-none focus:border-\[\#b81d24\]\"\s*>)"
new_select = r"""\1
                        <option value="">-- Pilih Grade --</option>"""
content = re.sub(select_pattern, new_select, content)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)
print("Patched modal")

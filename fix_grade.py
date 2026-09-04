import re
with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# 1. Ensure selectedGrade is initialized to ''
content = re.sub(r"const \[selectedGrade, setSelectedGrade\] = useState\([^)]*\);", "const [selectedGrade, setSelectedGrade] = useState('');", content)

# 2. Prevent auto-selecting grade
content = re.sub(r"// Set default grade and price\s*useEffect\(\(\) => \{\s*if \(hargaList\.length > 0 && !selectedGrade\) \{\s*const firstActive = hargaList\.find\(\(h\) => h\.status === 'aktif'\) \|\| hargaList\[0\];\s*setSelectedGrade\(firstActive\.kode_grade\);\s*setHargaSatuan\(firstActive\.harga_per_kg\);\s*\}\s*\}, \[hargaList, selectedGrade\]\);", "", content)

# 3. Validation in handleAddBalItem
handle_add_pattern = r"(const handleAddBalItem = \(\) => \{[\s\S]*?const cleanedBalCode = balCode\.replace\(/-/g, ''\)\.toUpperCase\(\);)"
new_handle_add = r"""\1
    if (!selectedGrade) {
      setScanFeedback({ text: 'Gagal: Anda harus memilih Grade / Mutu Barang terlebih dahulu!', isError: true });
      return;
    }"""
content = re.sub(handle_add_pattern, new_handle_add, content, count=1)

# 4. Add `<option value="">-- Pilih Grade --</option>`
select_pattern = r"(<select\s*value=\{selectedGrade\}\s*onChange=\{\(e\) => handleGradeChange\(e\.target\.value\)\}\s*className=\"w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800\"\s*>)"
new_select = r"""\1
                  <option value="">-- Pilih Grade --</option>"""
content = re.sub(select_pattern, new_select, content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

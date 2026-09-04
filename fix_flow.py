import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# 1. Add gradeSelectRef
if "const gradeSelectRef =" not in content:
    content = content.replace(
        "const barcodeInputRef = useRef<HTMLInputElement>(null);",
        "const barcodeInputRef = useRef<HTMLInputElement>(null);\n  const gradeSelectRef = useRef<HTMLSelectElement>(null);"
    )

# 2. Modify handleAddBalItem to focus grade
handle_add = r"(const handleAddBalItem = \(\) => \{[\s\S]*?if \(!selectedGrade\) \{)(\s*setScanFeedback\(\{ text: 'Gagal: Anda harus memilih Grade / Mutu Barang terlebih dahulu!', isError: true \}\);\s*return;\s*\})"
replacement_add = r"\1\n      gradeSelectRef.current?.focus();\n      setScanFeedback({ text: 'Silakan pilih Grade / Mutu Barang terlebih dahulu.', isError: false });\n      return;\n    }"
content = re.sub(handle_add, replacement_add, content, count=1)

# 3. Add ref and onKeyDown to the Grade select
select_pattern = r"(<select\s*value=\{selectedGrade\}\s*onChange=\{\(e\) => handleGradeChange\(e\.target\.value\)\}\s*className=\"w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800\"\s*>)"
replacement_select = r"""<select
                  ref={gradeSelectRef}
                  value={selectedGrade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Only save if a grade is actually selected
                      if (selectedGrade) {
                        handleAddBalItem();
                      }
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                >"""
content = re.sub(select_pattern, replacement_select, content, count=1)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

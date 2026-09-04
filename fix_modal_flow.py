import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

# 1. Add gradeSelectRef
if "const gradeSelectRef =" not in content:
    content = content.replace(
        "const scannerInputRef = useRef<HTMLInputElement>(null);",
        "const scannerInputRef = useRef<HTMLInputElement>(null);\n  const gradeSelectRef = useRef<HTMLSelectElement>(null);"
    )

# 2. Modify handleScannerSubmit to focus grade
handle_scanner = r"(const handleScannerSubmit = \(e\?: React\.FormEvent\) => \{[\s\S]*?if \(!activeDefaultGrade\) \{)(\s*setScannerFeedback\(\{[\s\S]*?\}\);\s*return;\s*\})"
replacement_scanner = r"\1\n      gradeSelectRef.current?.focus();\n      setScannerFeedback({ text: 'Pilih Mutu/Grade terlebih dahulu!', isError: true });\n      return;\n    }"
content = re.sub(handle_scanner, replacement_scanner, content, count=1)

# 3. Add ref and onKeyDown to the Grade select
select_pattern = r"(<select\s*value=\{activeDefaultGrade\}\s*onChange=\{\(e\) => \{\s*setActiveDefaultGrade\(e\.target\.value\);\s*\}\}\s*className=\"w-full bg-white border border-gray-300 rounded-sm px-3 py-1\.5 text-sm font-semibold text-gray-900 focus:outline-none focus:border-\[\#b81d24\]\"\s*>)"
replacement_select = r"""<select
                        ref={gradeSelectRef}
                        value={activeDefaultGrade}
                        onChange={(e) => {
                          setActiveDefaultGrade(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (activeDefaultGrade) {
                              if (scannerInputValue.trim()) {
                                handleScannerSubmit();
                              } else {
                                handleAddManualRow();
                              }
                            }
                          }
                        }}
                        className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#b81d24]"
                      >"""
content = re.sub(select_pattern, replacement_select, content, count=1)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)

import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

# Add ref and onKeyDown to the Grade select
select_pattern = r"(<select\s*value=\{activeDefaultGrade\}\s*onChange=\{\(e\) => setActiveDefaultGrade\(e\.target\.value\)\}\s*className=\"bg-gray-50 border border-gray-300 rounded-sm px-2 py-1 font-bold text-gray-900 text-xs focus:outline-none focus:border-\[\#b81d24\]\"\s*>)"
replacement_select = r"""<select
                    ref={gradeSelectRef}
                    value={activeDefaultGrade}
                    onChange={(e) => setActiveDefaultGrade(e.target.value)}
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
                    className="bg-gray-50 border border-gray-300 rounded-sm px-2 py-1 font-bold text-gray-900 text-xs focus:outline-none focus:border-[#b81d24]"
                  >"""
content = re.sub(select_pattern, replacement_select, content, count=1)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)

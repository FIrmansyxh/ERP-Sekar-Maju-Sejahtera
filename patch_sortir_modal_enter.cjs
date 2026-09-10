const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');

const regex = /<SearchableSelect\s+value=\{activeDefaultGrade\}\s+onChange=\{\(val\) => \{\s+setActiveDefaultGrade\(val\);\s+\/\/.*?\s+\/\/.*?\s+\}\}\s+allowCustom=\{true\}\s+options=\{activeGrades\.map\(g => \(\{ value: g\.kode_grade, label: `Grade \$\{g\.kode_grade\} \(\$\{formatRupiah\(g\.harga_per_kg\)\}\/kg\)` \}\)\)\}\s+placeholder="Contoh: A0001\.\.\."\s+\/>/s;

code = code.replace(regex, `<SearchableSelect
                    value={activeDefaultGrade}
                    onChange={(val) => {
                       setActiveDefaultGrade(val);
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
                    allowCustom={true}
                    options={activeGrades.map(g => ({ value: g.kode_grade, label: \`Grade \${g.kode_grade} (\${formatRupiah(g.harga_per_kg)}/kg)\` }))}
                    placeholder="Contoh: A0001..."
                  />`);

fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', code);
console.log('Patched Proses1SortirModal onKeyDown');

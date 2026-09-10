const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

const gradeSelect = /<SearchableSelect\s+value=\{selectedGrade\}\s+onChange=\{\(val\) => handleGradeChange\(val\)\}\s+allowCustom=\{true\}\s+options=\{hargaList\.map\(h => \(\{ value: h\.kode_grade, label: `Grade \$\{h\.kode_grade\} — \$\{formatRupiah\(h\.harga_per_kg\)\}\/kg` \}\)\)\}\s+placeholder="Ketik Grade \(Contoh: A0001\)\.\.\."\s+className="w-full"\s+\/>/s;

code = code.replace(gradeSelect, `<SearchableSelect
                  value={selectedGrade}
                  onChange={(val) => handleGradeChange(val)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedGrade) {
                        handleAddBalItem();
                      }
                    }
                  }}
                  allowCustom={true}
                  options={hargaList.map(h => ({ value: h.kode_grade, label: \`Grade \${h.kode_grade} — \${formatRupiah(h.harga_per_kg)}/kg\` }))}
                  placeholder="Ketik Grade (Contoh: A0001)..."
                  className="w-full"
                />`);

fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);
console.log('Patched SortirPageView onKeyDown');

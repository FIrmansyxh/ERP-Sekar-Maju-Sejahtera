const fs = require('fs');
let code = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');

// 1. Add id and onKeyDown to barcode input in table
code = code.replace(
  /<input\s+type="text"\s+autoComplete="off"\s+value=\{item\.barcode\}/,
  `<input
                                      id={\`nobal-\${item.id}\`}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          document.getElementById(\`grade-\${item.id}\`)?.focus();
                                        }
                                      }}
                                      type="text"
                                      autoComplete="off"
                                      value={item.barcode}`
);

// 2. Add inputId and onKeyDown to SearchableSelect in table
code = code.replace(
  /<SearchableSelect\s+value=\{item\.kodeGrade\}\s+onChange=\{\(v\) => handleUpdateItem\(item\.id, 'kodeGrade', v\)\}\s+options=\{activeGrades\.map\(g => \(\{ value: g\.kode_grade, label: \`Grade \$\{g\.kode_grade\} \(\$\{formatRupiah\(g\.harga_per_kg\)\}\/kg\)\` \}\)\)\}\s+placeholder="Grade\.\.\."\s+\/>/,
  `<SearchableSelect
                                inputId={\`grade-\${item.id}\`}
                                value={item.kodeGrade}
                                onChange={(v) => handleUpdateItem(item.id, 'kodeGrade', v)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.getElementById(\`harga-\${item.id}\`)?.focus();
                                  }
                                }}
                                options={activeGrades.map(g => ({ value: g.kode_grade, label: \`Grade \${g.kode_grade} (\${formatRupiah(g.harga_per_kg)}/kg)\` }))}
                                placeholder="Grade..."
                              />`
);

// 3. Add id and onKeyDown to harga input in table
code = code.replace(
  /<input\s+type="number"\s+value=\{item\.hargaPerKg\}\s+onChange=\{\(e\) => handleUpdateItem\(item\.id, 'hargaPerKg', Number\(e\.target\.value\) \|\| 0\)\}/,
  `<input
                                id={\`harga-\${item.id}\`}
                                type="number"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    // optional: focus new row or add row
                                    handleAddManualRow();
                                  }
                                }}
                                value={item.hargaPerKg}
                                onChange={(e) => handleUpdateItem(item.id, 'hargaPerKg', Number(e.target.value) || 0)}`
);

fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', code);
console.log('Patched Proses1SortirModal table focus flow');

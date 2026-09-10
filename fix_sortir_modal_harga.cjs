const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');

// The user wants: "KETIKA SUDAH PILIH GRADE KUNCI HARGA SATUAN AGAR TIDAK BISA EDIT DAN LANGSUNG MASUKAN DATANYA KE TABEL"
// In Proses1SortirModal, "memasukkan data ke tabel" means adding a new blank row for the next scan.
// So when Grade is selected in the row, we should lock the Harga field and trigger Add Manual Row.

code = code.replace(
/onChange=\{\(v\) => handleUpdateItem\(item\.id, 'kodeGrade', v\)\}/,
`onChange={(v) => {
                                  handleUpdateItem(item.id, 'kodeGrade', v);
                                  setTimeout(() => {
                                    handleAddManualRow();
                                  }, 50);
                                }}`
);

// We need to disable the harga input and style it properly in Proses1SortirModal
code = code.replace(
/id=\{\`harga-\$\{item\.id\}\`\}\n\s*type="number"\n\s*onKeyDown=\{\(e\) => \{\n\s*if \(e\.key === 'Enter'\) \{\n\s*e\.preventDefault\(\);\n\s*\/\/ optional: focus new row or add row\n\s*handleAddManualRow\(\);\n\s*\}\n\s*\}\}\n\s*value=\{item\.hargaPerKg\}\n\s*onChange=\{\(e\) => handleUpdateItem\(item\.id, 'hargaPerKg', Number\(e\.target\.value\) \|\| 0\)\}\n\s*className="w-28 bg-white border border-gray-300 rounded-sm px-2 py-1 text-right font-mono font-bold text-gray-900 text-xs focus:outline-none focus:border-\[#b81d24\]"/,
`id={\`harga-\${item.id}\`}
                                type="number"
                                disabled
                                value={item.hargaPerKg}
                                onChange={(e) => handleUpdateItem(item.id, 'hargaPerKg', Number(e.target.value) || 0)}
                                className="w-28 bg-gray-100 border border-gray-300 rounded-sm px-2 py-1 text-right font-mono font-bold text-gray-500 text-xs focus:outline-none cursor-not-allowed"`
);

// Remove the autofocus to harga input since it's disabled now
code = code.replace(
/if \(e\.key === 'Enter'\) \{\n\s*e\.preventDefault\(\);\n\s*document\.getElementById\(\`harga-\$\{item\.id\}\`\)\?\.focus\(\);\n\s*\}/,
`if (e.key === 'Enter') {
                                    e.preventDefault();
                                    // Triggered via onChange
                                  }`
);

fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', code);

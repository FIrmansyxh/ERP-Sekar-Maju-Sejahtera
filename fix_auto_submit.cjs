const fs = require('fs');

// 1. SortirPageView.tsx
let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

// Replace "Grade / Mutu Barang" with "Mutu Barang"
code = code.replace(/Grade \/ Mutu Barang/g, 'Mutu Barang');

// Remove setTimeout auto-submit from handleGradeChange
code = code.replace(
/      \/\/ Wait for state to update, then auto-add item if NoBal is filled\n\s*setTimeout\(\(\) => \{\n\s*const addBtn = document\.getElementById\('btn-tambah-bal'\);\n\s*if \(addBtn\) addBtn\.click\(\);\n\s*\}, 50\);/m,
`      // Auto submit removed as per user request`
);

// Add clearing selectedGrade and hargaSatuan to handleAddBalItem
code = code.replace(
/    \/\/ Clear and prepare for next scan\n\s*setInputNoBal\(''\);/,
`    // Clear and prepare for next scan
    setInputNoBal('');
    setSelectedGrade('');
    setHargaSatuan(0);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);`
);

// Update SearchableSelect onKeyDown
code = code.replace(
/if \(selectedGrade\) \{\n\s*\/\/ Automatically submitted via handleGradeChange\n\s*\}/m,
`if (selectedGrade) {
                        handleAddBalItem();
                      }`
);

fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);

// 2. Proses1SortirModal.tsx
let modalCode = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');

// Fix onChange for Grade Select
modalCode = modalCode.replace(
/onChange=\{\(v\) => \{\n\s*handleUpdateItem\(item\.id, 'kodeGrade', v\);\n\s*setTimeout\(\(\) => \{\n\s*handleAddManualRow\(\);\n\s*\}, 50\);\n\s*\}\}/m,
`onChange={(v) => {
                                  handleUpdateItem(item.id, 'kodeGrade', v);
                                }}`
);

// Put enter back for onKeyDown
modalCode = modalCode.replace(
/if \(e\.key === 'Enter'\) \{\n\s*e\.preventDefault\(\);\n\s*\/\/ Triggered via onChange\n\s*\}/m,
`if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManualRow();
                                  }`
);

fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', modalCode);


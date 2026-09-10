const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

// 1. Add inputId to SearchableSelect
code = code.replace(/<SearchableSelect\s+value=\{selectedGrade\}/g, "<SearchableSelect\n                  inputId=\"grade-input\"\n                  value={selectedGrade}");

// 2. Change No Bal input onKeyDown
code = code.replace(
  /onKeyDown=\{\(e\) => \{\s+if \(e\.key === 'Enter'\) \{\s+e\.preventDefault\(\);\s+handleKeyDownAdder\(e\);\s+\}\s+\}\}/,
  `onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('grade-input')?.focus();
                      }
                    }}`
);

// 3. Change Grade onKeyDown to focus harga or submit
code = code.replace(
  /onKeyDown=\{\(e\) => \{\s+if \(e\.key === 'Enter'\) \{\s+e\.preventDefault\(\);\s+if \(selectedGrade\) \{\s+handleAddBalItem\(\);\s+\}\s+\}\s+\}\}/,
  `onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedGrade) {
                        document.getElementById('harga-input')?.focus();
                      }
                    }
                  }}`
);

// 4. Change Harga Satuan input to have id="harga-input" and its own submit
code = code.replace(
  /<input\s+type="number"\s+value=\{hargaSatuan \|\| ''\}\s+onChange=\{\(e\) => setHargaSatuan\(parseFloat\(e\.target\.value\) \|\| 0\)\}\s+onKeyDown=\{handleKeyDownAdder\}/,
  `<input
                  id="harga-input"
                  type="number"
                  value={hargaSatuan || ''}
                  onChange={(e) => setHargaSatuan(parseFloat(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBalItem();
                    }
                  }}`
);

// 5. Check if handleAddBalItem has focus fix
code = code.replace(/gradeSelectRef\.current\?\.focus\(\);/g, "document.getElementById('grade-input')?.focus();");

fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);
console.log('Patched SortirPageView focus flow');

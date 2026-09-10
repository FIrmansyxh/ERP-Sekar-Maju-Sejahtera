const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

// We need to modify handleGradeChange so that when a valid grade is selected, it immediately adds the row.
// Also we need to make Harga Satuan disabled.

code = code.replace(
/  const handleGradeChange = \(gradeCode: string\) => \{[\s\S]*?  \};\n/m,
`  const handleGradeChange = (gradeCode: string) => {
    setSelectedGrade(gradeCode);
    const found = hargaList.find((h) => h.kode_grade === gradeCode);
    if (found) {
      setHargaSatuan(found.harga_per_kg);
      // Wait for state to update, then auto-add item if NoBal is filled
      setTimeout(() => {
        const addBtn = document.getElementById('btn-tambah-bal');
        if (addBtn) addBtn.click();
      }, 50);
    } else {
      setHargaSatuan(0);
    }
  };
`);

// Add id to Add Button
code = code.replace(
/onClick=\{handleAddBalItem\}/,
`id="btn-tambah-bal"\n                  onClick={handleAddBalItem}`
);

// Lock Harga Satuan
code = code.replace(
/id="harga-input"\n                  type="number"\n                  value=\{hargaSatuan \|\| ''\}\n                  onChange=\{\(e\) => setHargaSatuan\(parseFloat\(e\.target\.value\) \|\| 0\)\}\n                  onKeyDown=\{\(e\) => \{\n                    if \(e\.key === 'Enter'\) \{\n                      e\.preventDefault\(\);\n                      handleAddBalItem\(\);\n                    \}\n                  \}\}/,
`id="harga-input"
                  type="number"
                  value={hargaSatuan || ''}
                  disabled
                  onChange={(e) => setHargaSatuan(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed focus:outline-none"`
);

// We need to remove the previous classname for harga-input to avoid duplicate className attributes
code = code.replace(
/className="w-full bg-slate-50 border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed focus:outline-none"\s+className="w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"/,
`className="w-full bg-slate-50 border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed focus:outline-none"`
);


fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);

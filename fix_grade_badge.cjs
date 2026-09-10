const fs = require('fs');

let code = fs.readFileSync('src/components/barang/MasterBarangManagement.tsx', 'utf8');
code = code.replace(/const gradeBadge = GRADE_COLOR_MAP\[item\.kode_grade\] \|\|/g, "const gradeBadge: any = GRADE_COLOR_MAP[item.kode_grade] ||");
fs.writeFileSync('src/components/barang/MasterBarangManagement.tsx', code);

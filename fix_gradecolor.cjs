const fs = require('fs');

function fixGradeColorMap(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/const gradeColor = GRADE_COLOR_MAP\[/g, 'const gradeColor: any = GRADE_COLOR_MAP[');
  code = code.replace(/const gradeColor = GRADE_COLOR_MAP\[item\.kode_grade\]/g, 'const gradeColor: any = GRADE_COLOR_MAP[item.kode_grade]');
  fs.writeFileSync(file, code);
}

fixGradeColorMap('src/components/barang/BarangTable.tsx');
fixGradeColorMap('src/components/barang/MasterBarangManagement.tsx');

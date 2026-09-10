const fs = require('fs');

function fixGradeColors(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/\(GRADE_COLORS\[([a-zA-Z0-9_\.]+)\] as any\)\?\.badge/g, "(typeof GRADE_COLORS[$1] === 'object' ? (GRADE_COLORS[$1] as any).badge : undefined)");
  code = code.replace(/\(GRADE_COLORS\[([a-zA-Z0-9_\.]+)\] as any\)\?\.bg/g, "(typeof GRADE_COLORS[$1] === 'object' ? (GRADE_COLORS[$1] as any).bg : undefined)");
  code = code.replace(/\(GRADE_COLORS\[([a-zA-Z0-9_\.]+)\] as any\)\?\.text/g, "(typeof GRADE_COLORS[$1] === 'object' ? (GRADE_COLORS[$1] as any).text : undefined)");
  code = code.replace(/\(GRADE_COLORS\[([a-zA-Z0-9_\.]+)\] as any\)\?\.border/g, "(typeof GRADE_COLORS[$1] === 'object' ? (GRADE_COLORS[$1] as any).border : undefined)");
  fs.writeFileSync(file, code);
}

fixGradeColors('src/components/barang/BarangTable.tsx');
fixGradeColors('src/components/barang/MasterBarangManagement.tsx');

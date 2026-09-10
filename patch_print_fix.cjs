const fs = require('fs');
let file = 'src/components/pengiriman/SuratJalanPrintModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix 1: Remove price fallback
code = code.replace(
  /\/\/ Priority 2: Transaction \/ Purchase price from inventory[\s\S]*?pricePerKg = getDefaultPriceByGrade\(grade\);\s*\}/,
  "// If no deal price is provided for DO, default to 0 to prevent leaking buy price\n    if (!pricePerKg || pricePerKg <= 0) {\n      pricePerKg = 0;\n    }"
);

// Fix 2: Change the grade displayed in the DO PDF to the Harga Jual Code instead of Purchase Grade
// Target:
// const kodeHarga = pengiriman.kode_harga_jual_map?.[id];
// const keteranganStr = kodeHarga
//   ? \`Kode: \${kodeHarga} • Grade \${grade}\`
//   : \`Tembakau Madura Grade \${grade}\`;

// Replacement:
// const kodeHarga = pengiriman.kode_harga_jual_map?.[id];
// const displayGrade = kodeHarga || grade;
// const keteranganStr = \`Tembakau Madura Grade \${displayGrade}\`;

code = code.replace(
  /const kodeHarga = pengiriman\.kode_harga_jual_map\?\.\[id\];\s*const keteranganStr = kodeHarga\s*\?\s*`Kode: \$\{kodeHarga\} • Grade \$\{grade\}`\s*:\s*`Tembakau Madura Grade \$\{grade\}`;/g,
  "const kodeHarga = pengiriman.kode_harga_jual_map?.[id];\n    const displayGrade = kodeHarga || grade;\n    const keteranganStr = `Tembakau Madura Grade ${displayGrade}`;"
);

code = code.replace(
  /kode_grade: grade,/g,
  "kode_grade: typeof displayGrade !== 'undefined' ? displayGrade : grade,"
);

fs.writeFileSync(file, code);
console.log('Patched SuratJalanPrintModal.tsx!');

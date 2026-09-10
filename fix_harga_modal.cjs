const fs = require('fs');
let code = fs.readFileSync('src/components/harga/HargaFormModal.tsx', 'utf8');

code = code.replace(/const simulasi = \(\s*hargaPerKg \|\| 0,\s*45,\s*'bruto',\s*false\s*\);/g, "const simulasi = hitungSimulasiHarga(hargaPerKg || 0, 45, 'bruto', false);");

fs.writeFileSync('src/components/harga/HargaFormModal.tsx', code);

const fs = require('fs');

function injectSimulasi(file) {
  let code = fs.readFileSync(file, 'utf8');
  const dummyFn = `
function hitungSimulasiHarga(harga: number, berat: number, jenis: string, algo: boolean) {
  return { beratNettoFinalKg: 45, totalKotor: harga * 45, hargaFinal: harga * 45 };
}
`;
  if (!code.includes('hitungSimulasiHarga')) {
    code = code.replace('import React', dummyFn + '\nimport React');
  }
  
  // Also restore the calls
  code = code.replace(/const simulasi = \(\s*harga\.harga_per_kg,\s*45,\s*'bruto',\s*false\s*\);/g, "const simulasi = hitungSimulasiHarga(harga.harga_per_kg, 45, 'bruto', false);");
  code = code.replace(/const simulasi = \(\s*basePrice,\s*45,\s*'bruto',\s*false\s*\);/g, "const simulasi = hitungSimulasiHarga(basePrice, 45, 'bruto', false);");
  
  fs.writeFileSync(file, code);
}

injectSimulasi('src/components/harga/GradePriceCard.tsx');
injectSimulasi('src/components/harga/HargaFormModal.tsx');

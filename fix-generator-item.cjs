const fs = require('fs');
let code = fs.readFileSync('src/data/maduraDatasetGenerator.ts', 'utf8');

code = code.replace(
  /berat_kg: netto,\s*harga_per_kg: Math\.round\(sumHargaPerKg \/ numBals\),/g,
  `berat_kg: netto,\n        harga_per_kg: hargaBeli.harga_per_kg,`
);

fs.writeFileSync('src/data/maduraDatasetGenerator.ts', code);

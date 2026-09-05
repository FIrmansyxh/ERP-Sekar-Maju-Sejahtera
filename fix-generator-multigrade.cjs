const fs = require('fs');
let code = fs.readFileSync('src/data/maduraDatasetGenerator.ts', 'utf8');

// We want to move `const hargaBeli = ...` inside the `for (let j = 0; j < numBals; j++)` loop.
// So we will first comment it out outside the loop, then insert it inside.

code = code.replace(
  /const hargaBeli = hargaBeliList\[Math\.floor\(pseudoRandom\(\) \* hargaBeliList\.length\)\];\s*for \(let j = 0; j < numBals; j\+\+\) \{/g,
  `const gradesInTrx = new Set<string>();\n    let sumHargaPerKg = 0;\n    for (let j = 0; j < numBals; j++) {\n      const hargaBeli = hargaBeliList[Math.floor(pseudoRandom() * hargaBeliList.length)];\n      gradesInTrx.add(hargaBeli.kode_grade);\n      sumHargaPerKg += hargaBeli.harga_per_kg;`
);

code = code.replace(
  /no_bal: \`\$\{trxItems\[0\].no_bal\} - \$\{trxItems\[trxItems\.length-1\].no_bal\}\`,\s*kode_grade: hargaBeli\.kode_grade,/g,
  `no_bal: \`\$\{trxItems[0].no_bal\} - \$\{trxItems[trxItems.length-1].no_bal\}\`,\n      kode_grade: Array.from(gradesInTrx).join(', '),`
);

code = code.replace(
  /harga_per_kg: hargaBeli\.harga_per_kg,/g,
  `harga_per_kg: Math.round(sumHargaPerKg / numBals),`
);

fs.writeFileSync('src/data/maduraDatasetGenerator.ts', code);

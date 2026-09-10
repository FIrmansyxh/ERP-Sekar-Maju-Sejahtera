const fs = require('fs');

let file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /for\s*\(let\s*j\s*=\s*0;\s*j\s*<\s*numBals;\s*j\+\+\)\s*\{\s*const\s*hargaBeli[\s\S]*?const\s*noBal\s*=\s*`\$\{codeType\}\$\{String\(codeNum\)\.padStart\(4, '0'\)\}`;/g;

const replacement = `const codeType = KODE_BALS[i % KODE_BALS.length];
    for (let j = 0; j < numBals; j++) {
      const hargaBeli = hargaBeliList[Math.floor(pseudoRandom() * hargaBeliList.length)];
      gradesInTrx.add(hargaBeli.kode_grade);
      sumHargaPerKg += hargaBeli.harga_per_kg;

      const codeNum = j + 1;
      const noBal = \`\${codeType}\${String(codeNum).padStart(4, '0')}\`;`;

code = code.replace(regex, replacement);

fs.writeFileSync(file, code);
console.log('Patched regex!');

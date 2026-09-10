const fs = require('fs');

let file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

// We need a global dictionary for code counters
const regex = /let currentBalGlobal = 1;/g;
const replacement = `let currentBalGlobal = 1;
  const codeCounters = { 'A': 0, 'B': 0, 'SB': 0, 'SP': 0, 'DP': 0 };`;

code = code.replace(regex, replacement);

const regex2 = /const codeType = KODE_BALS\[i % KODE_BALS\.length\];[\s\S]*?const noBal = `\$\{codeType\}\$\{String\(codeNum\)\.padStart\(4, '0'\)\}`;/g;

const replacement2 = `const codeType = KODE_BALS[i % KODE_BALS.length];
    const startCodeNum = codeCounters[codeType] + 1;
    for (let j = 0; j < numBals; j++) {
      const hargaBeli = hargaBeliList[Math.floor(pseudoRandom() * hargaBeliList.length)];
      gradesInTrx.add(hargaBeli.kode_grade);
      sumHargaPerKg += hargaBeli.harga_per_kg;

      codeCounters[codeType]++;
      const codeNum = codeCounters[codeType];
      const noBal = \`\${codeType}\${String(codeNum).padStart(4, '0')}\`;`;

code = code.replace(regex2, replacement2);

// Fix the summary string in no_bal of transaction
const regex3 = /no_bal: `\$\{codeType\}0001 - \$\{codeType\}\$\{String\(numBals\)\.padStart\(4, '0'\)\}`,/g;
const replacement3 = "no_bal: `${codeType}${String(startCodeNum).padStart(4, '0')} - ${codeType}${String(codeCounters[codeType]).padStart(4, '0')}`,";
code = code.replace(regex3, replacement3);

fs.writeFileSync(file, code);
console.log('Patched dataset bale uniqueness!');

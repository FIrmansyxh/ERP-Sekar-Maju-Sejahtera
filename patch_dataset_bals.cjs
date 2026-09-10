const fs = require('fs');

let file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace the bal generation logic
const oldBalGen = `    for (let j = 0; j < numBals; j++) {
      const hargaBeli = hargaBeliList[Math.floor(pseudoRandom() * hargaBeliList.length)];
      gradesInTrx.add(hargaBeli.kode_grade);
      sumHargaPerKg += hargaBeli.harga_per_kg;

      const codeType = KODE_BALS[(currentBalGlobal - 1) % 3];
      const codeNum = Math.floor((currentBalGlobal - 1) / 3) + 1;
      const noBal = \`\${codeType}\${String(codeNum).padStart(4, '0')}\`;`;

const newBalGen = `    const codeType = KODE_BALS[i % KODE_BALS.length];
    for (let j = 0; j < numBals; j++) {
      const hargaBeli = hargaBeliList[Math.floor(pseudoRandom() * hargaBeliList.length)];
      gradesInTrx.add(hargaBeli.kode_grade);
      sumHargaPerKg += hargaBeli.harga_per_kg;

      const codeNum = j + 1;
      const noBal = \`\${codeType}\${String(codeNum).padStart(4, '0')}\`;`;

code = code.replace(oldBalGen, newBalGen);

// Replace no_bal summary in transactions
code = code.replace(
  /no_bal: \`\$\{trxItems\[0\]\.no_bal\} - \$\{trxItems\[trxItems\.length-1\]\.no_bal\}\`,/g,
  "no_bal: `${codeType}0001 - ${codeType}${String(numBals).padStart(4, '0')}`,"
);

fs.writeFileSync(file, code);
console.log('Patched dataset bale logic!');

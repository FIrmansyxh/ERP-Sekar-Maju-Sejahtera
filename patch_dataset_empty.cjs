const fs = require('fs');
let file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const totalBatches = 195;/g, 'const totalBatches = 0;');

fs.writeFileSync(file, code);
console.log('Patched totalBatches to 0');

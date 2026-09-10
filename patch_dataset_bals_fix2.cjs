const fs = require('fs');

let file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /const codeCounters = \{ 'A': 0, 'B': 0, 'SB': 0, 'SP': 0, 'DP': 0 \};/g;
const replacement = `const codeCounters: Record<string, number> = { 'A': 0, 'B': 0, 'SB': 0, 'SP': 0, 'DP': 0, 'HS': 0, 'ST': 0 };`;

code = code.replace(regex, replacement);

fs.writeFileSync(file, code);
console.log('Patched dataset counters!');

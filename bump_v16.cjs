const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/_v15/g, '_v16');
fs.writeFileSync(file, code);
console.log('Bumped to v16');

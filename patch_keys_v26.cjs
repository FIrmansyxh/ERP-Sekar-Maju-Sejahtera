const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/_v25/g, '_v26');
code = code.replace(/_v24/g, '_v26');

fs.writeFileSync(file, code);
console.log('Patched all keys to v26');

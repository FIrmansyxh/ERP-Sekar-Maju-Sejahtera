const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/_v28/g, '_v29');

fs.writeFileSync(file, code);
console.log('Patched keys to v29');

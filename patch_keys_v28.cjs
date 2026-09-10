const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/_v27/g, '_v28');

fs.writeFileSync(file, code);
console.log('Patched keys to v28');

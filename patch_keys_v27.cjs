const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/_v26/g, '_v27');

fs.writeFileSync(file, code);
console.log('Patched all keys to v27 to clear cache and load new initial data');

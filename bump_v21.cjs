const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/_v20/g, '_v21');
fs.writeFileSync(file, code);
console.log('Bumped storage to v21');

const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/_v17/g, '_v18').replace(/_v16/g, '_v18');
fs.writeFileSync(file, code);
console.log('Bumped storage to v18');

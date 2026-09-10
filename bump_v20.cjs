const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/_v19/g, '_v20');
fs.writeFileSync(file, code);
console.log('Bumped storage to v20');

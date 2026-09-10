const fs = require('fs');

let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/_v14/g, '_v15');

fs.writeFileSync(file, code);
console.log('Bumped storage version to v15!');

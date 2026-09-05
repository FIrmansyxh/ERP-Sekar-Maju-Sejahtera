const fs = require('fs');
let code = fs.readFileSync('src/utils/storage.ts', 'utf8');
code = code.replace(/_v13/g, '_v14');
fs.writeFileSync('src/utils/storage.ts', code);

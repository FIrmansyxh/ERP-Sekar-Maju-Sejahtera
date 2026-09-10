const fs = require('fs');
let file = 'src/utils/rbac.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/'modul-log-aktivitas',?\n?\s*/g, '');

fs.writeFileSync(file, code);

const fs = require('fs');
let file = 'src/types/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/export interface LogAktivitas \{[\s\S]*?\}\n/g, '');

fs.writeFileSync(file, code);

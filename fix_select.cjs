const fs = require('fs');
let code = fs.readFileSync('src/components/common/SearchableSelect.tsx', 'utf8');

code = code.replace(/  inputId\?: string;\n  inputId\?: string;\n/g, '  inputId?: string;\n');
code = code.replace(/  inputId,\n  inputId,\n/g, '  inputId,\n');

fs.writeFileSync('src/components/common/SearchableSelect.tsx', code);

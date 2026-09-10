const fs = require('fs');
let code = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');

code = code.replace(/        if \(field === 'gantiTikar'\) \{\n          updated\.potonganTikar = value \? 75000 : 0;\n        \}\n/g, '');

fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', code);

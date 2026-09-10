const fs = require('fs');
let code = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');

code = code.replace(/potonganTikar: number; \/\/.*\n/g, '');
code = code.replace(/potonganTikar: 0,\n/g, '');

// Also fix the line 239 where it says `key === 'gantiTikar'`
// Let's find it.
code = code.replace(/if \(key === 'gantiTikar'\) \{[\s\S]*?\}\n/g, '');

fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', code);

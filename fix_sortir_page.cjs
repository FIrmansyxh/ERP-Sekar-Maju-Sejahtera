const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

code = code.replace(/const \[isGantiTikar, setIsGantiTikar\] = useState\(true\);\n/g, '');
code = code.replace(/ganti_tikar: isGantiTikar,\n/g, 'ganti_tikar: false,\n');
code = code.replace(/potongan_tikar_rp: isGantiTikar \? 75000 : 0,\n/g, 'potongan_tikar_rp: 0,\n');

// Also update mapping from temporary state
code = code.replace(/gantiTikar: boolean;\n/g, '');

fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);

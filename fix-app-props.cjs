const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/onNavigateToHarga=\{\(\) => handleSelectModule\('modul-3-harga'\)\}/g, "onNavigateToHarga={() => handleSelectModule('modul-3-harga')}\n                onNavigateToHargaJual={() => handleSelectModule('modul-3-harga-jual')}");

fs.writeFileSync(file, code);

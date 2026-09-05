const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/onNavigateToHarga\?: \(\) => void;/g, "onNavigateToHarga?: () => void;\n  onNavigateToHargaJual?: () => void;");
code = code.replace(/onNavigateToHarga,\n  onNavigateToBarang/g, "onNavigateToHarga,\n  onNavigateToHargaJual,\n  onNavigateToBarang");

fs.writeFileSync(file, code);

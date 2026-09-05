const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = "{overallSummaryJual.dominantKode ? `Kode ${overallSummaryJual.dominantKode.code} (${overallSummaryJual.dominantKode.persenStokKg.toFixed(1)}%)` : '-'}";
const newStr = "{overallSummaryJual.dominantKode ? `Kode ${overallSummaryJual.dominantKode.kode} (${overallSummaryJual.dominantKode.persenStokKg.toFixed(1)}%)` : '-'}";

code = code.replace(targetStr, newStr);

fs.writeFileSync(file, code);

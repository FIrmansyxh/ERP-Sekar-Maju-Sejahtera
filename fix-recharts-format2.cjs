const fs = require('fs');
const file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /formatter=\{\(value: number\) => \[\`\\\$\\{value\.toLocaleString\('id-ID'\)\\} Kg\`, 'Total Berat'\]\}/g,
  `formatter={(value: number) => [\`\${value.toLocaleString('id-ID')} Bal\`, 'Total Bal Pembelian']}`
);

fs.writeFileSync(file, code);

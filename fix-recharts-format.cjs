const fs = require('fs');
const file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /\`\\\$\\{value\.toLocaleString\('id-ID'\)\\} Kg\`, 'Total Berat'\]/g,
  `\`\${value.toLocaleString('id-ID')} Bal\`, 'Total Bal Pembelian']`
);

code = code.replace(
  /dataKey="totalKg"/g,
  `dataKey="totalBal"`
);

fs.writeFileSync(file, code);

const fs = require('fs');
const file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetLogic = `    pengirimanList.forEach((pengiriman) => {
      if (pengiriman.status === 'batal') return;`;

const newLogic = `    pengirimanList.forEach((pengiriman) => {
      if (pengiriman.status !== 'diterima' && pengiriman.status !== 'dikirim') return;`;

code = code.replace(targetLogic, newLogic);
fs.writeFileSync(file, code);
console.log('Patched profitStats to only count completed DOs');

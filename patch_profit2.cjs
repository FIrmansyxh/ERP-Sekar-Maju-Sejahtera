const fs = require('fs');
let file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldExtreme = `      // extreme fallback if all failed (e.g., missing items)
      if (!hasValidItemVal || DOValue === 0) {
        DOValue = (p.total_berat_kg || 0) * 125000;
      }`;
const newExtreme = `      // Do not use extreme fallback. If deal price is 0, DO value is 0.`;
code = code.replace(oldExtreme, newExtreme);

fs.writeFileSync(file, code);
console.log('Patched profit calculations 2!');

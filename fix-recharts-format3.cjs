const fs = require('fs');
const file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = "formatter={(value: number) => [`${value.toLocaleString('id-ID')} Kg`, 'Total Berat']}";
const replacementStr = "formatter={(value: number) => [`${value.toLocaleString('id-ID')} Bal`, 'Total Bal']}";

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(file, code);

const fs = require('fs');
const file = 'src/components/laporan/LaporanBalView.tsx';
let code = fs.readFileSync(file, 'utf8');

const importTarget = `import { Barang, Gudang, Petani, TransaksiPembelian, TabelHarga, UserRole } from '../../types';`;
const newImports = `import { Barang, Gudang, Petani, TransaksiPembelian, TabelHarga, UserRole } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';`;

if(code.includes(importTarget)) {
  code = code.replace(importTarget, newImports);
  fs.writeFileSync(file, code);
  console.log('Import patched');
} else {
  console.log('Target not found');
}

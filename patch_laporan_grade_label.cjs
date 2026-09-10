const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetLabel1 = `              Valuasi Aset Tembakau
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-800 rounded-sm">`;

const newLabel1 = `              Valuasi Aset (Stok di Gudang)
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-800 rounded-sm">`;

code = code.replace(targetLabel1, newLabel1);

const targetLabel2 = `<span className="text-[10px] text-gray-500 uppercase block">Total Valuasi Aset:</span>`;
const newLabel2 = `<span className="text-[10px] text-gray-500 uppercase block">Total Valuasi (Stok Gudang):</span>`;

code = code.replace(targetLabel2, newLabel2);

fs.writeFileSync(file, code);
console.log("Patched LaporanGradeView labels.");

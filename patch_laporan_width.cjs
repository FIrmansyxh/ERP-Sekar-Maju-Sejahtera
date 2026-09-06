const fs = require('fs');
const file = 'src/components/laporan/LaporanPetaniView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetModalContainer = '<div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-300 shadow-2xl flex flex-col">';
const newModalContainer = '<div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-300 shadow-2xl flex flex-col">';

code = code.replace(targetModalContainer, newModalContainer);

fs.writeFileSync(file, code);

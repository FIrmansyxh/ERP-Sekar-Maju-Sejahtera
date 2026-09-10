const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace "Grade" header with "Harga Beli (Rp/Kg)"
code = code.replace(
  /<th className="p-2\.5 text-center w-24 border-r border-gray-200">Grade<\/th>/,
  '<th className="p-2.5 text-right w-36 border-r border-gray-200">Harga Beli (Rp/Kg)</th>'
);

// Replace Grade cell with Harga Beli cell
const gradeCellPattern = /<td className="p-2\.5 text-center border-r border-gray-200">\s*<span className="font-bold text-xs text-gray-800 bg-gray-200 px-2 py-0\.5 rounded-sm">\s*\{item\.grade\}\s*<\/span>\s*<\/td>/;

const hargaBeliCell = `<td className="p-2.5 text-right font-mono border-r border-gray-200 text-gray-500">
                          {formatRupiah(barangList.find(b => b.barang_id === item.barangId)?.harga_beli || 0)}
                        </td>`;
code = code.replace(gradeCellPattern, hargaBeliCell);

fs.writeFileSync(file, code);
console.log('Patched SampleManagement.tsx');

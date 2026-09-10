const fs = require('fs');
let file = 'src/components/pengiriman/StatusBatchPengirimanManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

// Header
code = code.replace(
  /<th className="p-3 w-56">Kode Master Harga Jual<\/th>/,
  '<th className="p-3 w-56">Kode Master Harga Jual</th>\\n                    <th className="p-3 text-right w-36">Harga Beli (Rp/Kg)</th>'
);

// Body
const rowPattern = /<td className="p-3">\s*<select[\s\S]*?<\/select>\s*<\/td>/;
const rowReplacement = `$&
                          {/* Harga Beli */}
                          <td className="p-3 text-right font-mono text-gray-500">
                            {formatRupiah(barangList.find(b => b.barang_id === item.barang_id)?.harga_beli || 0)}
                          </td>`;
code = code.replace(rowPattern, rowReplacement);

// Tfoot if any? Let's check if there's a footer in this file that needs colspan adjustment
const footerPattern = /<td colSpan=\{4\} className="p-3 text-right uppercase text-\[11px\] text-gray-600 tracking-wide">/;
code = code.replace(footerPattern, '<td colSpan={4} className="p-3 text-right uppercase text-[11px] text-gray-600 tracking-wide">');
// Wait, the footer is:
// <td colSpan={5} ... or something? Let's see the tfoot in this file.
fs.writeFileSync(file, code);
console.log('Updated StatusBatchPengirimanManagement.tsx');

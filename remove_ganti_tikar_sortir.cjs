const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

// Remove Ganti Tikar Toggle from SortirPageView
code = code.replace(/\{\/\*\s*Ganti Tikar Toggle\s*\*\/\}[\s\S]*?\{\/\*\s*Button Tambah Bal\s*\*\/\}/, '{/* Button Tambah Bal */}');
// Also we need to fix grid col span for Harga Satuan if it existed
code = code.replace(/md:col-span-2">\s*<label className="block text-xs font-semibold text-slate-700 mb-1">\s*Harga Satuan/, 'md:col-span-3">\n                <label className="block text-xs font-semibold text-slate-700 mb-1">\n                  Harga Satuan');

// Change the button column span to fill up the grid (3+3+3+3 = 12, so Button Tambah Bal col-span-3)
code = code.replace(/md:col-span-2">\s*<button\s+type="button"\s+onClick=\{handleAddBalItem\}/, 'md:col-span-3">\n                <button\n                  type="button"\n                  onClick={handleAddBalItem}');

// Remove table column
code = code.replace(/<th className="py-2.5 px-3 text-center">Ganti Tikar<\/th>/, '');
code = code.replace(/<td className="py-2 px-3 text-center">[\s\S]*?<\/td>/, '');

fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);

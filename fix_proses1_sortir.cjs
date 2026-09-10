const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');

// Remove Ganti Tikar Toggle from modal header
code = code.replace(/<label className="flex items-center space-x-2 px-3 py-2 border rounded-sm cursor-pointer transition[\s\S]*?<\/label>/, '');

// Remove Ganti Tikar Checkbox header from table
code = code.replace(/<th className="py-2.5 px-3 w-32 border-b border-gray-300">[\s\S]*?Opsi Ganti Tikar[\s\S]*?<\/th>/, '');

// Remove Ganti Tikar checkbox cell
code = code.replace(/\{\/\*\s*Ganti Tikar Checkbox\s*\*\/\}[\s\S]*?<\/td>/, '');

fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', code);

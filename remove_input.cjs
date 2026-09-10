const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetBlock = `{/* Buyer Specification Request */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Permintaan / Catatan Buyer:</label>
              <input
                type="text"
                value={permintaanBuyer}
                onChange={(e) => setPermintaanBuyer(e.target.value)}
                placeholder="Catatan grade, range harga, dsb..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs"
              />
            </div>`;

code = code.replace(targetBlock, '');

// revert grid columns
code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 border border-gray-200 rounded-xs">/, '<div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 border border-gray-200 rounded-xs">');

fs.writeFileSync(file, code);
console.log('Removed Permintaan Buyer input');

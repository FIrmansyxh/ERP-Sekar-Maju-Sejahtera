const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/\{onNavigateToHargaJual && \([\s\S]*?\}\)\s*<\/button>/, 
`{onNavigateToHargaJual && (
    <button
      onClick={onNavigateToHargaJual}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Harga Jual</span>
    </button>
  )}`);

fs.writeFileSync(file, code);

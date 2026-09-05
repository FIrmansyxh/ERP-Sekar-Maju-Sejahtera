const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

// I will just add two </div> at the end of contentJual and contentBeli.
// Let's first check if adding </div> fixes it. 
// No, the error is at 541 (contentJual root div) and 1150 (contentBeli root div).
// The issue is inside the onNavigateToHarga block.

const buggyNavBlock = `{onNavigateToHargaJual && (
    <button
      onClick={onNavigateToHargaJual}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Harga Jual</span>
    </button>
  )}`;
const buggyNavBlockBeli = `{onNavigateToHarga && (
    <button
      onClick={onNavigateToHarga}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Harga & Grade</span>
    </button>
  )}`;

// I noticed the original block was:
/*
  {onNavigateToHarga && (
    <button ...>
    ...
    </button>
  )}
*/
// The problem was probably around `</div>` not being matched. Let's see what is around this block.

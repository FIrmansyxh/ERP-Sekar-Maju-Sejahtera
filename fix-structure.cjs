const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

// The original Laporan Harga Beli had this structure around line 830:
/*
          <div className="flex items-center space-x-2">
            {onNavigateToHarga && (
              <button
                ...
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Grade Pills *\/}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-gray-500 font-medium">Filter Tampilan Grade:</span>
          <button
            onClick={() => setSelectedGradeCode('ALL')}
            ...
          >
            Semua Grade ({gradeMetrics.length})
          </button>
          {gradeMetrics.map((m) => (
*/

// Let's replace the broken part in both contentJual and contentBeli

// For Jual:
code = code.replace(
`          <div className="flex items-center space-x-2">
            {onNavigateToHargaJual && (
    <button
      onClick={onNavigateToHargaJual}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Harga Jual</span>
    </button>
  )}
          {gradeMetrics.map((m) => (`,
`          <div className="flex items-center space-x-2">
            {onNavigateToHargaJual && (
    <button
      onClick={onNavigateToHargaJual}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Harga Jual</span>
    </button>
  )}
          </div>
        </div>

        {/* Quick Filter Kode Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-gray-500 font-medium">Filter Tampilan Kode:</span>
          <button
            onClick={() => setSelectedHargaJualCode('ALL')}
            className={\`px-2.5 py-1 border text-xs cursor-pointer transition rounded-sm \${
              selectedHargaJualCode === 'ALL'
                ? 'bg-gray-900 text-white font-bold border-gray-900 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }\`}
          >
            Semua Kode ({hargaJualMetrics.length})
          </button>
          {hargaJualMetrics.map((m) => (`
);

// For Beli:
code = code.replace(
`          <div className="flex items-center space-x-2">
            {onNavigateToHarga && (
    <button
      onClick={onNavigateToHarga}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Harga & Grade</span>
    </button>
  )}
          {gradeMetrics.map((m) => (`,
`          <div className="flex items-center space-x-2">
            {onNavigateToHarga && (
    <button
      onClick={onNavigateToHarga}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Harga & Grade</span>
    </button>
  )}
          </div>
        </div>

        {/* Quick Filter Grade Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-gray-500 font-medium">Filter Tampilan Grade:</span>
          <button
            onClick={() => setSelectedGradeCode('ALL')}
            className={\`px-2.5 py-1 border text-xs cursor-pointer transition rounded-sm \${
              selectedGradeCode === 'ALL'
                ? 'bg-gray-900 text-white font-bold border-gray-900 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }\`}
          >
            Semua Grade ({gradeMetrics.length})
          </button>
          {gradeMetrics.map((m) => (`
);

fs.writeFileSync(file, code);

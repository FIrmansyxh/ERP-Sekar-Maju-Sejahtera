const fs = require('fs');
const file = 'src/components/laporan/LaporanPembelianBarangView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Target the title block and the table wrapper
const target = `      {/* Data Table Card  */}
      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Tabel Rekapitulasi Pembelian Barang
            </span>
            <span className="text-xs text-gray-500">
              ({sortedData.length} baris data • {totals.totalBal} Bal • {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg Netto)
            </span>
          </div>
          
          <span className="text-[11px] text-gray-500 italic">
            * Potongan kuli Rp 7.000 / bal
          </span>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-gray-200 shadow-sm relative scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">`;

const replace = `      {/* Data Table Card  */}
      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh] border border-gray-200 shadow-sm relative scrollbar-thin">
          <div className="p-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Tabel Rekapitulasi Pembelian Barang
              </span>
              <span className="text-xs text-gray-500">
                ({sortedData.length} baris data • {totals.totalBal} Bal • {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg Netto)
              </span>
            </div>
            
            <span className="text-[11px] text-gray-500 italic">
              * Potongan kuli Rp 7.000 / bal
            </span>
          </div>
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">`;

code = code.replace(target, replace);
fs.writeFileSync(file, code);
console.log('patched sticky header layout');

const fs = require('fs');
const file = 'src/components/laporan/LaporanPembelianBarangView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace table wrapper and thead
const target = `<div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-gray-100/90 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">`;
const replace = `<div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-gray-200 shadow-sm relative scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">`;

code = code.replace(target, replace);
fs.writeFileSync(file, code);
console.log('patched header');

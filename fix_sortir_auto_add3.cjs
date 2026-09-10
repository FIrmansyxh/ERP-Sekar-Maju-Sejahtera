const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

// I also need to apply the same to Proses1SortirModal.tsx if the user meant that table too. 
// "KETIKA SUDAH PILIH GRADE KUNCI HARGA SATUAN AGAR TIDAK BISA EDIT DAN LANGSUNG MASUKAN DATANYA KE TABEL"
// In Proses1SortirModal, Harga is already a column and can be edited. I should lock it there too.

// First, fix Harga input class in SortirPageView.
code = code.replace(
/id="harga-input"\n                  type="number"\n                  value=\{hargaSatuan \|\| ''\}\n                  disabled\n                  onChange=\{\(e\) => setHargaSatuan\(parseFloat\(e\.target\.value\) \|\| 0\)\}\n                  className="w-full bg-slate-50 border border-slate-300 rounded-sm px-2\.5 py-2 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed focus:outline-none"\n                  className="w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"/,
`id="harga-input"
                  type="number"
                  value={hargaSatuan || ''}
                  disabled
                  onChange={(e) => setHargaSatuan(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed focus:outline-none"`
);

// If the regex didn't catch it because of multiple classNames, just remove the duplicate manually.
// Wait, in my previous attempt I did replace it, but maybe it didn't match.

fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);

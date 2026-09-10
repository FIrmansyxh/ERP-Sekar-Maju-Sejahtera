const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

// The class replacement failed earlier, so let's fix it safely now.
code = code.replace(
/className="w-full bg-slate-50 border border-slate-300 rounded-sm px-2\.5 py-2 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed focus:outline-none"[\s\S]*?className="w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"/,
`className="w-full bg-slate-50 border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed focus:outline-none"`
);

// We should also remove the onKeyDown for Grade field focusing harga-input, since now Harga is locked and we auto submit.
code = code.replace(
/document\.getElementById\('harga-input'\)\?\.focus\(\);/,
`// Automatically submitted via handleGradeChange`
);

fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);

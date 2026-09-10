const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

const gudangSelect = /<select\s+value=\{lokasiGudang\}\s+onChange=\{\(e\) => setLokasiGudang\(e\.target\.value\)\}\s+className="w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-1\.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"\s+>\s+\{gudangList && gudangList\.length > 0 \? \(\s+gudangList\.map\(\(g\) => \(\s+<option key=\{g\.gudang_id\} value=\{g\.nama_gudang\}>\s+\{g\.nama_gudang\}\s+<\/option>\s+\)\)\s+\) : \(\s+<option value="Gudang Pusat Induk - Pamekasan">Gudang Pusat Induk - Pamekasan<\/option>\s+\)\}\s+<\/select>/g;
code = code.replace(gudangSelect, `<SearchableSelect
                value={lokasiGudang}
                onChange={(val) => setLokasiGudang(val)}
                options={gudangList && gudangList.length > 0 ? gudangList.map(g => ({ value: g.nama_gudang, label: g.nama_gudang })) : [{ value: 'Gudang Pusat Induk - Pamekasan', label: 'Gudang Pusat Induk - Pamekasan' }]}
                placeholder="Pilih Gudang Intake..."
              />`);

fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);
console.log('Patched SortirPageView Gudang');

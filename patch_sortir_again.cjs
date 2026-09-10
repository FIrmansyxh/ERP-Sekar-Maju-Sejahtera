const fs = require('fs');
let file = 'src/components/transaksi/Proses1SortirModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Gudang Intake
const gudangSelect = /<select\s+value=\{lokasiGudang\}\s+onChange=\{\(e\) => setLokasiGudang\(e\.target\.value\)\}\s+className="w-full bg-white border border-gray-300 rounded-sm px-2\.5 py-1\.5 text-xs text-gray-900 focus:outline-none focus:border-\[#b81d24\]"\s+>\s+<option value="Gudang Pusat Induk - Pamekasan">Gudang Pusat Induk - Pamekasan<\/option>\s+<option value="Gudang Cabang Larangan - Pamekasan">Gudang Cabang Larangan - Pamekasan<\/option>\s+<option value="Gudang Penyangga Sumenep">Gudang Penyangga Sumenep<\/option>\s+<\/select>/g;
code = code.replace(gudangSelect, `<SearchableSelect
                  value={lokasiGudang}
                  onChange={(val) => setLokasiGudang(val)}
                  options={[
                    { value: 'Gudang Pusat Induk - Pamekasan', label: 'Gudang Pusat Induk - Pamekasan' },
                    { value: 'Gudang Cabang Larangan - Pamekasan', label: 'Gudang Cabang Larangan - Pamekasan' },
                    { value: 'Gudang Penyangga Sumenep', label: 'Gudang Penyangga Sumenep' }
                  ]}
                />`);

// Grade Default Select (it failed last time because of the "ref={gradeSelectRef}" and onKeyDown logic)
// Instead of replacing the entire thing, let's just find the select with ref={gradeSelectRef} and replace it.
// Note: SearchableSelect doesn't support ref natively unless we forwardRef. 
// Since SearchableSelect handles its own focus/clicks, we might need to forwardRef or just leave this specific one as `<select>` if we need the Enter key behavior!
// Let's modify SearchableSelect to support autoFocus and onKeyDown if needed, or leave it. The user said "secara default adalah ketik dulu". So it's fine if we lose the old Enter key listener if SearchableSelect provides typing.

fs.writeFileSync(file, code);
console.log('Patched Gudang Intake in SortirModal');

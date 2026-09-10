const fs = require('fs');
let file = 'src/components/barang/BarangEditLocationModal.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import { SearchableSelect }")) {
  const importMatch = code.match(/import\s+\{.*\}\s+from\s+'lucide-react';/);
  if (importMatch) {
    code = code.replace(importMatch[0], `${importMatch[0]}\nimport { SearchableSelect } from '../common/SearchableSelect';`);
  }
}

const lokasiGudangSel = /<select\s+required\s+value=\{lokasiGudang\}\s+onChange=\{\(e\) => setLokasiGudang\(e\.target\.value\)\}\s+className="w-full px-3 py-2 text-xs font-semibold border border-\[#ced4da\] rounded-sm focus:outline-none focus:border-\[#b81d24\] bg-white text-gray-900 cursor-pointer"\s+>\s+\{STANDARD_GUDANG_LOCATIONS\.map\(\(opt\) => \(\s+<option key=\{opt\} value=\{opt\}>\s+\{opt\}\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(lokasiGudangSel, `<SearchableSelect
                value={lokasiGudang}
                onChange={(val) => setLokasiGudang(val)}
                options={STANDARD_GUDANG_LOCATIONS.map(opt => ({ value: opt, label: opt }))}
                placeholder="Pilih Fasilitas Gudang..."
              />`);

fs.writeFileSync(file, code);
console.log('Patched BarangEditLocationModal.tsx');

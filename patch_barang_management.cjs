const fs = require('fs');
let file = 'src/components/barang/BarangManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import { SearchableSelect }")) {
  const importMatch = code.match(/import\s+\{.*\}\s+from\s+'lucide-react';/);
  if (importMatch) {
    code = code.replace(importMatch[0], `${importMatch[0]}\nimport { SearchableSelect } from '../common/SearchableSelect';`);
  }
}

// First, fix Grade Select
const gradeSel = /<select\s+value=\{selectedGrade\}\s+onChange=\{\(e\) => \{\s+setSelectedGrade\(e\.target\.value\);\s+setCurrentPage\(1\);\s+\}\}\s+className="w-full bg-white border border-gray-300 rounded-sm px-2\.5 py-1\.5 text-xs text-gray-800 focus:outline-none focus:border-\[#b81d24\]"\s+>\s+<option value="all">Semua Grade<\/option>\s+<option value="A">Grade A \(Super\)<\/option>\s+<option value="B">Grade B \(Standar\)<\/option>\s+<option value="C">Grade C \(Rendah\)<\/option>\s+<\/select>/g;
code = code.replace(gradeSel, `<SearchableSelect
                value={selectedGrade}
                onChange={(val) => {
                  setSelectedGrade(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'Semua Grade' },
                  ...Array.from(new Set(barangList.map(b => b.kode_grade))).filter(Boolean).sort().map(gr => ({ value: gr, label: \`Grade \${gr}\` }))
                ]}
              />`);
              
// Next, Lokasi Gudang
const gudangSel = /<select\s+value=\{selectedWarehouse\}\s+onChange=\{\(e\) => \{\s+setSelectedWarehouse\(e\.target\.value\);\s+setCurrentPage\(1\);\s+\}\}\s+className="w-full bg-white border border-gray-300 rounded-sm px-2\.5 py-1\.5 text-xs text-gray-800 focus:outline-none focus:border-\[#b81d24\]"\s+>\s+<option value="all">Semua Gudang<\/option>\s+<option value="Pamekasan">Gudang Utama Pamekasan<\/option>\s+<option value="Sampang">Gudang Sampang<\/option>\s+<option value="Sumenep">Gudang Sumenep<\/option>\s+<\/select>/g;
code = code.replace(gudangSel, `<SearchableSelect
                value={selectedWarehouse}
                onChange={(val) => {
                  setSelectedWarehouse(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'Semua Gudang' },
                  ...Array.from(new Set(barangList.map(b => b.lokasi_gudang))).filter(Boolean).sort().map(loc => ({ value: loc, label: loc }))
                ]}
              />`);

fs.writeFileSync(file, code);
console.log('Patched BarangManagement.tsx');

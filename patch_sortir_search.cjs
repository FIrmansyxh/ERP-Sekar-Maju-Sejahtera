const fs = require('fs');
let file = 'src/components/transaksi/Proses1SortirModal.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import { SearchableSelect }")) {
  code = code.replace(/import \{ X, Plus, Trash2, Printer, Search, Calculator \} from 'lucide-react';/, "import { X, Plus, Trash2, Printer, Search, Calculator } from 'lucide-react';\nimport { SearchableSelect } from '../common/SearchableSelect';");
}

// Replace Petani Dropdown
const petaniDropdown = /<select\s+value=\{selectedPetaniId\}\s+onChange=\{\(e\) => setSelectedPetaniId\(e\.target\.value\)\}\s+className="w-full bg-white border border-gray-300 rounded-sm px-2\.5 py-1\.5 text-xs text-gray-900 font-semibold focus:outline-none focus:border-\[#b81d24\]"\s+required\s+>\s+\{activeFarmers\.map\(\(p\) => \(\s+<option key=\{p\.petani_id\} value=\{p\.petani_id\}>\s+\{p\.nama_petani\} \(\{p\.petani_id\}\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(petaniDropdown, `<SearchableSelect
                  value={selectedPetaniId}
                  onChange={(v) => setSelectedPetaniId(v)}
                  options={activeFarmers.map(p => ({ value: p.petani_id, label: \`\${p.nama_petani} (\${p.petani_id})\` }))}
                  placeholder="Cari Petani..."
                />`);

// Replace Default Grade Dropdown
const defaultGradeSelect = /<select\s+ref=\{gradeSelectRef\}\s+value=\{activeDefaultGrade\}\s+onChange=\{\(e\) => setActiveDefaultGrade\(e\.target\.value\)\}\s+onKeyDown=\{\(e\) => \{\s+if \(e\.key === 'Enter'\) \{\s+e\.preventDefault\(\);\s+handleAddBal\(\);\s+\}\s+\}\}\s+className="bg-white border border-gray-300 rounded-sm px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:border-\[#b81d24\]"\s+>\s+\{activeGrades\.map\(\(g\) => \(\s+<option key=\{g\.kode_grade\} value=\{g\.kode_grade\}>\s+Grade \{g\.kode_grade\} \(\{formatRupiah\(g\.harga_per_kg\)\}\/kg\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;

code = code.replace(defaultGradeSelect, `<SearchableSelect
                    value={activeDefaultGrade}
                    onChange={(v) => setActiveDefaultGrade(v)}
                    options={activeGrades.map(g => ({ value: g.kode_grade, label: \`Grade \${g.kode_grade} (\${formatRupiah(g.harga_per_kg)}/kg)\` }))}
                    placeholder="Pilih Grade Default"
                    className="w-48"
                  />`);
                  
// Replace Grade Selection per row
const rowGradeSelect = /<select\s+value=\{item\.kodeGrade\}\s+onChange=\{\(e\) => handleUpdateItem\(item\.id, 'kodeGrade', e\.target\.value\)\}\s+className="w-full bg-white border border-gray-300 rounded-sm px-2 py-1 font-bold text-gray-800 text-xs focus:outline-none focus:border-\[#b81d24\]"\s+>\s+\{activeGrades\.map\(\(g\) => \(\s+<option key=\{g\.kode_grade\} value=\{g\.kode_grade\}>\s+Grade \{g\.kode_grade\} \(\{formatRupiah\(g\.harga_per_kg\)\}\/kg\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;

code = code.replace(rowGradeSelect, `<SearchableSelect
                                value={item.kodeGrade}
                                onChange={(v) => handleUpdateItem(item.id, 'kodeGrade', v)}
                                options={activeGrades.map(g => ({ value: g.kode_grade, label: \`Grade \${g.kode_grade} (\${formatRupiah(g.harga_per_kg)}/kg)\` }))}
                                placeholder="Grade..."
                              />`);

fs.writeFileSync(file, code);
console.log('Patched Proses1SortirModal.tsx');

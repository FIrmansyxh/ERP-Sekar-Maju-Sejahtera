const fs = require('fs');
let file = 'src/components/transaksi/TransaksiEditModal.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import { SearchableSelect }")) {
  code = code.replace(/import \{ X, Plus, Trash2, Search, Calculator \} from 'lucide-react';/, "import { X, Plus, Trash2, Search, Calculator } from 'lucide-react';\nimport { SearchableSelect } from '../common/SearchableSelect';");
}

const petaniDropdown = /<select\s+value=\{selectedPetaniId\}\s+onChange=\{\(e\) => setSelectedPetaniId\(e\.target\.value\)\}\s+className="w-full bg-white border border-gray-300 rounded-sm px-2\.5 py-1\.5 text-xs text-gray-900 font-semibold focus:outline-none focus:border-\[#b81d24\]"\s+required\s+>\s+\{activeFarmers\.map\(\(p\) => \(\s+<option key=\{p\.petani_id\} value=\{p\.petani_id\}>\s+\{p\.nama_petani\} \(\{p\.petani_id\}\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(petaniDropdown, `<SearchableSelect
                  value={selectedPetaniId}
                  onChange={(v) => setSelectedPetaniId(v)}
                  options={activeFarmers.map(p => ({ value: p.petani_id, label: \`\${p.nama_petani} (\${p.petani_id})\` }))}
                  placeholder="Cari Petani..."
                />`);

const rowGradeSelect = /<select\s+value=\{item\.kode_grade\}\s+onChange=\{\(e\) => handleUpdateItem\(item\.item_id, 'kode_grade', e\.target\.value\)\}\s+className="w-full bg-white border border-gray-300 rounded-sm px-2 py-1 font-bold text-gray-800 text-xs focus:outline-none focus:border-\[#b81d24\]"\s+>\s+\{activeGrades\.map\(\(g\) => \(\s+<option key=\{g\.kode_grade\} value=\{g\.kode_grade\}>\s+Grade \{g\.kode_grade\}\s+<\/option>\s+\)\)\}\s+<\/select>/g;

code = code.replace(rowGradeSelect, `<SearchableSelect
                                value={item.kode_grade}
                                onChange={(v) => handleUpdateItem(item.item_id, 'kode_grade', v)}
                                options={activeGrades.map(g => ({ value: g.kode_grade, label: \`Grade \${g.kode_grade}\` }))}
                                placeholder="Grade..."
                              />`);

fs.writeFileSync(file, code);
console.log('Patched TransaksiEditModal');

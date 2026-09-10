const fs = require('fs');
let file = 'src/components/transaksi/TransaksiFormModal.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import { SearchableSelect }")) {
  code = code.replace(/import \{ X, Plus, Trash2, Printer, Search \} from 'lucide-react';/, "import { X, Plus, Trash2, Printer, Search } from 'lucide-react';\nimport { SearchableSelect } from '../common/SearchableSelect';");
}

const petaniSelect = /<select\s+value=\{selectedPetaniId\}\s+onChange=\{\(e\) => setSelectedPetaniId\(e\.target\.value\)\}\s+className="flex-1 border border-\[#ced4da\] rounded-sm px-2\.5 py-1\.5 text-xs focus:outline-none focus:border-\[#b81d24\] bg-white font-bold text-gray-900"\s+>\s+\{activePetani\.map\(\(p\) => \(\s+<option key=\{p\.petani_id\} value=\{p\.petani_id\}>\s+\{p\.nama_petani\} \(\{p\.petani_id\}\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(petaniSelect, `<SearchableSelect
                    value={selectedPetaniId}
                    onChange={(v) => setSelectedPetaniId(v)}
                    options={activePetani.map(p => ({ value: p.petani_id, label: \`\${p.nama_petani} (\${p.petani_id})\` }))}
                    placeholder="Pilih Petani..."
                    className="flex-1"
                  />`);

const gradeSelect = /<select\s+value=\{item\.kodeGrade\}\s+onChange=\{\(e\) => handleItemChange\(item\.id, 'kodeGrade', e\.target\.value\)\}\s+className="w-full border border-gray-300 rounded-xs px-2 py-1 text-xs font-bold text-gray-900 focus:outline-none focus:border-\[#b81d24\] bg-white cursor-pointer"\s+>\s+\{activeGrades\.map\(\(h\) => \(\s+<option key=\{h\.kode_grade\} value=\{h\.kode_grade\}>\s+Grade \{h\.kode_grade\} \(\{formatRupiah\(h\.harga_per_kg\)\}\/kg\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(gradeSelect, `<SearchableSelect
                            value={item.kodeGrade}
                            onChange={(v) => handleItemChange(item.id, 'kodeGrade', v)}
                            options={activeGrades.map(h => ({ value: h.kode_grade, label: \`Grade \${h.kode_grade} (\${formatRupiah(h.harga_per_kg)}/kg)\` }))}
                            placeholder="Grade..."
                          />`);

fs.writeFileSync(file, code);
console.log('Patched TransaksiFormModal.tsx');

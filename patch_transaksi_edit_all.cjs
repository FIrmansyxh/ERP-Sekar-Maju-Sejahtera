const fs = require('fs');
let file = 'src/components/transaksi/TransaksiEditModal.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import { SearchableSelect }")) {
  const importMatch = code.match(/import\s+\{.*\}\s+from\s+'lucide-react';/);
  if (importMatch) {
    code = code.replace(importMatch[0], `${importMatch[0]}\nimport { SearchableSelect } from '../common/SearchableSelect';`);
  }
}

const petaniSel = /<select\s+value=\{selectedPetaniId\}\s+onChange=\{\(e\) => setSelectedPetaniId\(e\.target\.value\)\}\s+className="w-full text-xs px-2\.5 py-1\.5 bg-white border border-slate-300 rounded-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"\s+>\s+\{petaniList\.map\(\(p\) => \(\s+<option key=\{p\.petani_id\} value=\{p\.petani_id\}>\s+\{p\.nama_petani\} - \{p\.petani_id\} \(\{p\.desa_kecamatan \|\| p\.alamat \|\| 'Pamekasan'\}\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(petaniSel, `<SearchableSelect
                value={selectedPetaniId}
                onChange={(val) => setSelectedPetaniId(val)}
                options={petaniList.map(p => ({ value: p.petani_id, label: \`\${p.nama_petani} - \${p.petani_id} (\${p.desa_kecamatan || p.alamat || 'Pamekasan'})\` }))}
                placeholder="Pilih Petani..."
              />`);
              
const gudangSel = /<select\s+value=\{lokasiGudang\}\s+onChange=\{\(e\) => setLokasiGudang\(e\.target\.value\)\}\s+className="w-full text-xs px-2\.5 py-1\.5 bg-white border border-slate-300 rounded-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"\s+>\s+\{gudangOptions\.map\(\(opt\) => \(\s+<option key=\{opt\} value=\{opt\}>\s+\{opt\}\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(gudangSel, `<SearchableSelect
                value={lokasiGudang}
                onChange={(val) => setLokasiGudang(val)}
                options={gudangOptions.map(opt => ({ value: opt, label: opt }))}
                placeholder="Lokasi Gudang..."
              />`);

const gradeSel = /<select\s+value=\{row\.kode_grade\}\s+onChange=\{\(e\) => handleGradeChange\(idx, e\.target\.value\)\}\s+className="w-full text-xs font-semibold px-2 py-1 border border-slate-300 rounded-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"\s+>\s+\{activeGrades\.map\(\(g\) => \(\s+<option key=\{g\.harga_id\} value=\{g\.kode_grade\}>\s+Grade \{g\.kode_grade\} \(\{formatRupiah\(g\.harga_per_kg\)\}\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(gradeSel, `<SearchableSelect
                          value={row.kode_grade}
                          onChange={(val) => handleGradeChange(idx, val)}
                          options={activeGrades.map(g => ({ value: g.kode_grade, label: \`Grade \${g.kode_grade} (\${formatRupiah(g.harga_per_kg)})\` }))}
                          placeholder="Grade..."
                        />`);

fs.writeFileSync(file, code);
console.log('Patched TransaksiEditModal.tsx');

const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/SortirPageView.tsx', 'utf8');

if (!code.includes("SearchableSelect")) {
  const importMatch = code.match(/import\s+\{.*\}\s+from\s+'lucide-react';/);
  if (importMatch) {
    code = code.replace(importMatch[0], `${importMatch[0]}\nimport { SearchableSelect } from '../common/SearchableSelect';`);
  }
}

// 1. Grade Select
const gradeSelect = /<select\s+ref=\{gradeSelectRef\}\s+value=\{selectedGrade\}\s+onChange=\{\(e\) => handleGradeChange\(e\.target\.value\)\}\s+onKeyDown=\{\(e\) => \{\s+if \(e\.key === 'Enter'\) \{\s+e\.preventDefault\(\);\s+\/\/ Only save if a grade is actually selected\s+if \(selectedGrade\) \{\s+handleAddBalItem\(\);\s+\}\s+\}\s+\}\}\s+className="w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"\s+>\s+<option value="">-- Pilih Grade --<\/option>\s+\{hargaList\.map\(\(h\) => \(\s+<option key=\{h\.harga_id\} value=\{h\.kode_grade\}>\s+Grade \{h\.kode_grade\} — \{formatRupiah\(h\.harga_per_kg\)\}\/kg\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(gradeSelect, `<SearchableSelect
                  value={selectedGrade}
                  onChange={(val) => handleGradeChange(val)}
                  allowCustom={true}
                  options={hargaList.map(h => ({ value: h.kode_grade, label: \`Grade \${h.kode_grade} — \${formatRupiah(h.harga_per_kg)}/kg\` }))}
                  placeholder="Ketik Grade (Contoh: A0001)..."
                  className="w-full"
                />`);

// 2. Petani Penyetor
const petaniSelect = /<select\s+value=\{selectedPetaniId\}\s+onChange=\{\(e\) => setSelectedPetaniId\(e\.target\.value\)\}\s+className="w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-1\.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"\s+required\s+>\s+\{activeFarmers\.map\(\(p\) => \(\s+<option key=\{p\.petani_id\} value=\{p\.petani_id\}>\s+\{p\.nama_petani\} \(\{p\.petani_id\}\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;
code = code.replace(petaniSelect, `<SearchableSelect
                value={selectedPetaniId}
                onChange={(val) => setSelectedPetaniId(val)}
                options={activeFarmers.map(p => ({ value: p.petani_id, label: \`\${p.nama_petani} (\${p.petani_id})\` }))}
                placeholder="Pilih Petani..."
              />`);

// 3. Gudang Intake
const gudangSelect = /<select\s+value=\{lokasiGudang\}\s+onChange=\{\(e\) => setLokasiGudang\(e\.target\.value\)\}\s+className="w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-1\.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"\s+>\s+\{gudangList && gudangList\.length > 0 \? \(\s+gudangList\.map\(\(g\) => \(\s+<option key=\{g\.gudang_id\} value=\{g\.nama_gudang\}>\s+\{g\.nama_gudang\}\s+<\/option>\s+\)\)\s+\) : \(\s+<option value="Gudang Pusat Induk - Pamekasan">Gudang Pusat Induk - Pamekasan<\/option>\s+\)\}\s+<\/select>/g;
code = code.replace(gudangSelect, `<SearchableSelect
                value={lokasiGudang}
                onChange={(val) => setLokasiGudang(val)}
                options={gudangList && gudangList.length > 0 ? gudangList.map(g => ({ value: g.nama_gudang, label: g.nama_gudang })) : [{ value: 'Gudang Pusat Induk - Pamekasan', label: 'Gudang Pusat Induk - Pamekasan' }]}
                placeholder="Pilih Gudang Intake..."
              />`);

fs.writeFileSync('src/components/transaksi/SortirPageView.tsx', code);
console.log('Patched SortirPageView');

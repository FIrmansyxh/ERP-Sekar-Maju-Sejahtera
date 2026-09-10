const fs = require('fs');

function replaceFile(path, replacements) {
  let code = fs.readFileSync(path, 'utf8');
  let changed = false;
  
  if (!code.includes("SearchableSelect")) {
    const importMatch = code.match(/import\s+\{.*\}\s+from\s+'lucide-react';/);
    if (importMatch) {
      code = code.replace(importMatch[0], `${importMatch[0]}\nimport { SearchableSelect } from '../common/SearchableSelect';`);
      changed = true;
    }
  }

  for (let r of replacements) {
    // Regex replace using whitespace tolerance
    const matches = code.match(r.findRegex);
    if (matches && matches.length > 0) {
      code = code.replace(r.findRegex, r.replace);
      changed = true;
    } else {
      console.log(`Could not find in ${path}:\nRegex: ${r.findRegex}`);
    }
  }

  if (changed) {
    fs.writeFileSync(path, code);
    console.log(`Patched ${path}`);
  }
}

replaceFile('src/components/transaksi/TransaksiFormModal.tsx', [
  {
    findRegex: /<select\s+value=\{lokasiGudang\}\s+onChange=\{\(e\) => setLokasiGudang\(e\.target\.value\)\}\s+className="flex-1 border border-\[#ced4da\] rounded-sm px-2\.5 py-1\.5 text-xs focus:outline-none focus:border-\[#b81d24\] bg-white font-medium text-gray-900 cursor-pointer"\s+>\s+\{gudangOptions\.map\(\(opt\) => \(\s+<option key=\{opt\} value=\{opt\}>\s+\{opt\}\s+<\/option>\s+\)\)\}\s+<\/select>/g,
    replace: `<SearchableSelect
                    value={lokasiGudang}
                    onChange={(val) => setLokasiGudang(val)}
                    options={gudangOptions.map(opt => ({ value: opt, label: opt }))}
                    placeholder="Pilih Gudang..."
                    className="flex-1"
                  />`
  },
  {
    findRegex: /<select\s+value=\{selectedPetaniId\}\s+onChange=\{\(e\) => setSelectedPetaniId\(e\.target\.value\)\}\s+className="flex-1 border border-\[#ced4da\] rounded-sm px-2\.5 py-1\.5 text-xs focus:outline-none focus:border-\[#b81d24\] bg-white font-bold text-gray-900"\s+>\s+\{activePetani\.map\(\(p\) => \(\s+<option key=\{p\.petani_id\} value=\{p\.petani_id\}>\s+\{p\.nama_petani\} \(\{p\.petani_id\}\) - \{p\.alamat \|\| p\.desa_kecamatan\}\s+<\/option>\s+\)\)\}\s+<\/select>/g,
    replace: `<SearchableSelect
                    value={selectedPetaniId}
                    onChange={(val) => setSelectedPetaniId(val)}
                    options={activePetani.map(p => ({ value: p.petani_id, label: \`\${p.nama_petani} (\${p.petani_id}) - \${p.alamat || p.desa_kecamatan}\` }))}
                    placeholder="Pilih Petani..."
                    className="flex-1"
                  />`
  },
  {
    findRegex: /<select\s+value=\{item\.kodeGrade\}\s+onChange=\{\(e\) => handleItemChange\(item\.id, 'kodeGrade', e\.target\.value\)\}\s+className="w-full border border-gray-300 rounded-xs px-2 py-1 text-xs font-bold text-gray-900 focus:outline-none focus:border-\[#b81d24\] bg-white cursor-pointer"\s+>\s+\{activeGrades\.map\(\(h\) => \(\s+<option key=\{h\.harga_id\} value=\{h\.kode_grade\}>\s+Grade \{h\.kode_grade\} \(\{h\.nama_grade\}\) - \{formatRupiah\(h\.harga_per_kg\)\}\/kg\s+<\/option>\s+\)\)\}\s+<\/select>/g,
    replace: `<SearchableSelect
                            value={item.kodeGrade}
                            onChange={(val) => handleItemChange(item.id, 'kodeGrade', val)}
                            options={activeGrades.map(h => ({ value: h.kode_grade, label: \`Grade \${h.kode_grade} (\${formatRupiah(h.harga_per_kg)}/kg)\` }))}
                            placeholder="Grade..."
                          />`
  }
]);


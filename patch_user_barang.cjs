const fs = require('fs');

function replaceFile(path, replacements) {
  if (!fs.existsSync(path)) return;
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
    const matches = code.match(r.findRegex);
    if (matches && matches.length > 0) {
      code = code.replace(r.findRegex, r.replace);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(path, code);
    console.log(`Patched ${path}`);
  }
}

replaceFile('src/components/user/UserFormModal.tsx', [
  {
    findRegex: /<select\s+value=\{role\}\s+onChange=\{\(e\) => setRole\(e\.target\.value as UserRole\)\}\s+className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 text-xs bg-white font-semibold text-gray-900"\s+>\s+\{ALL_ROLES\.map\(\(r\) => \(\s+<option key=\{r\} value=\{r\}>\s+\{ROLE_DEFINITIONS\[r\]\.label\}\s+<\/option>\s+\)\)\}\s+<\/select>/g,
    replace: `<SearchableSelect
                value={role}
                onChange={(val) => setRole(val as UserRole)}
                options={ALL_ROLES.map(r => ({ value: r, label: ROLE_DEFINITIONS[r].label }))}
                placeholder="Pilih Role..."
              />`
  }
]);

replaceFile('src/components/barang/MasterBarangFormModal.tsx', [
  {
    findRegex: /<select\s+value=\{kodeGrade\}\s+onChange=\{\(e\) => setKodeGrade\(e\.target\.value\)\}\s+className="w-full px-3 py-2 border border-gray-300 rounded-sm text-xs font-semibold focus:outline-none focus:border-\[#b81d24\] bg-white"\s+required\s+>\s+<option value="">-- Pilih Grade --<\/option>\s+\{INITIAL_HARGA_DATA\.filter\(\(h\) => h\.status === 'aktif'\)\.map\(\(h\) => \(\s+<option key=\{h\.harga_id\} value=\{h\.kode_grade\}>\s+Grade \{h\.kode_grade\}\s+<\/option>\s+\)\)\}\s+<\/select>/g,
    replace: `<SearchableSelect
                value={kodeGrade}
                onChange={(val) => setKodeGrade(val)}
                options={INITIAL_HARGA_DATA.filter(h => h.status === 'aktif').map(h => ({ value: h.kode_grade, label: \`Grade \${h.kode_grade}\` }))}
                placeholder="-- Pilih Grade --"
              />`
  }
]);


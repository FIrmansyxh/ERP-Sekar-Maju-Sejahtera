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

replaceFile('src/components/barang/MasterBarangManagement.tsx', [
  {
    findRegex: /<select\s+value=\{selectedGrade\}\s+onChange=\{\(e\) => setSelectedGrade\(e\.target\.value\)\}\s+className="bg-white border border-gray-300 rounded-sm px-2\.5 py-1 text-xs font-semibold focus:border-\[#b81d24\] focus:outline-none"\s+>\s+<option value="all">Semua Grade \(\{availableGrades\.length\}\)<\/option>\s+\{availableGrades\.map\(\(gr\) => \(\s+<option key=\{gr\} value=\{gr\}>\s+Grade \{gr\}\s+<\/option>\s+\)\)\}\s+<\/select>/g,
    replace: `<SearchableSelect
                value={selectedGrade}
                onChange={(val) => setSelectedGrade(val)}
                options={[
                  { value: 'all', label: \`Semua Grade (\${availableGrades.length})\` },
                  ...availableGrades.map(gr => ({ value: gr, label: \`Grade \${gr}\` }))
                ]}
              />`
  }
]);


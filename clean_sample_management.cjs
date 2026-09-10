const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove status summary boxes
code = code.replace(/\{.*\n.*<div className="bg-amber-50[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '');

// 2. Remove Status Tabs
code = code.replace(/\{\/\* Status Tabs \*\/\}.*?<\/div>/s, '');

// 3. Remove columns
code = code.replace(/<th className="px-3\.5 py-2\.5 text-center">Status Batch<\/th>/, '');
code = code.replace(/<th className="px-3\.5 py-2\.5 text-center">Hasil Evaluasi<\/th>/, '');

// 4. Remove data cells for status and evaluation
code = code.replace(/<td className="px-3\.5 py-3 text-center">\s*\{batch\.status === 'selesai' \? \([\s\S]*?<\/td>/, '');
code = code.replace(/<td className="px-3\.5 py-3 text-center">\s*<div className="space-y-0\.5 text-\[10px\]">[\s\S]*?<\/td>/, '');

// 5. Remove Detail Button
code = code.replace(/<button\s*type="button"\s*title="Evaluasi & Detail Sortir QC"[\s\S]*?<\/button>/, '');

// 6. Remove Modal
code = code.replace(/<BatchEvaluasiSortirModal[\s\S]*?onNavigateToPengiriman=\{[\s\S]*?\}\s*\/>/, '');

fs.writeFileSync(file, code);
console.log('Cleaned SampleManagement.tsx');

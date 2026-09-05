const fs = require('fs');
let code = fs.readFileSync('src/utils/storage.ts', 'utf8');

// Replace localStorage.setItem(KEY, JSON.stringify(data)) with safeSetItem(KEY, data)
code = code.replace(/localStorage\.setItem\(([^,]+),\s*JSON\.stringify\(([^)]+)\)\)/g, 'safeSetItem($1, $2)');
// Replace localStorage.getItem with safeGetItem
code = code.replace(/localStorage\.getItem\(/g, 'safeGetItem(');
// Fix the safeGetItem itself because it uses localStorage.getItem internally
code = code.replace(/const compressed = safeGetItem\(key\);/, 'const compressed = localStorage.getItem(key);');

fs.writeFileSync('src/utils/storage.ts', code);

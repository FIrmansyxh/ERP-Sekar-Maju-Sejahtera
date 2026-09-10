const fs = require('fs');
let code = fs.readFileSync('src/utils/formatters.ts', 'utf8');

// The error is around line 80, an extra closing brace before `export function formatDateTimeIndo`
let marker = "export function formatDateTimeIndo";
let parts = code.split(marker);
if(parts.length > 1) {
  let before = parts[0].trimRight();
  if (before.endsWith('}')) {
    before = before.substring(0, before.lastIndexOf('}'));
  }
  code = before + '\n\n' + marker + parts[1];
}

fs.writeFileSync('src/utils/formatters.ts', code);

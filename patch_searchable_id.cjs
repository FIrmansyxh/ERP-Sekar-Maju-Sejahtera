const fs = require('fs');
let code = fs.readFileSync('src/components/common/SearchableSelect.tsx', 'utf8');
if (!code.includes('inputId?: string;')) {
  code = code.replace('className?: string;', 'className?: string;\n  inputId?: string;');
  code = code.replace('onKeyDown?:', 'inputId,\n  onKeyDown?:');
  code = code.replace('<input', '<input\n          id={inputId}');
  fs.writeFileSync('src/components/common/SearchableSelect.tsx', code);
  console.log('Patched SearchableSelect with inputId');
}

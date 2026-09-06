const fs = require('fs');
const file = 'src/components/Sidebar.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /\{barangCount\} Bal/g,
  '{barangCount > 9999 ? "9999+" : barangCount} Bal'
);

fs.writeFileSync(file, code);

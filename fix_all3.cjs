const fs = require('fs');
let code = fs.readFileSync('src/components/transaksi/TimbanganPageView.tsx', 'utf8');

code = code.replace(/\} from 'lucide-react';/, '  Package,\n  ChevronDown,\n  Save\n} from \'lucide-react\';');
fs.writeFileSync('src/components/transaksi/TimbanganPageView.tsx', code);

code = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');
let lines = code.split('\n');
let newLines = [];
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes(`if (key === 'gantiTikar')`)) {
    // skip this and next 3 lines
    i += 4;
    continue;
  }
  newLines.push(lines[i]);
}
fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', newLines.join('\n'));

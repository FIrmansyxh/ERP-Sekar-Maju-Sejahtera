const fs = require('fs');

// Fix SearchableSelect
let code = fs.readFileSync('src/components/common/SearchableSelect.tsx', 'utf8');
code = code.replace(/  inputId\?:\s*string;\n  inputId,\n/, '  inputId?: string;\n');
code = code.replace(/  allowCustom = false,\n  onKeyDown\n\}\) => \{/, '  allowCustom = false,\n  inputId,\n  onKeyDown\n}) => {');
fs.writeFileSync('src/components/common/SearchableSelect.tsx', code);

// Fix Timbangan Imports
code = fs.readFileSync('src/components/transaksi/TimbanganPageView.tsx', 'utf8');
if (!code.includes('Package,')) {
  code = code.replace(/import\s*\{\s*Scale,\s*Lock,\s*Unlock,\s*Search,\s*Filter,\s*Plus,\s*ShieldCheck,\s*User\s*\}\s*from\s*'lucide-react';/, "import { Scale, Lock, Unlock, Search, Filter, Plus, ShieldCheck, User, Package, ChevronDown, Save } from 'lucide-react';");
}
fs.writeFileSync('src/components/transaksi/TimbanganPageView.tsx', code);

// Fix Proses1SortirModal
code = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');
code = code.replace(/      if \(key === 'gantiTikar'\) \{[\s\S]*?\}\n/g, '');
fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/components/transaksi/TimbanganPageView.tsx', 'utf8');

code = code.replace(/  Lock\n  Package,/g, '  Lock,\n  Package,');

fs.writeFileSync('src/components/transaksi/TimbanganPageView.tsx', code);

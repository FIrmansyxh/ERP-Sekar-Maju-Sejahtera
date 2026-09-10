const fs = require('fs');
let file = 'src/components/auth/LoginView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/<li>\s*<CheckCircle2.*?\/>\s*<span>Audit Trail & Kupon Timbang Terintegrasi<\/span>\s*<\/li>\n?/g, '');

fs.writeFileSync(file, code);

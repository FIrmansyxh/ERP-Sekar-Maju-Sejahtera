const fs = require('fs');
let file = 'src/components/home/HomeDashboardView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/\{\s*no:\s*\d+,\s*nama:\s*'Log Aktivitas Sistem'[\s\S]*?\},\n?/g, '');

fs.writeFileSync(file, code);

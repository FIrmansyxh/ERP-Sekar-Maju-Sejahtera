const fs = require('fs');
let file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/setLogAktivitasList\(loadLogAktivitasData\(\)\);/g, '');
code = code.replace(/<LogAktivitasManagement[\s\S]*?\/>/g, '');
code = code.replace(/\{activeModuleId === 'modul-log-aktivitas' && \([\s\S]*?\)\}/g, '');

fs.writeFileSync(file, code);

const fs = require('fs');

let file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove LogAktivitasManagement import
code = code.replace(/import\s*\{\s*LogAktivitasManagement\s*\}\s*from\s*['"]\.\/components\/log\/LogAktivitasManagement['"];?\n?/g, '');

// 2. Remove LogAktivitas from types import
code = code.replace(/,\s*LogAktivitas/g, '');
code = code.replace(/LogAktivitas,\s*/g, '');

// 3. Remove loadLogAktivitasData from storage import
code = code.replace(/,\s*loadLogAktivitasData/g, '');
code = code.replace(/loadLogAktivitasData,\s*/g, '');

// 4. Remove recordLogAktivitas from storage import
code = code.replace(/,\s*recordLogAktivitas/g, '');
code = code.replace(/recordLogAktivitas,\s*/g, '');

// 5. Remove the state const [logAktivitasList, setLogAktivitasList] = useState...
code = code.replace(/const\s*\[logAktivitasList,\s*setLogAktivitasList\]\s*=\s*useState<LogAktivitas\[\]>\(\(\)\s*=>\s*loadLogAktivitasData\(\)\);/g, '');

// 6. Remove the log-aktivitas-updated event listener
const listenerRegex = /useEffect\(\(\)\s*=>\s*\{\s*const\s*handleLogUpdate\s*=\s*\(e:\s*Event\)\s*=>\s*\{\s*const\s*customEvent\s*=\s*e\s*as\s*CustomEvent<LogAktivitas>;\s*setLogAktivitasList\(\(prev\)\s*=>\s*\[customEvent\.detail,\s*\.\.\.prev\]\);\s*\};\s*window\.addEventListener\('log-aktivitas-updated',\s*handleLogUpdate\);\s*return\s*\(\)\s*=>\s*window\.removeEventListener\('log-aktivitas-updated',\s*handleLogUpdate\);\s*\},\s*\[\]\);/g;
code = code.replace(listenerRegex, '');

// 7. Remove all recordLogAktivitas(...) calls in App.tsx
let recordRegex = /recordLogAktivitas\(\{[\s\S]*?\}\);/g;
code = code.replace(recordRegex, '');

// 8. Remove the <LogAktivitasManagement ... /> component
let componentRegex = /\{\/\*\s*Log Aktivitas\s*\*\/\}\s*\{activeModuleId === 'modul-log-aktivitas' && \(\s*<LogAktivitasManagement\s*logs=\{logAktivitasList\}\s*users=\{users\}\s*\/>\s*\)\}/g;
code = code.replace(componentRegex, '');

fs.writeFileSync(file, code);
console.log('Stripped logs from App.tsx');

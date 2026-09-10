const fs = require('fs');
let file = 'src/utils/storage.ts';
let lines = fs.readFileSync(file, 'utf8').split('\n');
let out = [];
let inLogFunc = false;

for(let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.includes('export function loadLogAktivitasData') ||
        line.includes('export function saveLogAktivitasData') ||
        line.includes('export function recordLogAktivitas')) {
        inLogFunc = true;
    }
    
    if (!inLogFunc && !line.includes('INITIAL_LOG_AKTIVITAS_DATA') && !line.includes('KEY_LOG_AKTIVITAS') && !line.includes('LogAktivitas')) {
        out.push(line);
    }
    
    if (inLogFunc && line.startsWith('}')) {
        inLogFunc = false; // end of function
    }
}

fs.writeFileSync(file, out.join('\n'));

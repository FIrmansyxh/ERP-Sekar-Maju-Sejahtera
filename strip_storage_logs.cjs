const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');

// Remove LogAktivitas type import
code = code.replace(/,\s*LogAktivitas/g, '');
code = code.replace(/LogAktivitas,\s*/g, '');

// Remove KEY_LOG_AKTIVITAS
code = code.replace(/const KEY_LOG_AKTIVITAS = '.*?';\n?/g, '');

// Remove loadLogAktivitasData
code = code.replace(/export function loadLogAktivitasData\(\): LogAktivitas\[\] \{[\s\S]*?return \[\];\n\s*\}/g, '');

// Remove saveLogAktivitasData
code = code.replace(/export function saveLogAktivitasData\(data: LogAktivitas\[\]\): void \{[\s\S]*?\}\n\s*\}/g, '');

// Remove recordLogAktivitas
code = code.replace(/export function recordLogAktivitas\(entry: Omit<LogAktivitas, 'log_id' \| 'timestamp'>\): LogAktivitas \{[\s\S]*?return newLog;\n\s*\}/g, '');

// Remove INITIAL_LOG_AKTIVITAS_DATA import and export usage (if any left)
code = code.replace(/import \{ INITIAL_LOG_AKTIVITAS_DATA \} from '\.\.\/data\/initialLogAktivitasData';\n?/g, '');
code = code.replace(/logs:\s*INITIAL_LOG_AKTIVITAS_DATA,\n?/g, '');

fs.writeFileSync(file, code);

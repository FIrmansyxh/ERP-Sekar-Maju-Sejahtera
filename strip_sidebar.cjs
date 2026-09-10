const fs = require('fs');
let file = 'src/components/Sidebar.tsx';
let code = fs.readFileSync(file, 'utf8');

// Remove the item from menu modules list
code = code.replace(/\{\s*id: 'modul-log-aktivitas'[\s\S]*?\},\n?/g, '');

// Remove the access check
code = code.replace(/const canSeeAuditLog = checkAccess\('modul-log-aktivitas'\);\n?/g, '');
code = code.replace(/const isAuditLogActive = activeModuleId === 'modul-log-aktivitas';\n?/g, '');

// Remove the UI rendering section
let renderRegex = /\{\/\*\s*7\. Log Aktivitas & Audit Trail \(Super Admin Only\)\s*\*\/\}\s*\{canSeeAuditLog && \([\s\S]*?\n\s*\)\}/g;
code = code.replace(renderRegex, '');

fs.writeFileSync(file, code);

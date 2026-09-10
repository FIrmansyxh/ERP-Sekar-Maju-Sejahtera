const fs = require('fs');
let code = fs.readFileSync('src/utils/formatters.ts', 'utf8');

code = code.replace(/  \}\n\}\n\}export function formatDateTimeIndo/g, '  }\n}\nexport function formatDateTimeIndo');
// If that doesn't match exactly:
code = code.replace(/    return isGantiTikar \? 3 : 2;\n  \}\n\}\n\}export/g, '    return isGantiTikar ? 3 : 2;\n  }\n}\nexport');
code = code.replace(/\n\}\n\n\}export function formatDateTimeIndo/g, '\n}\nexport function formatDateTimeIndo');
code = code.replace(/\n\}\n\}\nexport function formatDateTimeIndo/g, '\n}\nexport function formatDateTimeIndo');

fs.writeFileSync('src/utils/formatters.ts', code);

const fs = require('fs');

const codes = [];
for (let i = 50; i <= 99; i++) {
  codes.push(String(i));
}

let codeStr = 'export const GRADE_COLOR_MAP: Record<string, string> = {\n';
const colors = ['red', 'blue', 'emerald', 'amber', 'purple', 'indigo', 'rose', 'teal'];

codes.forEach((c, idx) => {
  codeStr += `  '${c}': '${colors[idx % colors.length]}',\n`;
});

// Also include legacy A, B, C just in case
const legacy = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
legacy.forEach((c, idx) => {
  codeStr += `  '${c}': '${colors[idx % colors.length]}',\n`;
});

codeStr += '};\n';

let file = 'src/data/initialHargaData.ts';
let fileContent = fs.readFileSync(file, 'utf8');

fileContent = fileContent.replace(/export const GRADE_COLOR_MAP: Record<string, string> = \{\};/, codeStr);
fs.writeFileSync(file, fileContent);

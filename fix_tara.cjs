const fs = require('fs');

let code = fs.readFileSync('src/utils/formatters.ts', 'utf8');

code = code.replace(
/export function hitungPotonganTaraKg\(beratBrutoKg: number, isGantiTikar: boolean\): number \{[\s\S]*?\n\}/m,
`export function hitungPotonganTaraKg(beratBrutoKg: number, isGantiTikar: boolean): number {
  if (beratBrutoKg >= 60) {
    return 5;
  } else if (beratBrutoKg >= 50) {
    return 4;
  } else {
    return 3;
  }
}`
);

fs.writeFileSync('src/utils/formatters.ts', code);

const fs = require('fs');

let code = fs.readFileSync('src/utils/formatters.ts', 'utf8');

code = code.replace(
/export function hitungPotonganTaraKg\(beratBrutoKg: number, isGantiTikar: boolean\): number \{\n[\s\S]*?\}\n/,
`export function hitungPotonganTaraKg(beratBrutoKg: number, isGantiTikar: boolean): number {
  if (beratBrutoKg > 60) {
    return isGantiTikar ? 5 : 4;
  } else if (beratBrutoKg > 50) {
    return isGantiTikar ? 4 : 3;
  } else {
    return isGantiTikar ? 3 : 2;
  }
}\n`
);

fs.writeFileSync('src/utils/formatters.ts', code);

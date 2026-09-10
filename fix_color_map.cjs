const fs = require('fs');

fs.writeFileSync('src/data/initialHargaData.ts', `import { TabelHarga } from '../types';
export const INITIAL_HARGA_DATA: TabelHarga[] = [];

export const GRADE_COLOR_MAP: Record<string, string> = {
  'A': 'red',
  'A1': 'red',
  'A+': 'red',
  'A-': 'red',
  'A+1': 'red',
  'B': 'blue',
  'B1': 'blue',
  'B+': 'blue',
  'B-': 'blue',
  'B+1': 'blue',
  'C': 'emerald',
  'C1': 'emerald',
  'C+': 'emerald',
  'C-': 'emerald',
  'C+1': 'emerald',
  'D': 'amber',
  'D1': 'amber',
  'D+': 'amber',
  'D-': 'amber',
  'D+1': 'amber',
  'E': 'gray',
  'F': 'gray',
  'G': 'gray',
  'H': 'gray',
  'I': 'gray',
  'J': 'gray',
};
`);
console.log('Fixed GRADE_COLOR_MAP');

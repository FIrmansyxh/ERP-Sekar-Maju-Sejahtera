const fs = require('fs');
const file = 'src/components/petani/PetaniTable.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'export const PetaniTable: React.FC<PetaniTableProps> = ({',
  'export const PetaniTable: React.FC<PetaniTableProps> = ({\n  transaksiList = [],'
);

fs.writeFileSync(file, code);

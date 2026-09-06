const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetTag = `<PetaniTable
                data={petaniList}
                userRole={currentRole}`;
const newTag = `<PetaniTable
                data={petaniList}
                userRole={currentRole}
                transaksiList={transaksiList}`;

code = code.replace(targetTag, newTag);

fs.writeFileSync(file, code);

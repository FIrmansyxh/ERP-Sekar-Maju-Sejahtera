const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetDrawer = `<PetaniDetailDrawer
        isOpen={Boolean(viewingPetani)}
        onClose={() => setViewingPetani(null)}
        petani={viewingPetani}
        userRole={currentRole}`;
        
const newDrawer = `<PetaniDetailDrawer
        isOpen={Boolean(viewingPetani)}
        onClose={() => setViewingPetani(null)}
        petani={viewingPetani}
        userRole={currentRole}
        transaksiList={transaksiList}`;

code = code.replace(targetDrawer, newDrawer);

fs.writeFileSync(file, code);

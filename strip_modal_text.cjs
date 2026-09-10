const fs = require('fs');

function replaceText(file, oldStr, newStr) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(new RegExp(oldStr, 'g'), newStr);
    fs.writeFileSync(file, code);
}

replaceText('src/components/petani/PetaniDeactivateModal.tsx', 'audit tetap', 'data tetap');
replaceText('src/components/petani/PetaniResetCardModal.tsx', 'dengan audit log', 'dengan aman');
replaceText('src/components/barang/BarangEditLocationModal.tsx', 'standar audit transaksi pembelian', 'standar transaksi pembelian');


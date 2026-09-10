const fs = require('fs');

function removeRecordLog(file) {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    
    // Remove the import
    code = code.replace(/import\s*\{\s*recordLogAktivitas\s*\}\s*from\s*['"]\.\.\/\.\.\/utils\/storage['"];?\n?/g, '');
    
    // Replace the block recordLogAktivitas({ ... })
    // Since it spans multiple lines, we can use a regex to match recordLogAktivitas({ ... });
    // This is tricky if it contains nested braces. Let's do it carefully.
    
    // A regex that matches recordLogAktivitas( ... ); where ... does not contain another recordLogAktivitas
    // It's safer to use a parser or a recursive regex, but for simplicity, we can do a block replacement.
    
    let regex = /recordLogAktivitas\(\{[\s\S]*?\}\);/g;
    code = code.replace(regex, '');

    fs.writeFileSync(file, code);
}

[
    'src/components/transaksi/Proses1SortirModal.tsx',
    'src/components/transaksi/TimbanganPageView.tsx',
    'src/components/transaksi/KasirPageView.tsx',
    'src/components/transaksi/Proses2TimbangModal.tsx',
    'src/components/transaksi/TransaksiEditModal.tsx'
].forEach(removeRecordLog);

console.log('Stripped logs from components');

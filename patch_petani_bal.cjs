const fs = require('fs');
const file = 'src/components/petani/PetaniDetailDrawer.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update totalBalComputed logic
const oldTotalBalComputed = `const totalBalComputed = realTransactions.reduce((acc, tx) => acc + (tx.items ? tx.items.length : 1), 0);`;
const newTotalBalComputed = `const totalBalComputed = realTransactions.reduce((acc, tx) => acc + (tx.total_bal || (tx.items ? tx.items.length : 0)), 0);`;
code = code.replace(oldTotalBalComputed, newTotalBalComputed);

// Update render
const oldTotalBalRender = `{petani.statistik?.total_setoran_bal || 0}`;
const newTotalBalRender = `{totalBalComputed}`;
code = code.replace(oldTotalBalRender, newTotalBalRender);

fs.writeFileSync(file, code);

const fs = require('fs');
let file = 'src/components/pengiriman/StatusBatchPengirimanManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/setDraftBatchItems/g, 'setBatchItems');
code = code.replace(/draftBatchItems/g, 'batchItems');

fs.writeFileSync(file, code);
console.log('Fixed draftBatchItems references');

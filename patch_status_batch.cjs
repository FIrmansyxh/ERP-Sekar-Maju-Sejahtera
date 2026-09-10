const fs = require('fs');
let file = 'src/components/pengiriman/StatusBatchPengirimanManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

const regexState = /const \[selectedBatchId, setSelectedBatchId\] = useState<string>\([\s\S]*?batchSampleList\.length > 0 \? batchSampleList\[0\]\.batch_id : ''[\s\S]*?\);/g;
code = code.replace(regexState, `const [selectedBatchId, setSelectedBatchId] = useState<string>('');`);

fs.writeFileSync(file, code);
console.log('Patched selectedBatchId state');

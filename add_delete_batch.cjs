const fs = require('fs');
let file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const handleDeleteBatchSampleStr = `
  const handleDeleteBatchSample = (batchId: string) => {
    const list = batchSampleList.filter(b => b.batch_id !== batchId);
    setBatchSampleList(list);
    saveBatchSampleData(list);
    showToast(\`Batch \${batchId} berhasil dihapus.\`);
  };

  const handleUpdateBatchSample =`;

code = code.replace(/  const handleUpdateBatchSample =/, handleDeleteBatchSampleStr);

const sampleManagementStr = `
                onSaveBatchSample={handleSaveBatchSample}
                onUpdateBatchSample={handleUpdateBatchSample}
                onDeleteBatchSample={handleDeleteBatchSample}
                onUpdateSample={handleUpdateSample}`;

code = code.replace(/                onSaveBatchSample=\{handleSaveBatchSample\}\s+onUpdateBatchSample=\{handleUpdateBatchSample\}\s+onUpdateSample=\{handleUpdateSample\}/, sampleManagementStr);

fs.writeFileSync(file, code);
console.log('Added handleDeleteBatchSample to App.tsx');

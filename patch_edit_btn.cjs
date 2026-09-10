const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

const editBtnPattern = /onClick=\{\(\) => \{\s*\/\/\s*Populate the form\s*setEditingBatchId\(batch\.batch_id\);/;
const editBtnReplacement = `onClick={() => {
                                  setViewMode('create');
                                  // Populate the form
                                  setEditingBatchId(batch.batch_id);`;
code = code.replace(editBtnPattern, editBtnReplacement);

const cancelBtnPattern = /onClick=\{\(\) => \{\s*setEditingBatchId\(null\);\s*handleDeselectAll\(\);/;
const cancelBtnReplacement = `onClick={() => {
                      setViewMode('list');
                      setEditingBatchId(null);
                      handleDeselectAll();`;
code = code.replace(cancelBtnPattern, cancelBtnReplacement);

// Just in case it wasn't exact, I'll use a more robust replace for Cancel
code = code.replace(/setEditingBatchId\(null\);\n\s*handleDeselectAll\(\);\n\s*setTujuanBuyer\(''\);\n\s*setPermintaanBuyer\(''\);\n\s*setCatatanBatchForm\(''\);/,
`setViewMode('list');
                      setEditingBatchId(null);
                      handleDeselectAll();
                      setTujuanBuyer('');
                      setPermintaanBuyer('');
                      setCatatanBatchForm('');`);

// Ensure editing resets viewMode
const saveBtnPattern = /setEditingBatchId\(null\);\s*\} else if \(onSaveBatchSample\) \{/;
const saveBtnReplacement = `setEditingBatchId(null);
      setViewMode('list');
    } else if (onSaveBatchSample) {`;
code = code.replace(saveBtnPattern, saveBtnReplacement);


fs.writeFileSync(file, code);
console.log('Patched edit button visibility issue');

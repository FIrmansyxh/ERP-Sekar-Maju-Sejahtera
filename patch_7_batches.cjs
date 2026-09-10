const fs = require('fs');
let file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /const totalBatches = 0;[\s\S]*?for \(let i = 0; i < totalBatches; i\+\+\) \{[\s\S]*?let status = 'selesai';[\s\S]*?let pengirimanStatus = 'selesai';[\s\S]*?if \(i < cancelledCount\) \{[\s\S]*?pengirimanStatus = 'dalam_perjalanan';\s*\}/g;

const replacement = `const totalBatches = 7;
  let activeBatchCounts = new Array(7).fill(33);
  let currentItemIdx = 0;
  let activeBatchIdx = 0;

  for (let i = 0; i < totalBatches; i++) {
    let status = 'selesai';
    let pengirimanStatus = 'selesai';
    let includeDo = true;

    if (i < 3) {
       status = 'selesai';
       pengirimanStatus = 'selesai';
    } else if (i < 5) {
       status = 'selesai';
       pengirimanStatus = 'dalam_perjalanan';
    } else if (i === 5) {
       status = 'disetujui';
       pengirimanStatus = 'draft';
    } else if (i === 6) {
       status = 'dikirim';
       includeDo = false;
    }`;

code = code.replace(regex, replacement);

// And we need to fix the DO inclusion
// Find `if (status !== 'dibatalkan') {` around line 360 and replace with `if (includeDo) {`
code = code.replace(/if \(status !== 'dibatalkan'\) \{\s*pengirimanList\.push\(\{/g, `if (includeDo) {
      pengirimanList.push({`);

// Find `if (status !== 'dibatalkan') {` inside the inner loop around line 290 and replace with `if (includeDo) {`
code = code.replace(/if \(status !== 'dibatalkan'\) \{\s*item\.pengiriman_id = \`DO-\$\{batchId\}\`;\s*item\.status_stok = 'keluar';\s*\} else \{\s*item\.status_stok = 'di_gudang'; \/\/ Reset if cancelled\s*\}/g, `if (includeDo) {
            item.pengiriman_id = \`DO-\$\{batchId\}\`;
            item.status_stok = 'keluar';
        } else {
            item.status_stok = 'terkirim_sample'; 
        }`);

fs.writeFileSync(file, code);
console.log('Patched dataset generator to 7 batches');

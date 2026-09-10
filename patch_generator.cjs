const fs = require('fs');

let file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Better statuses for deliveries
const statusLogicOld = `    let status = 'selesai';
    if (i < cancelledCount) status = 'dibatalkan';
    else if (i < cancelledCount + deliveringCount) status = 'dikirim';`;

const statusLogicNew = `    let status = 'selesai';
    let pengirimanStatus = 'selesai';
    if (i < cancelledCount) {
       status = 'dibatalkan';
       pengirimanStatus = 'batal';
    } else if (i === cancelledCount) {
       status = 'dikirim';
       pengirimanStatus = 'dimuat';
    } else if (i === cancelledCount + 1) {
       status = 'dikirim';
       pengirimanStatus = 'dalam_perjalanan';
    } else if (i === cancelledCount + 2) {
       status = 'dikirim';
       pengirimanStatus = 'diterima';
    } else if (i === cancelledCount + 3) {
       status = 'dikirim';
       pengirimanStatus = 'dalam_perjalanan';
    }`;

code = code.replace(statusLogicOld, statusLogicNew);

// 2. Link barang to pengiriman_id
const assignPengirimanOld = `        selectedBals.push(item);
        doBarangIds.push(item.barang_id);`;

const assignPengirimanNew = `        selectedBals.push(item);
        doBarangIds.push(item.barang_id);
        if (status !== 'dibatalkan') {
            item.pengiriman_id = \`DO-\${batchId}\`;
            item.status_stok = 'keluar';
        } else {
            item.status_stok = 'di_gudang'; // Reset if cancelled
        }`;

code = code.replace(assignPengirimanOld, assignPengirimanNew);

// Also remove the old hardcoded 'keluar' assignment
const hardcodedKeluarOld = `  const shippedCount = 6380;
  for (let i = 0; i < shippedCount; i++) {
    barangList[i].status_stok = 'keluar';
  }`;

const hardcodedKeluarNew = `  const shippedCount = 6380;
  // We will assign status_stok='keluar' dynamically in the loop below based on actual DO association
`;

code = code.replace(hardcodedKeluarOld, hardcodedKeluarNew);

// 3. Fix pengirimanList push
const pengirimanPushOld = `        plat_nomor: 'M 1234 XX',
        status: status as any,
        total_bal: batchItems.length,`;

const pengirimanPushNew = `        plat_nomor: 'M 1234 XX',
        status: pengirimanStatus as any,
        total_bal: batchItems.length,`;

code = code.replace(pengirimanPushOld, pengirimanPushNew);

fs.writeFileSync(file, code);
console.log('Patched generator to include varied statuses and link pengiriman_id');

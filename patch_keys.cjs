const fs = require('fs');
let file = 'src/utils/storage.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const KEY_PETANI = 'erp_tembakau_petani_v24';/, "const KEY_PETANI = 'erp_tembakau_petani_v25';");
code = code.replace(/const KEY_BARANG = 'erp_tembakau_barang_v24';/, "const KEY_BARANG = 'erp_tembakau_barang_v25';");
code = code.replace(/const KEY_STOCK_OPNAME = 'erp_tembakau_stock_opname_v24';/, "const KEY_STOCK_OPNAME = 'erp_tembakau_stock_opname_v25';");
code = code.replace(/const KEY_TRANSAKSI = 'erp_tembakau_transaksi_v24';/, "const KEY_TRANSAKSI = 'erp_tembakau_transaksi_v25';");
code = code.replace(/const KEY_SAMPLE = 'erp_tembakau_sample_v24';/, "const KEY_SAMPLE = 'erp_tembakau_sample_v25';");
code = code.replace(/const KEY_BATCH_SAMPLE = 'erp_tembakau_batch_sample_v24';/, "const KEY_BATCH_SAMPLE = 'erp_tembakau_batch_sample_v25';");
code = code.replace(/const KEY_PENGIRIMAN = 'erp_tembakau_pengiriman_v24';/, "const KEY_PENGIRIMAN = 'erp_tembakau_pengiriman_v25';");

fs.writeFileSync(file, code);
console.log('Patched keys to v25');

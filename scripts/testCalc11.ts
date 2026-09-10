import { INITIAL_TRANSAKSI_DATA } from '../src/data/initialTransaksiData';
import { INITIAL_BARANG_DATA } from '../src/data/initialBarangData';

const validBarangIdsFromTx = new Set<string>();
INITIAL_TRANSAKSI_DATA.forEach(tx => {
  tx.items?.forEach(item => {
    if ((item as any).barang_id) validBarangIdsFromTx.add((item as any).barang_id);
    else if ((item as any).no_bal) validBarangIdsFromTx.add((item as any).no_bal);
  });
  tx.barang_ids?.forEach(id => validBarangIdsFromTx.add(id));
});

let missing = 0;
INITIAL_BARANG_DATA.forEach(b => {
  if (b.transaksi_pembelian_id && !validBarangIdsFromTx.has(b.barang_id)) {
     missing++;
     console.log('Missing:', b.barang_id, b.no_bal);
  }
});
console.log('Total missing from validBarangIdsFromTx:', missing);

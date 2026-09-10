import { INITIAL_TRANSAKSI_DATA } from '../src/data/initialTransaksiData';
import { INITIAL_BARANG_DATA } from '../src/data/initialBarangData';

const validBarangIdsFromTx = new Set<string>();
INITIAL_TRANSAKSI_DATA.forEach(tx => {
  tx.items?.forEach(item => {
    if (item.barang_id) validBarangIdsFromTx.add(item.barang_id);
  });
  tx.barang_ids?.forEach(id => validBarangIdsFromTx.add(id));
});

console.log('Valid IDs from TX:', validBarangIdsFromTx.size);

const filtered = INITIAL_BARANG_DATA.filter(b => {
  if (b.transaksi_pembelian_id && !validBarangIdsFromTx.has(b.barang_id)) return false;
  return true;
});

console.log('Original barang:', INITIAL_BARANG_DATA.length);
console.log('Filtered barang:', filtered.length);

let val = 0;
filtered.forEach(b => val += b.total_harga || ((b.berat_kg || 0) * (b.harga_per_kg || 50000)));
console.log('Valuasi:', val);

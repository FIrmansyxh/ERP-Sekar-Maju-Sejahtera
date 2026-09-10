import { INITIAL_BARANG_DATA } from '../src/data/initialBarangData';
import { INITIAL_TRANSAKSI_DATA } from '../src/data/initialTransaksiData';

INITIAL_BARANG_DATA.forEach(b => {
  const diff = b.total_harga - 2476248.727;
  if (Math.abs(diff) < 10) {
    console.log('Found barang close to 2476248.727:', b.barang_id, b.total_harga, b.berat_kg);
  }
});

INITIAL_TRANSAKSI_DATA.forEach(t => {
  if (t.items) {
    t.items.forEach(i => {
      const subtotal = (i.berat_kg || 0) * (i.harga_per_kg || 0);
      const diff = subtotal - 2476248.727;
      if (Math.abs(diff) < 10) {
        console.log('Found item close to 2476248.727:', i.item_id, subtotal);
      }
    });
  }
});

import { INITIAL_BARANG_DATA } from '../src/data/initialBarangData';
import { INITIAL_TRANSAKSI_DATA } from '../src/data/initialTransaksiData';

// Find a subset of items whose total_kotor sums to 2476248.727
let target = 2476248.727;

for (let i = 0; i < INITIAL_BARANG_DATA.length; i++) {
  const b = INITIAL_BARANG_DATA[i];
  if (Math.abs(b.total_harga - target) < 0.1) {
    console.log('Single match:', b.barang_id);
  }
}

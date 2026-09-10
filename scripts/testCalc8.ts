import { INITIAL_TRANSAKSI_DATA } from '../src/data/initialTransaksiData';

let total = 0;
INITIAL_TRANSAKSI_DATA.forEach(t => {
  if (t.transaksi_id !== 'TRX-705354') {
     total += t.total_harga_beli;
  }
});
console.log('total', total);

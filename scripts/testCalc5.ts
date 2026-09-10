import { INITIAL_TRANSAKSI_DATA } from '../src/data/initialTransaksiData';

let totalPotongan = 0;
INITIAL_TRANSAKSI_DATA.forEach(t => {
  totalPotongan += (t.total_potongan || 0);
});

console.log('totalPotongan', totalPotongan);

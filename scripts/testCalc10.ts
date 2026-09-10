import { INITIAL_TRANSAKSI_DATA } from '../src/data/initialTransaksiData';

INITIAL_TRANSAKSI_DATA.forEach(t => {
  const subtotal = t.total_harga_beli || (t.berat_kg * t.harga_per_kg);
  console.log(t.transaksi_id, subtotal);
});

import { INITIAL_TRANSAKSI_DATA } from '../src/data/initialTransaksiData';
import { INITIAL_BARANG_DATA } from '../src/data/initialBarangData';

let totalPembelian = 0;
let txCount = 0;
INITIAL_TRANSAKSI_DATA.forEach(t => {
  const subtotal = t.total_harga_beli || (t.berat_kg * t.harga_per_kg);
  totalPembelian += subtotal;
});

let totalValuasi = 0;
INITIAL_BARANG_DATA.forEach(b => {
  const cost = b.total_harga || ((b.berat_kg || 0) * (b.harga_per_kg || 50000));
  totalValuasi += cost;
});

console.log('totalPembelian', totalPembelian);
console.log('totalValuasi', totalValuasi);
console.log('diff', totalValuasi - totalPembelian);

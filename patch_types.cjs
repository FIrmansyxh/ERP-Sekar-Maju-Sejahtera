const fs = require('fs');
let file = 'src/types/index.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace all non-standard IDs with standard Indonesian business IDs
code = code.replace(/export interface User \{\n  user_id: string;/g, 'export interface User {\n  pengguna_id: string;');
code = code.replace(/export interface Petani \{\n  petani_id: string;/g, 'export interface Petani {\n  petani_id: string;'); // Already OK
code = code.replace(/export interface Barang \{\n  barang_id: string;/g, 'export interface Barang {\n  barang_id: string;'); // OK
code = code.replace(/export interface MasterBarang \{\n  master_id: string;/g, 'export interface MasterBarang {\n  master_barang_id: string;');
code = code.replace(/export interface TabelHarga \{\n  harga_id: string;/g, 'export interface TabelHarga {\n  harga_beli_id: string;');
code = code.replace(/export interface MasterHargaJual \{\n  kode_harga_jual: string;/g, 'export interface MasterHargaJual {\n  harga_jual_id: string;\n  kode_harga_jual: string;');
code = code.replace(/export interface Gudang \{\n  gudang_id: string;/g, 'export interface Gudang {\n  gudang_id: string;'); // OK

// Fix usages in User interface implementations later if we changed it, but it's safer to keep user_id since it might be used in auth context widely. Let's stick to standardizing the business entities first.
// Just reviewing, the IDs are actually quite standard:
// user_id, petani_id, barang_id, gudang_id, transaksi_id, batch_id, pengiriman_id, master_id, harga_id, kupon_id
// We just need to make sure they are consistent.

// Instead of massive regex that breaks everything, let's just observe.

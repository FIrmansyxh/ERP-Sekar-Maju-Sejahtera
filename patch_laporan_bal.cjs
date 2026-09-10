const fs = require('fs');
const file = 'src/components/laporan/LaporanBalView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Update enrichedBalList to include potongan & status_pembayaran
const mapCodeOld = `const txItemMap = new Map<string, { harga_per_kg: number; total_kotor: number; nama_petani: string; no_kupon: string }>();
    transaksiList.forEach((tx) => {
      if (tx.items) {
        tx.items.forEach((it) => {
          if (it.barang_id || it.no_bal) {
            const key = it.barang_id || it.no_bal;
            txItemMap.set(key, {
              harga_per_kg: it.harga_per_kg || 0,
              total_kotor: it.total_kotor || ((it.berat_kg || 0) * (it.harga_per_kg || 0)),
              nama_petani: tx.nama_petani || '',
              no_kupon: tx.no_kupon || '',
            });`;

const mapCodeNew = `const txItemMap = new Map<string, { harga_per_kg: number; total_kotor: number; nama_petani: string; no_kupon: string; potongan: number; status_pembayaran: string }>();
    transaksiList.forEach((tx) => {
      if (tx.items) {
        tx.items.forEach((it) => {
          if (it.barang_id || it.no_bal) {
            const key = it.barang_id || it.no_bal;
            txItemMap.set(key, {
              harga_per_kg: it.harga_per_kg || 0,
              total_kotor: it.total_kotor || ((it.berat_kg || 0) * (it.harga_per_kg || 0)),
              nama_petani: tx.nama_petani || '',
              no_kupon: tx.no_kupon || '',
              potongan: it.potongan || 0,
              status_pembayaran: tx.status_pembayaran || 'belum_lunas',
            });`;
code = code.replace(mapCodeOld, mapCodeNew);

const returnCodeOld = `      return {
        ...bal,
        originalIndex,
        berat_bruto_kg: bruto,
        potongan_tara_kg: tara,
        harga_per_kg: hrgBeli,
        total_harga: subtotal,
        nama_petani: bal.nama_petani || txInfo?.nama_petani || 'Petani Kemitraan',
        no_kupon: txInfo?.no_kupon || '-',
      };`;

const returnCodeNew = `      return {
        ...bal,
        originalIndex,
        berat_bruto_kg: bruto,
        potongan_tara_kg: tara,
        harga_per_kg: hrgBeli,
        total_harga: subtotal,
        nama_petani: bal.nama_petani || txInfo?.nama_petani || 'Petani Kemitraan',
        no_kupon: txInfo?.no_kupon || '-',
        potongan: txInfo?.potongan || 0,
        status_pembayaran: txInfo?.status_pembayaran || 'belum_lunas',
      };`;
code = code.replace(returnCodeOld, returnCodeNew);

fs.writeFileSync(file, code);

const fs = require('fs');
const file = 'src/components/laporan/LaporanBalView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetHeaders = `    const headers = [
      'No',
      'No Bal',
      'Kode Pembeli',
      'Tanggal Masuk',
      'Grade',
      'Nama Petani',
      'No Kupon',
      'Lokasi Gudang',
      'Berat Bruto (kg)',
      'Potongan Tara (kg)',
      'Berat Netto (kg)',
      'Harga Beli per kg (Rp)',
      'Total Harga Beli (Rp)',
      'Status Stok',
      'Catatan',
    ];`;
const newHeaders = `    const headers = [
      'NO',
      'TANGGAL',
      'NO BAL',
      'PETANI',
      'BERAT',
      'HARGA',
      'STATUS',
      'POTONGAN',
      'STATUS (DIGUDANG/TERKIRIM)'
    ];`;

code = code.replace(targetHeaders, newHeaders);

const targetRows = `    const rows = sortedData.map((b, idx) => [
      idx + 1,
      b.no_bal || '-',
      b.kode_bal_pembeli || '-',
      b.tanggal_masuk ? b.tanggal_masuk.split('T')[0] : '-',
      b.kode_grade || '-',
      b.nama_petani || '-',
      b.no_kupon || '-',
      b.lokasi_gudang || '-',
      (b.berat_bruto_kg || 0).toFixed(1),
      (b.potongan_tara_kg || 0).toFixed(1),
      (b.berat_kg || 0).toFixed(1),
      b.harga_per_kg || 0,
      b.total_harga || 0,
      b.status_stok || '-',
      b.catatan || '',
    ]);`;
const newRows = `    const rows = sortedData.map((b, idx) => [
      idx + 1,
      b.tanggal_masuk ? b.tanggal_masuk.split('T')[0] : '-',
      b.no_bal || '-',
      b.nama_petani || '-',
      (b.berat_kg || 0).toFixed(1),
      b.total_harga || 0,
      b.status_pembayaran === 'lunas' ? 'LUNAS' : 'KASBON / BELUM LUNAS',
      b.potongan || 0,
      b.status_stok === 'di_gudang' ? 'DIGUDANG' : b.status_stok === 'keluar' ? 'TERKIRIM' : (b.status_stok || '').toUpperCase()
    ]);`;

code = code.replace(targetRows, newRows);

fs.writeFileSync(file, code);

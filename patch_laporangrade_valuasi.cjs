const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetLogic = `    // Total active bal in warehouse
    const activeBal = barangList.filter((b) => b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim');`;

const newLogic = `    // Find which pengirimans are NOT completed (still loading/in transit)
    const activePengirimanIds = new Set(
      pengirimanList
        .filter(p => p.status !== 'diterima' && p.status !== 'dikirim')
        .map(p => p.pengiriman_id)
    );

    // Total active bal in warehouse + in transit
    const activeBal = barangList.filter((b) => {
      if (b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim') return true;
      if (b.status_stok === 'keluar' && b.pengiriman_id && activePengirimanIds.has(b.pengiriman_id)) return true;
      return false;
    });`;

code = code.replace(targetLogic, newLogic);
fs.writeFileSync(file, code);
console.log('Patched valuasi in LaporanGradeView.tsx');

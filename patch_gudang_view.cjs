const fs = require('fs');
let file = 'src/components/laporan/LaporanGudangView.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /const outBales = allAssignedBales\.filter\(\(b\) => b\.status_stok === 'keluar' \|\| b\.status_stok === 'terkirim_sample'\);[\s\S]*?const currentOccupiedBal = activeBales\.length \+ readyBales\.length;[\s\S]*?const currentKg = activeBales\.reduce\(\(acc, b\) => acc \+ \(b\.berat_kg \|\| 0\), 0\) \+[\s\S]*?readyBales\.reduce\(\(acc, b\) => acc \+ \(b\.berat_kg \|\| 0\), 0\);/g;

const replacement = `// Active Pengiriman mapping
      const activePengirimanIds = new Set(
        pengirimanList.filter(p => p.status !== 'diterima' && p.status !== 'selesai').map(p => p.pengiriman_id)
      );

      // A bale is considered in warehouse if it's literally there, OR if it's on a truck (keluar) but the DO is not yet selesai, OR if it's in lab (terkirim_sample).
      const actuallyInWarehouseBales = allAssignedBales.filter(b => {
        if (b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim' || b.status_stok === 'terkirim_sample') return true;
        if (b.status_stok === 'keluar' && b.pengiriman_id && activePengirimanIds.has(b.pengiriman_id)) return true;
        return false;
      });

      const outBales = allAssignedBales.filter((b) => !actuallyInWarehouseBales.includes(b));
      
      const totalMasukBal = allAssignedBales.length;
      const currentOccupiedBal = actuallyInWarehouseBales.length;
      
      const currentKg = actuallyInWarehouseBales.reduce((acc, b) => acc + (b.berat_kg || 0), 0);`;

code = code.replace(regex, replacement);

fs.writeFileSync(file, code);
console.log('Patched LaporanGudangView!');

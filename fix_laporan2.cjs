const fs = require('fs');
let code = fs.readFileSync('src/components/laporan/LaporanGudangView.tsx', 'utf8');

code = code.replace(
  /const \[\] = new Set\(\s+\[\]\.filter\(p => p\.status !== 'diterima' && p\.status !== 'selesai'\)\.map\(p => p\.pengiriman_id\)\s+\);/g,
  `const activePengirimanIds = new Set(
        (window as any).pengirimanList?.filter((p: any) => p.status !== 'diterima' && p.status !== 'selesai').map((p: any) => p.pengiriman_id) || []
      );`
);

code = code.replace(
  /if \(b\.status_stok === 'keluar' && b\.pengiriman_id && \[\]\.has\(b\.pengiriman_id\)\)/g,
  `if (b.status_stok === 'keluar' && b.pengiriman_id && activePengirimanIds.has(b.pengiriman_id))`
);

code = code.replace(
  /const isActive = doId \? \[\]\.has\(doId\) : false;/g,
  `const isActive = doId ? activePengirimanIds.has(doId) : false;`
);

fs.writeFileSync('src/components/laporan/LaporanGudangView.tsx', code);

const fs = require('fs');

const updateValuasi = (file) => {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(
      /if \(b\.status_stok === 'di_gudang' \|\| b\.status_stok === 'siap_kirim'\) return true;/g,
      "if (b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim' || b.status_stok === 'terkirim_sample') return true;"
    );
    fs.writeFileSync(file, code);
};

updateValuasi('src/components/laporan/DashboardAnalyticView.tsx');
updateValuasi('src/components/laporan/LaporanGradeView.tsx');
console.log('Patched valuasi for terkirim_sample!');

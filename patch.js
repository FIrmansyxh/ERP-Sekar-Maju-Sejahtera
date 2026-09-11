const fs = require('fs');

function patchLaporanGradeView() {
    let content = fs.readFileSync('src/components/laporan/LaporanGradeView.tsx', 'utf8');
    content = content.replace(/ &&\n\s*!\(item\.keterangan \|\| ''\)\.toLowerCase\(\)\.includes\(q\)/, '');
    content = content.replace(/const headers = \['Kode', 'Harga Jual \(Rp\)', 'Tanggal Berlaku', 'Status', 'Keterangan'\];/, "const headers = ['Kode', 'Harga Jual (Rp)', 'Tanggal Berlaku', 'Status'];");
    content = content.replace(/\s*h\.keterangan \|\| '-',/, '');
    fs.writeFileSync('src/components/laporan/LaporanGradeView.tsx', content);
}
patchLaporanGradeView();

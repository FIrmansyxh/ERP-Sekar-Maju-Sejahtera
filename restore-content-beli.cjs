const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Find the end of contentJual
const returnRegex = /\n  return \(\n    <div className="space-y-4 font-sans text-gray-800 pb-10">/;
const match = code.match(returnRegex);

if (!match) throw new Error("Could not find return");

let contentJualStr = code.substring(
  code.indexOf('const contentJual = ('),
  match.index
);

let newContentBeli = contentJualStr
  .replace('const contentJual =', 'const contentBeli =')
  .replace(/Laporan Stok & Analisis Harga Jual/g, 'Laporan Stok & Analisis Mutu Grade (Harga Beli)')
  .replace(/handleExportJualCSV/g, 'handleDownloadCsv')
  .replace(/handleExportJualPDF/g, 'handleDownloadPdf')
  .replace(/isGeneratingJualPdf/g, 'isGeneratingPdf')
  .replace(/overallSummaryJual\.totalJualCount/g, 'overallSummary.totalGradeCount')
  .replace(/overallSummaryJual\.totalStokBal/g, 'overallSummary.totalStokBal')
  .replace(/overallSummaryJual\.totalStokKg/g, 'overallSummary.totalStokKg')
  .replace(/overallSummaryJual\.totalValuasi/g, 'overallSummary.totalValuasi')
  .replace(/overallSummaryJual\.totalDoKg/g, 'overallSummary.totalIntakeKg') // Not perfectly accurate but enough
  .replace(/overallSummaryJual\.dominantKode/g, 'overallSummary.dominantGrade')
  .replace(/overallSummaryJual\.dominantPorsi/g, 'overallSummary.dominantPorsi')
  .replace(/Total Kode Harga Jual/g, 'Total Mutu Grade Aktif')
  .replace(/Kode Harga/g, 'Tingkatan Grade')
  .replace(/Kode Dominan:/g, 'Grade Dominan:')
  .replace(/Kode /g, 'Grade ')
  .replace(/hargaJualMetrics/g, 'gradeMetrics')
  .replace(/selectedHargaJualCode/g, 'selectedGradeCode')
  .replace(/setSelectedHargaJualCode/g, 'setSelectedGradeCode')
  .replace(/item\.kode/g, 'item.code')
  .replace(/m\.kode/g, 'm.code')
  .replace(/item\.keterangan/g, 'item.name')
  .replace(/item\.status_aktif \? 'Aktif' : 'Non-Aktif'/g, 'item.ketentuan')
  .replace(/item\.harga_jual/g, 'item.price')
  .replace(/Keterangan & Status/g, 'Nama Mutu & Kualitas')
  .replace(/Harga Jual/g, 'Tarif Acuan')
  .replace(/onNavigateToHargaJual/g, 'onNavigateToHarga')
  .replace(/Kelola Master Harga Jual/g, 'Kelola Master Harga & Grade');

// We need to restore totalDoKg since I replaced both Intake and DO with totalDoKg in Jual.
newContentBeli = newContentBeli.replace(
  /<span className="font-semibold text-gray-800">\{overallSummary\.totalIntakeKg\.toLocaleString\('id-ID'\)\} kg<\/span>\s*<\/div>\s*<\/div>\s*<div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">/g,
  `<span className="font-semibold text-gray-800">{overallSummary.totalIntakeKg.toLocaleString('id-ID')} kg</span>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-xs relative overflow-hidden">`
).replace(
  /<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">\s*Total Keluar \(Kg\)\s*<\/span>\s*<span className="p-1\.5 bg-purple-50 text-purple-600 rounded-sm">\s*<PackageOpen className="w-4 h-4" \/>\s*<\/span>\s*<\/div>\s*<div className="text-xl font-bold text-gray-900 mt-2">\s*\{overallSummary\.totalIntakeKg\.toLocaleString\('id-ID'\)\} <span className="text-xs font-normal text-gray-500">kg<\/span>/,
  `<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total DO Pengiriman (Kg)
            </span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-sm">
              <PackageOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            {overallSummary.totalDoKg.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500">kg</span>`
);

code = code.slice(0, match.index) + "\n" + newContentBeli + "\n" + code.slice(match.index);

fs.writeFileSync(file, code);

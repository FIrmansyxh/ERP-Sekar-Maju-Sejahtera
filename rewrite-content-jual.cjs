const fs = require('fs');

const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. We need to add `hargaJualMetrics` and `overallSummaryJual` after `overallSummary`
const metricsRegex = /const overallSummary = useMemo\(\(\) => \{[\s\S]*?\}\);/m;
const match = code.match(metricsRegex);
if (!match) throw new Error("Could not find overallSummary");

const insertionIndex = match.index + match[0].length;

const addedCode = `
  const [selectedHargaJualCode, setSelectedHargaJualCode] = useState<string>('ALL');

  const hargaJualMetrics = useMemo(() => {
    const activeBal = barangList.filter((b) => b.status_stok === 'di_gudang' || b.status_stok === 'siap_kirim');
    const totalActiveBalCount = activeBal.length || 1;
    const totalActiveBalKg = activeBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0) || 1;

    const metrics = filteredHargaJualList.map((hj, idx) => {
      const color = getGradePalette(idx);

      const inGudangBal = activeBal.filter((b) => (b.kode_harga_jual || '').toUpperCase() === hj.kode.toUpperCase());
      const stokBal = inGudangBal.length;
      const stokKg = inGudangBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
      const persenStokBal = (stokBal / totalActiveBalCount) * 100;
      const persenStokKg = (stokKg / totalActiveBalKg) * 100;
      const valuasiRupiah = stokKg * hj.harga_jual;

      let intakeBal = 0;
      let intakeKg = 0;
      let intakeNilai = 0;

      // DO / Outbound
      let doBal = 0;
      let doKg = 0;
      pengirimanList.forEach((p) => {
        const shippedBal = barangList.filter(
          (b) => b.pengiriman_id === p.pengiriman_id && (b.kode_harga_jual || '').toUpperCase() === hj.kode.toUpperCase()
        );
        if (shippedBal.length > 0) {
          doBal += shippedBal.length;
          doKg += shippedBal.reduce((sum, b) => sum + (b.berat_kg || 0), 0);
        }
      });

      // QC
      const totalSampleCount = 0;
      const approvedSampleCount = 0;

      return {
        ...hj,
        color,
        index: idx,
        stokBal,
        stokKg,
        persenStokBal,
        persenStokKg,
        valuasiRupiah,
        intakeBal,
        intakeKg,
        intakeNilai,
        doBal,
        doKg,
        totalSampleCount,
        approvedSampleCount,
      };
    });

    return metrics.sort((a, b) => b.stokBal - a.stokBal);
  }, [filteredHargaJualList, barangList, pengirimanList]);

  const overallSummaryJual = useMemo(() => {
    const totalStokBal = hargaJualMetrics.reduce((sum, m) => sum + m.stokBal, 0);
    const totalStokKg = hargaJualMetrics.reduce((sum, m) => sum + m.stokKg, 0);
    const totalValuasi = hargaJualMetrics.reduce((sum, m) => sum + m.valuasiRupiah, 0);
    const totalDoKg = hargaJualMetrics.reduce((sum, m) => sum + m.doKg, 0);

    const dominant = hargaJualMetrics.length > 0 && hargaJualMetrics[0].stokBal > 0 
      ? hargaJualMetrics[0] 
      : null;

    return {
      totalJualCount: filteredHargaJualList.length,
      totalStokBal,
      totalStokKg,
      totalValuasi,
      totalDoKg,
      dominantKode: dominant?.kode || '-',
      dominantPorsi: dominant ? dominant.persenStokBal : 0,
    };
  }, [hargaJualMetrics, filteredHargaJualList]);
`;

code = code.slice(0, insertionIndex) + addedCode + code.slice(insertionIndex);

// Replace contentJual
const contentJualRegex = /const contentJual = \([\s\S]*?(?=\n  const contentBeli = \()/;
const contentBeliRegex = /(const contentBeli = \([\s\S]*?(?=\n  return \())/;

const matchBeli = code.match(contentBeliRegex);
if (!matchBeli) throw new Error("Could not find contentBeli");

let newContentJual = matchBeli[1]
  .replace('const contentBeli =', 'const contentJual =')
  .replace(/Laporan Stok & Analisis Mutu Grade \(Harga Beli\)/g, 'Laporan Stok & Analisis Harga Jual')
  .replace(/handleDownloadCsv/g, 'handleExportJualCSV')
  .replace(/handleDownloadPdf/g, 'handleExportJualPDF')
  .replace(/isGeneratingPdf/g, 'isGeneratingJualPdf')
  .replace(/overallSummary\.totalGradeCount/g, 'overallSummaryJual.totalJualCount')
  .replace(/overallSummary\.totalStokBal/g, 'overallSummaryJual.totalStokBal')
  .replace(/overallSummary\.totalStokKg/g, 'overallSummaryJual.totalStokKg')
  .replace(/overallSummary\.totalValuasi/g, 'overallSummaryJual.totalValuasi')
  .replace(/overallSummary\.totalIntakeKg/g, 'overallSummaryJual.totalDoKg')
  .replace(/overallSummary\.totalDoKg/g, 'overallSummaryJual.totalDoKg')
  .replace(/overallSummary\.dominantGrade/g, 'overallSummaryJual.dominantKode')
  .replace(/overallSummary\.dominantPorsi/g, 'overallSummaryJual.dominantPorsi')
  .replace(/Total Mutu Grade Aktif/g, 'Total Kode Harga Jual')
  .replace(/Tingkatan Grade/g, 'Kode Harga')
  .replace(/Grade Dominan:/g, 'Kode Dominan:')
  .replace(/Grade /g, 'Kode ')
  .replace(/gradeMetrics/g, 'hargaJualMetrics')
  .replace(/selectedGradeCode/g, 'selectedHargaJualCode')
  .replace(/setSelectedGradeCode/g, 'setSelectedHargaJualCode')
  .replace(/item\.code/g, 'item.kode')
  .replace(/m\.code/g, 'm.kode')
  .replace(/item\.name/g, 'item.keterangan')
  .replace(/item\.ketentuan/g, "item.status_aktif ? 'Aktif' : 'Non-Aktif'")
  .replace(/item\.price/g, 'item.harga_jual')
  .replace(/Nama Mutu & Kualitas/g, 'Keterangan & Status')
  .replace(/Tarif Acuan/g, 'Harga Jual')
  .replace(/Total Intake Pembelian \(Kg\)/g, 'Total Keluar \(Kg\)')
  .replace(/Total DO Pengiriman \(Kg\)/g, 'Total Keluar \(Kg\)');

// Remove references to `onNavigateToHarga` in Jual
newContentJual = newContentJual.replace(
  /\{onNavigateToHarga && \([\s\S]*?\}\)/g, 
  `{onNavigateToHargaJual && (
    <button
      onClick={onNavigateToHargaJual}
      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-sm transition flex items-center space-x-1 cursor-pointer"
    >
      <Tag className="w-3 h-3 text-[#b81d24]" />
      <span>Kelola Master Harga Jual</span>
    </button>
  )}`
);

code = code.replace(contentJualRegex, newContentJual + "\n");
fs.writeFileSync(file, code);


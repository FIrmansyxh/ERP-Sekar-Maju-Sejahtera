const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

// I need to find where the injected code starts and ends, and move it below `filteredBalList`
const injectedStart = "  const [selectedHargaJualCode, setSelectedHargaJualCode] = useState<string>('ALL');";
const injectedEndStr = "  }, [hargaJualMetrics, filteredHargaJualList]);";

const startIndex = code.indexOf(injectedStart);
const endIndex = code.indexOf(injectedEndStr, startIndex) + injectedEndStr.length;

const injectedCode = code.substring(startIndex, endIndex);

// Remove the injected code from its current position
code = code.substring(0, startIndex) + code.substring(endIndex);

// Find the end of filteredBalList
const endOfFilteredBal = "  }, [barangList, selectedGradeCode, filterGudang, filterStatusStok, searchBalQuery]);";
const insertAt = code.indexOf(endOfFilteredBal) + endOfFilteredBal.length;

// Insert the injected code AFTER filteredBalList
code = code.substring(0, insertAt) + "\n" + injectedCode + "\n" + code.substring(insertAt);

fs.writeFileSync(file, code);

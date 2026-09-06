const fs = require('fs');
const file = 'src/components/transaksi/TimbanganPageView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const sortedPending = transaksiList\.filter\(\(t\) => \(t\.items \|\| \[\]\)\.length > 0\)\.sort\(\(a, b\) => b\.no_kupon\.localeCompare\(a\.no_kupon\)\);\s+const firstPending = sortedPending\.find\(\(t\) => \(t\.items \|\| \[\]\)\.some\(\(it\) => \(it\.berat_kg \|\| 0\) <= 0\)\);\s+return firstPending\?\.transaksi_id \|\| sortedPending\[0\]\?\.transaksi_id \|\| '';/,
  `return '';`
);

fs.writeFileSync(file, code);

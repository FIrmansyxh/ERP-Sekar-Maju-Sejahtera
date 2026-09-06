const fs = require('fs');
const file = 'src/components/transaksi/TimbanganPageView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Sort pendingOrRecentTxList by no_kupon descending
code = code.replace(
  /const pendingOrRecentTxList = useMemo\(\(\) => \{([\s\S]*?)return transaksiList\.filter\(\(t\) => \(t\.items \|\| \[\]\)\.length > 0\);([\s\S]*?)\}, \[transaksiList\]\);/,
  `const pendingOrRecentTxList = useMemo(() => {
    const filtered = transaksiList.filter((t) => (t.items || []).length > 0);
    return filtered.sort((a, b) => b.no_kupon.localeCompare(a.no_kupon));
  }, [transaksiList]);`
);

// Update default selectedTxId logic to pick the first item of the sorted list
code = code.replace(
  /const firstPending = transaksiList\.find\(\(t\) => \(t\.items \|\| \[\]\)\.some\(\(it\) => \(it\.berat_kg \|\| 0\) <= 0\)\);\s+return firstPending\?\.transaksi_id \|\| transaksiList\[0\]\?\.transaksi_id \|\| '';/,
  `const sortedPending = transaksiList.filter((t) => (t.items || []).length > 0).sort((a, b) => b.no_kupon.localeCompare(a.no_kupon));
    const firstPending = sortedPending.find((t) => (t.items || []).some((it) => (it.berat_kg || 0) <= 0));
    return firstPending?.transaksi_id || sortedPending[0]?.transaksi_id || '';`
);

fs.writeFileSync(file, code);

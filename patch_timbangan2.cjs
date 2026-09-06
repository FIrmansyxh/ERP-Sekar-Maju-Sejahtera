const fs = require('fs');
const file = 'src/components/transaksi/TimbanganPageView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetContent = `            <div className="relative">
              <input
                type="text"
                list="kupon-list"
                value={kuponInput}
                onChange={(e) => {
                  const val = formatNoKupon(e.target.value);
                  setKuponInput(val);
                  
                  // Auto-select if matches a no_kupon
                  const matchedTx = pendingOrRecentTxList.find(t => t.no_kupon.toLowerCase() === val.toLowerCase());
                  if (matchedTx) {
                    handleManualChangeKupon(matchedTx.transaksi_id);
                  }
                }}
                onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                     lookupBal(kuponInput, false); // If they type a bal instead of kupon here, try to look it up!
                   }
                }}
                placeholder="Ketik No. Kupon / Ketik No Bal / Pilih dari daftar..."
                className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 uppercase"
              />
              <datalist id="kupon-list">
                {pendingOrRecentTxList.map((tx) => {
                  const items = tx.items || [];
                  const weighed = items.filter((i) => (i.berat_kg || 0) > 0).length;
                  const isComplete = items.length > 0 && weighed === items.length;
                  return (
                    <option key={tx.transaksi_id} value={tx.no_kupon}>
                      {isComplete ? '✓ [LENGKAP]' : '⏳ [PROSES]'} {tx.nama_petani} ({weighed}/{items.length} Bal)
                    </option>
                  );
                })}
              </datalist>
            </div>`;

const newContent = `            <div className="relative">
              <select
                value={selectedTxId}
                onChange={(e) => {
                  handleManualChangeKupon(e.target.value);
                }}
                className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              >
                {pendingOrRecentTxList.map((tx) => {
                  const items = tx.items || [];
                  const weighed = items.filter((i) => (i.berat_kg || 0) > 0).length;
                  const isComplete = items.length > 0 && weighed === items.length;
                  return (
                    <option key={tx.transaksi_id} value={tx.transaksi_id}>
                      {tx.no_kupon} - {isComplete ? '✓ [LENGKAP]' : '⏳ [PROSES]'} {tx.nama_petani} ({weighed}/{items.length} Bal)
                    </option>
                  );
                })}
              </select>
            </div>`;

code = code.replace(targetContent, newContent);
fs.writeFileSync(file, code);

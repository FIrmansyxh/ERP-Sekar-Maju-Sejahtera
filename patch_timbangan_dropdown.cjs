const fs = require('fs');
const file = 'src/components/transaksi/TimbanganPageView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetState = "const [kuponInput, setKuponInput] = useState<string>('');";
const newState = "const [kuponInput, setKuponInput] = useState<string>('');\n  const [showKuponDropdown, setShowKuponDropdown] = useState(false);";

code = code.replace(targetState, newState);

const targetSelect = `            <div className="relative">
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

const newSelect = `            <div className="relative">
              <input
                type="text"
                placeholder="Ketik min. 3 karakter No. Kupon..."
                value={kuponInput}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setKuponInput(val);
                  setShowKuponDropdown(val.length >= 3);
                }}
                onFocus={() => {
                  if (kuponInput.length >= 3) setShowKuponDropdown(true);
                }}
                onBlur={() => {
                  // Small delay to allow click on dropdown to register
                  setTimeout(() => setShowKuponDropdown(false), 200);
                }}
                className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              />
              
              {showKuponDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-sm shadow-lg overflow-y-auto max-h-60 z-50">
                  {pendingOrRecentTxList
                    .filter((tx) => tx.no_kupon.includes(kuponInput))
                    .map((tx) => {
                      const items = tx.items || [];
                      const weighed = items.filter((i) => (i.berat_kg || 0) > 0).length;
                      const isComplete = items.length > 0 && weighed === items.length;
                      return (
                        <div
                          key={tx.transaksi_id}
                          onClick={() => {
                            handleManualChangeKupon(tx.transaksi_id);
                            setKuponInput(tx.no_kupon);
                            setShowKuponDropdown(false);
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <strong className="text-slate-800 font-mono text-xs">{tx.no_kupon}</strong>
                            <span className="text-[10px] text-slate-500 font-medium">{isComplete ? '✓ LENGKAP' : '⏳ PROSES'}</span>
                          </div>
                          <div className="text-[10px] text-slate-600">
                            {tx.nama_petani} • {weighed}/{items.length} Bal ditimbang
                          </div>
                        </div>
                      );
                    })}
                    {pendingOrRecentTxList.filter((tx) => tx.no_kupon.includes(kuponInput)).length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500 text-center">Tidak ada kupon ditemukan</div>
                    )}
                </div>
              )}
            </div>`;

code = code.replace(targetSelect, newSelect);

fs.writeFileSync(file, code);

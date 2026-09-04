import re

with open('src/components/transaksi/TimbanganPageView.tsx', 'r') as f:
    content = f.read()

state_pattern = r"(const \[selectedTxId, setSelectedTxId\] = useState<string>\(initialTxId\);)"
replacement = r"""\1
  const [kuponInput, setKuponInput] = useState<string>('');
  
  // Sync kuponInput when selectedTxId changes from elsewhere
  useEffect(() => {
    const tx = transaksiList.find(t => t.transaksi_id === selectedTxId);
    if (tx) setKuponInput(tx.no_kupon);
  }, [selectedTxId, transaksiList]);
"""

if "const [kuponInput, setKuponInput]" not in content:
    content = re.sub(state_pattern, replacement, content)

select_pattern = r"(<select[\s\S]*?</select>)"

replacement_input = r"""<div className="relative">
              <input
                type="text"
                list="kupon-list"
                value={kuponInput}
                onChange={(e) => {
                  const val = e.target.value;
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
                placeholder="Ketik No. Kupon / Pilih dari daftar..."
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
            </div>"""

content = re.sub(select_pattern, replacement_input, content, count=1)

with open('src/components/transaksi/TimbanganPageView.tsx', 'w') as f:
    f.write(content)

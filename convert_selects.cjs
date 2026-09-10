const fs = require('fs');

function replaceFile(path, replacements) {
  let code = fs.readFileSync(path, 'utf8');
  let changed = false;
  
  if (!code.includes("SearchableSelect")) {
    const importMatch = code.match(/import\s+\{.*\}\s+from\s+'lucide-react';/);
    if (importMatch) {
      code = code.replace(importMatch[0], `${importMatch[0]}\nimport { SearchableSelect } from '../common/SearchableSelect';`);
      changed = true;
    }
  }

  for (let r of replacements) {
    if (code.includes(r.find)) {
      code = code.replace(r.find, r.replace);
      changed = true;
    } else {
      console.log(`Could not find in ${path}:\n${r.find.substring(0, 50)}...`);
    }
  }

  if (changed) {
    fs.writeFileSync(path, code);
    console.log(`Patched ${path}`);
  }
}

// 1. Proses2TimbangModal
replaceFile('src/components/transaksi/Proses2TimbangModal.tsx', [
  {
    find: `<select
                    value={selectedTxId}
                    onChange={(e) => handleSelectTransaction(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-emerald-600"
                  >
                    {transaksiList.map((tx) => {
                      const isDone = (tx.items || []).every((it) => (it.berat_kg || 0) > 0) && (tx.items?.length || 0) > 0;
                      return (
                        <option key={tx.transaksi_id} value={tx.transaksi_id}>
                          {tx.no_kupon || 'KUP?'} • {tx.nama_petani} ({tx.total_bal || tx.items?.length || 1} Bal) - {isDone ? '✓ Selesai Ditimbang' : '⏳ Menunggu Timbang'}
                        </option>
                      );
                    })}
                  </select>`,
    replace: `<SearchableSelect
                    value={selectedTxId}
                    onChange={(val) => handleSelectTransaction(val)}
                    options={transaksiList.map(tx => {
                      const isDone = (tx.items || []).every((it) => (it.berat_kg || 0) > 0) && (tx.items?.length || 0) > 0;
                      return { value: tx.transaksi_id, label: \`\${tx.no_kupon || 'KUP?'} • \${tx.nama_petani} (\${tx.total_bal || tx.items?.length || 1} Bal) - \${isDone ? '✓ Selesai Ditimbang' : '⏳ Menunggu Timbang'}\` };
                    })}
                    placeholder="Pilih Transaksi..."
                  />`
  },
  {
    find: `<select
                      value={lokasiBlokInput}
                      onChange={(e) => setLokasiBlokInput(e.target.value)}
                      disabled={(activeBalItem.berat_kg || 0) > 0}
                      className={\`w-full border rounded-sm px-3 py-2 text-xs font-bold \${
                        (activeBalItem.berat_kg || 0) > 0
                          ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                          : 'bg-white text-gray-900 border-gray-300 focus:outline-none focus:border-emerald-600'
                      }\`}
                      required
                    >
                      {BLOK_GUDANG_OPTIONS.map((blok) => (
                        <option key={blok} value={blok}>
                          {blok}
                        </option>
                      ))}
                    </select>`,
    replace: `<SearchableSelect
                      value={lokasiBlokInput}
                      onChange={(val) => setLokasiBlokInput(val)}
                      options={BLOK_GUDANG_OPTIONS.map(b => ({ value: b, label: b }))}
                      placeholder="Pilih Blok Gudang"
                      className={(activeBalItem.berat_kg || 0) > 0 ? 'opacity-60 pointer-events-none' : ''}
                    />`
  }
]);


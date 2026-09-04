import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# 1. Update initial noKupon state
content = content.replace(
    "const [noKupon, setNoKupon] = useState(`KUP-${Math.floor(100 + Math.random() * 900)}`);",
    """const [noKupon, setNoKupon] = useState(() => {
    let maxNum = 0;
    transaksiList.forEach(tx => {
      const match = tx.no_kupon.match(/\\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return maxNum === 0 ? '1' : (maxNum + 1).toString();
  });"""
)

# 2. Add validation boolean
content = content.replace(
    "const [isScanBukaModal, setIsScanBukaModal] = useState<boolean>(false);",
    """const [isScanBukaModal, setIsScanBukaModal] = useState<boolean>(false);
  
  const isKuponExists = transaksiList.some(tx => tx.no_kupon.toLowerCase() === noKupon.toLowerCase());"""
)

# 3. Add warning to UI
input_orig = """<input
                type="text"
                value={noKupon}
                onChange={(e) => setNoKupon(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-sm px-3 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                placeholder="Contoh: 11 / KUP-001"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Sesuai kupon antrian fisik</p>"""

input_repl = """<input
                type="text"
                value={noKupon}
                onChange={(e) => setNoKupon(e.target.value)}
                className={`w-full bg-white border rounded-sm px-3 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:ring-1 ${isKuponExists ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600' : 'border-slate-300 focus:border-slate-800 focus:ring-slate-800'}`}
                placeholder="Contoh: 11 / KUP-001"
                required
              />
              {isKuponExists ? (
                <p className="text-[10px] text-rose-600 font-semibold mt-1">⚠️ Kupon sudah digunakan</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">Sesuai kupon antrian fisik</p>
              )}"""

content = content.replace(input_orig, input_repl)

# 4. In `handleSaveSortirData`, reset kupon to the newly computed max + 1
save_orig = "setNoKupon(`KUP-${Math.floor(100 + Math.random() * 900)}`);"
save_repl = """
      let maxNum = 0;
      transaksiList.forEach(tx => {
        const match = tx.no_kupon.match(/\\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const currentMatch = currentNoKupon.match(/\\d+/);
      if (currentMatch) {
         const currentNum = parseInt(currentMatch[0], 10);
         if (currentNum > maxNum) maxNum = currentNum;
      }
      setNoKupon((maxNum + 1).toString());"""

content = content.replace(save_orig, save_repl)

# 5. Remove "Simpan & Buka Meja Timbang" button
btn_pattern = r"(<button\s*type=\"button\"\s*onClick=\{\(\) => handleSaveSortirData\(true\)\}\s*disabled=\{balItems\.length === 0\}\s*className=\"flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-sm transition flex items-center justify-center space-x-1\.5 cursor-pointer disabled:opacity-50 shadow-2xs\"\s*>\s*<span>Simpan & Buka Meja Timbang</span>\s*<ArrowRight className=\"w-4 h-4\" />\s*</button>)"
content = re.sub(btn_pattern, "", content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

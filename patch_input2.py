import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

input_pattern = r"""<input\s*type="text"\s*value=\{petugasSortirNama\}\s*onChange=\{\(e\)\s*=>\s*setPetugasSortirNama\(e\.target\.value\)\}\s*className="w-full bg-white border border-slate-300 rounded-sm px-2\.5 py-1\.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"\s*placeholder="Nama petugas\.\.\."\s*\/>"""
new_input = """<input
                type="text"
                value={petugasSortirNama}
                readOnly
                disabled
                className="w-full bg-slate-50 border border-slate-200 rounded-sm px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed"
              />"""
content = re.sub(input_pattern, new_input, content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)
print("Patched Input in SortirPageView")

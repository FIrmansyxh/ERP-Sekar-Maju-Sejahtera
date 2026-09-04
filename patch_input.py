import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

input_pattern = r"""<input\s*type="text"\s*value=\{petugasSortirNama\}\s*onChange=\{\(e\)\s*=>\s*setPetugasSortirNama\(e\.target\.value\)\}\s*className="w-full bg-white border border-gray-300 rounded-sm px-2\.5 py-1\.5 text-xs text-gray-900 focus:outline-none focus:border-\[\#b81d24\]"\s*placeholder="Nama petugas\.\.\."\s*\/>"""
new_input = """<input
                  type="text"
                  value={petugasSortirNama}
                  readOnly
                  disabled
                  className="w-full bg-gray-50 border border-gray-200 rounded-sm px-2.5 py-1.5 text-xs text-gray-500 cursor-not-allowed"
                />"""
content = re.sub(input_pattern, new_input, content)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)
print("Patched Input")

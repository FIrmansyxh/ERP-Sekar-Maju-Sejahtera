import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

# Add validation inside handleSubmit
handle_submit_pattern = r"(const handleSubmit = \(e: React\.FormEvent\) => \{[\s\S]*?)(setIsConfirmOpen\(true\);\s*\};)"

validation_code = """
    // Check for duplicates
    const duplicateBals: string[] = [];
    const localSet = new Set<string>();
    
    for (const item of balItems) {
      const code = item.noBal.trim().toUpperCase();
      if (!code) continue;
      
      const isDuplicateMaster = barangList.some(b => b.no_bal.toUpperCase() === code);
      if (isDuplicateMaster || localSet.has(code)) {
        duplicateBals.push(code);
      }
      localSet.add(code);
    }

    if (duplicateBals.length > 0) {
      alert(`Nomor Bal berikut sudah dipakai (ada di master data Gudang atau ganda di form ini):\\n- ${duplicateBals.join(', ')}\\n\\nSilakan ganti nomor bal tersebut sebelum melanjutkan!`);
      return;
    }

    """

content = re.sub(handle_submit_pattern, r"\1" + validation_code + r"\2", content, count=1)

# Add visual validation on the input
input_pattern = r"""<input\s*type="text"\s*value=\{item\.barcode\}\s*onChange=\{\(e\) => \{\s*handleUpdateItem\(item\.id, 'barcode', e\.target\.value\);\s*handleUpdateItem\(item\.id, 'noBal', e\.target\.value\);\s*\}\}\s*className="w-full bg-white border border-gray-300 rounded-sm px-2\.5 py-1 font-mono font-bold text-gray-900 text-xs focus:outline-none focus:border-\[\#b81d24\]"\s*placeholder="Contoh: A0001"\s*required\s*\/>"""

new_input = """{(() => {
                                const code = item.barcode.trim().toUpperCase();
                                const isDupMaster = code ? barangList.some(b => b.no_bal.toUpperCase() === code) : false;
                                const isDupLocal = code ? balItems.filter(b => b.id !== item.id).some(b => b.barcode.toUpperCase() === code) : false;
                                const hasError = isDupMaster || isDupLocal;
                                return (
                                  <>
                                    <input
                                      type="text"
                                      autoComplete="off"
                                      value={item.barcode}
                                      onChange={(e) => {
                                        let val = e.target.value.toUpperCase();
                                        // Auto-remove hyphens if user types them (optional, but good UX based on user req)
                                        val = val.replace(/-/g, '');
                                        handleUpdateItem(item.id, 'barcode', val);
                                        handleUpdateItem(item.id, 'noBal', val);
                                      }}
                                      onBlur={() => {
                                        if (hasError) {
                                          alert(`Nomor Bal "${item.barcode}" sudah terpakai! Silakan ganti dengan yang lain.`);
                                        }
                                      }}
                                      className={`w-full bg-white border rounded-sm px-2.5 py-1 font-mono font-bold text-xs focus:outline-none ${hasError ? 'border-red-500 text-red-600 focus:border-red-600 bg-red-50' : 'border-gray-300 text-gray-900 focus:border-[#b81d24]'}`}
                                      placeholder="Contoh: SB0001"
                                      required
                                    />
                                    {hasError && (
                                      <p className="text-[10px] text-red-600 mt-0.5 leading-tight text-left">
                                        Sudah dipakai
                                      </p>
                                    )}
                                  </>
                                );
                              })()}"""

content = re.sub(input_pattern, new_input, content)

# Remove placeholder "Contoh: A0001" if it still exists elsewhere
content = content.replace('placeholder="Contoh: A0001"', 'placeholder="Contoh: SB0001"')

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)
print("Patched Validation")

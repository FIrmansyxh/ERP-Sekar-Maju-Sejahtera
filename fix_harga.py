import re

with open('src/components/pengiriman/PengirimanManagement.tsx', 'r') as f:
    content = f.read()

# Remove customHargaMap definition
content = re.sub(r'const \[customHargaMap, setCustomHargaMap\].*?\n', '', content)

# Remove setCustomHargaMap updates from handleUpdateBalKodeHarga
content = re.sub(r'setCustomHargaMap\(\(prev\) => \(\{\s*\.\.\.prev,\s*\[barangId\]: foundMaster\.harga_jual\s*\}\)\);\n\s*', '', content)

# Update apply bulk
content = re.sub(r'const newHargaMap = \{ \.\.\.customHargaMap \};\n', '', content)
content = re.sub(r'newHargaMap\[id\] = foundMaster\.harga_jual;\n', '', content)
content = re.sub(r'setCustomHargaMap\(newHargaMap\);\n', '', content)

# Remove handleUpdateBalPrice completely
content = re.sub(r'// Update Harga / Kg directly for a specific Bal row\n\s*const handleUpdateBalPrice = \(barangId: string, price: number\) => \{\n\s*setCustomHargaMap\(\(prev\) => \(\{ \.\.\.prev, \[barangId\]: price \}\)\);\n\s*const matchMaster = activeHargaJualList\.find\(\(h\) => h\.harga_jual === price\);\n\s*if \(matchMaster\) \{\n\s*setCustomKodeHargaMap\(\(prev\) => \(\{ \.\.\.prev, \[barangId\]: matchMaster\.kode \}\)\);\n\s*\}\n\s*\};\n', '', content)

# Update totalNilaiSuratJalan
# We can't rely on customHargaMap anymore. We need to lookup using customKodeHargaMap.
def replace_total_nilai(match):
    return """
  // Calculate total transaction value of the shipment using customKodeHargaMap
  const totalNilaiSuratJalan = useMemo(() => {
    return selectedBalObjects.reduce((sum, b) => {
      let dealPrice = b.harga_per_kg ?? 45000;
      const kode = customKodeHargaMap[b.barang_id];
      if (kode) {
        const master = activeHargaJualList.find(h => h.kode === kode);
        if (master) dealPrice = master.harga_jual;
      } else if (hargaDealMap[b.barang_id] !== undefined) {
        dealPrice = hargaDealMap[b.barang_id];
      }
      return sum + Math.round(b.berat_kg * dealPrice);
    }, 0);
  }, [selectedBalObjects, customKodeHargaMap, hargaDealMap, activeHargaJualList]);
"""
content = re.sub(r'// Calculate total transaction value of the shipment using customHargaMap.*?  \}, \[selectedBalObjects, customHargaMap, hargaDealMap\]\);', replace_total_nilai, content, flags=re.DOTALL)

# Update handleConfirmSave
def replace_handle_confirm(match):
    return """
    const finalHargaDealMap: Record<string, number> = {};
    const finalKodeHargaMap: Record<string, string> = {};
    selectedBalIds.forEach((id) => {
      if (customKodeHargaMap[id]) {
        finalKodeHargaMap[id] = customKodeHargaMap[id];
        const master = activeHargaJualList.find(h => h.kode === customKodeHargaMap[id]);
        if (master) finalHargaDealMap[id] = master.harga_jual;
      } else if (hargaDealMap[id] !== undefined) {
        finalHargaDealMap[id] = hargaDealMap[id];
      }
    });
"""
content = re.sub(r'const finalHargaDealMap: Record<string, number> = \{\};.*?finalKodeHargaMap\[id\] = customKodeHargaMap\[id\];\n\s*\}\n\s*\}\);', replace_handle_confirm, content, flags=re.DOTALL)

# Now table header updates
content = re.sub(r'<th className="p-2 text-right w-32">Harga Deal \(Rp/Kg\)</th>', '<th className="p-2 text-right w-32">Harga (Rp/Kg)</th>', content)
content = re.sub(r'<th className="p-2 text-right w-32">Harga \(Rp/Kg\)</th>', '<th className="p-2 text-right w-32">Harga (Rp/Kg)</th>', content) # no-op just to be sure

# First rendering block (Sample mode)
def replace_rendering_1(match):
    return """
                          const currentKode = customKodeHargaMap[it.barang_id] ?? it.kode_harga_jual ?? '';
                          let currentPrice = it.harga_deal_kg ?? it.harga_tawaran_kg ?? 45000;
                          if (currentKode) {
                            const master = activeHargaJualList.find(h => h.kode === currentKode);
                            if (master) currentPrice = master.harga_jual;
                          }
"""
content = re.sub(r'const currentPrice = customHargaMap\[it\.barang_id\].*?const currentKode = customKodeHargaMap\[it\.barang_id\] \?\? it\.kode_harga_jual \?\? \'\';', replace_rendering_1, content, flags=re.DOTALL)

# Second rendering block (Regular mode)
def replace_rendering_2(match):
    return """
                          const currentKode = customKodeHargaMap[bal.barang_id] ?? '';
                          let currentPrice = bal.harga_per_kg ?? 45000;
                          if (currentKode) {
                            const master = activeHargaJualList.find(h => h.kode === currentKode);
                            if (master) currentPrice = master.harga_jual;
                          }
"""
content = re.sub(r'const currentPrice = customHargaMap\[bal\.barang_id\].*?const currentKode = customKodeHargaMap\[bal\.barang_id\] \?\? \'\';', replace_rendering_2, content, flags=re.DOTALL)

# Remove input for price column in Sample mode
def replace_price_column_1(match):
    return """
                              {/* Display Harga (Rp/Kg) */}
                              <td className="p-2 text-right font-mono font-bold text-emerald-800">
                                {formatRupiah(currentPrice)}
                              </td>
"""
content = re.sub(r'\{/\* Editable Harga Penawaran / Deal \(Rp/Kg\) \*/\}.*?</td\>', replace_price_column_1, content, flags=re.DOTALL)

with open('src/components/pengiriman/PengirimanManagement.tsx', 'w') as f:
    f.write(content)

print("done")

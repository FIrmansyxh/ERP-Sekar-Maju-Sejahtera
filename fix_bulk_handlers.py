import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

handlers = """  const handleApplyBulkKodeHargaToSelected = () => {
    if (!bulkKodeHarga) return;
    const master = activeHargaJualList.find((h) => h.kode === bulkKodeHarga);
    if (!master) return;

    setSelectedBalItems((prev) => 
      prev.map((it) => ({
        ...it,
        kodeHargaJual: master.kode,
        hargaTawaranKg: master.harga_jual
      }))
    );
  };

  const handleUpdateBalKodeHarga = (barangId: string, kode: string) => {
    const master = activeHargaJualList.find((h) => h.kode === kode);
    setSelectedBalItems((prev) => 
      prev.map((it) => {
        if (it.barangId === barangId) {
          return {
            ...it,
            kodeHargaJual: kode,
            hargaTawaranKg: master ? master.harga_jual : it.hargaTawaranKg
          };
        }
        return it;
      })
    );
  };

  const handleUpdateBalOfferPrice = (barangId: string, price: number) => {
    setSelectedBalItems((prev) => 
      prev.map((it) => {
        if (it.barangId === barangId) {
          return {
            ...it,
            hargaTawaranKg: price
          };
        }
        return it;
      })
    );
  };
"""

# Insert these handlers near where bulkKodeHarga state is initialized or where handleDeselectAll is
content = re.sub(r'// Deselect all\n\s*const handleDeselectAll = \(\) => \{\n\s*setSelectedBalItems\(\[\]\);\n\s*\};\n', handlers + '\n  // Deselect all\n  const handleDeselectAll = () => {\n    setSelectedBalItems([]);\n  };\n', content)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

import re

with open('src/components/transaksi/TransaksiManagement.tsx', 'r') as f:
    content = f.read()

replacement = """<Proses1SortirModal
        isOpen={isSortirModalOpen}
        onClose={() => setIsSortirModalOpen(false)}
        petaniList={petaniList}
        hargaList={hargaList}
        gudangList={gudangList}
        barangList={barangList}
        currentUser={currentUser}
        onSaveSortir={(newTx) => { onSaveTransaksi(newTx, []); setIsSortirModalOpen(false); }}
      />"""

content = re.sub(r"<Proses1SortirModal[\s\S]*?onSaveSortir=\{[\s\S]*?\}\s*\/>", replacement, content, count=1)

with open('src/components/transaksi/TransaksiManagement.tsx', 'w') as f:
    f.write(content)
print("Patched TransaksiManagement modal call")

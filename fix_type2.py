import re

with open('src/components/transaksi/TransaksiManagement.tsx', 'r') as f:
    content = f.read()

content = re.sub(r"onSaveSortir=\{\(newTx,\s*sampleLabels\)\s*=>\s*\{[\s\S]*?onSaveTransaksi\(newTx,\s*\[\]\);\s*setIsSortirModalOpen\(false\);\s*\}\}", "onSaveSortir={(newTx) => { onSaveTransaksi(newTx, []); setIsSortirModalOpen(false); }}", content)

with open('src/components/transaksi/TransaksiManagement.tsx', 'w') as f:
    f.write(content)
print("TransaksiManagement fixed types.")

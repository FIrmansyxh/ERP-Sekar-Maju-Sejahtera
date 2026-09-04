import re
with open('src/components/transaksi/TransaksiFormModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("<span>+ Tambah 3 Bal</span>", "<span>Tambah 3 Bal</span>")

with open('src/components/transaksi/TransaksiFormModal.tsx', 'w') as f:
    f.write(content)

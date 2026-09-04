import re

with open('src/components/transaksi/TimbanganPageView.tsx', 'r') as f:
    content = f.read()

# Change heading
content = content.replace(
    "No. Bal (Lintas Kupon)",
    "Scan / Cari No. Bal / No. Kupon"
)
content = content.replace(
    "placeholder=\"Ketik manual (misal: A00...) atau tembak barcode...\"",
    "placeholder=\"Ketik No. Bal / No. Kupon, atau Scan Barcode...\""
)
content = content.replace(
    "Cari / Timbang No. Bal",
    "Cari / Buka Data"
)
content = content.replace(
    "Ketik No. Kupon / Pilih dari daftar...",
    "Ketik No. Kupon / Ketik No. Bal / Pilih dari daftar..."
)


with open('src/components/transaksi/TimbanganPageView.tsx', 'w') as f:
    f.write(content)

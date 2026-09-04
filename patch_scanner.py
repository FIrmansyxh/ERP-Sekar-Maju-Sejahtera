import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("const cleanCode = code.trim();", "const cleanCode = code.trim().replace(/-/g, '').toUpperCase();")

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)
print("Patched Scanner")

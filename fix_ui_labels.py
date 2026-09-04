import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

# Change Labels
content = content.replace('LANGKAH 1: Bal Gudang', 'No Bal')
content = content.replace('LANGKAH 2: Bal Pembeli', 'No Bal Jadi')
content = content.replace('LANGKAH 3: Grade', 'Harga Jual')

# Modify the placeholder for Harga Jual to say "Scan Harga Jual & Enter"
content = content.replace('placeholder={pendingScanBal ? "Scan Grade & Enter" : "Tunggu Langkah 2"}', 'placeholder={pendingScanBal ? "Scan Harga Jual & Enter" : "Tunggu Langkah 2"}')

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

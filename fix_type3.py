import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

# Remove the sampleLabels generation block
pattern = r"\s*\/\/\s*Prepare sample labels for Admin 3.*?const sampleLabels:\s*SampleLabelData\[\]\s*=\s*balItems\.map\(\(item\)\s*=>\s*\(\{[\s\S]*?\}\)\);"
content = re.sub(pattern, "", content, flags=re.DOTALL)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)
print("Removed sampleLabels block")

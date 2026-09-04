import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

# Remove sampleLabels from onSaveSortir interface
content = re.sub(r"onSaveSortir:\s*\(newTx:\s*TransaksiPembelian,\s*sampleLabels:\s*SampleLabelData\[\]\)\s*=>\s*void;", "onSaveSortir: (newTx: TransaksiPembelian) => void;", content)

# Remove the line generating sampleLabels
sample_labels_pattern = r"\s*const\s*sampleLabels:\s*SampleLabelData\[\]\s*=\s*newTx\.items!\.map\(\(it\)\s*=>\s*\(\{[\s\S]*?\}\)\);"
content = re.sub(sample_labels_pattern, "", content)

# Update the call to onSaveSortir
content = re.sub(r"onSaveSortir\(newTx,\s*sampleLabels\);", "onSaveSortir(newTx);", content)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)
print("Proses1SortirModal fixed types.")

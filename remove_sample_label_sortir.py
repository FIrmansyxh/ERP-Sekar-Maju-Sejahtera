import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

# Remove import
content = re.sub(r"import\s*{\s*SampleLabelPrintModal,\s*SampleLabelData\s*}\s*from\s*'./SampleLabelPrintModal';\n", "", content)

# Remove state
content = re.sub(r"\s*const\s*\[sampleLabelsToPrint,\s*setSampleLabelsToPrint\]\s*=\s*useState<SampleLabelData\[\]\s*\|\s*null>\(null\);", "", content)

# Remove setSampleLabelsToPrint call
content = re.sub(r"\s*setSampleLabelsToPrint\(sampleLabels\);", "", content)

# Remove modal
modal_pattern = r"\s*\{\/\*\s*Admin 3 Sample Label Modal\s*\*\/\}\s*\{sampleLabelsToPrint\s*&&\s*\([\s\S]*?/>\s*\)\}"
content = re.sub(modal_pattern, "", content)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)
print("Proses1SortirModal cleaned.")

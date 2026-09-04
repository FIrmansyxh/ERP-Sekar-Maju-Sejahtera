import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'// Select a bal from autocomplete dropdown directly.*?setTimeout\(\(\) => inputGudangRef\.current\?\.focus\(\), 100\);\n\s*\}', '', content, flags=re.DOTALL)
content = re.sub(r'const handleSelectSuggestedBal = \(bal: Barang\) => \{.*?\};\n', '', content, flags=re.DOTALL)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

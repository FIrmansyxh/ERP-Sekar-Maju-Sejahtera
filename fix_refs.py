import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'// Handle outside click for autocomplete\n\s*useEffect\(\(\) => \{.*?\n\s*\}, \[\]\);\n', '', content, flags=re.DOTALL)
content = re.sub(r'setTimeout\(\(\) => sampleScannerRef\.current\?\.focus\(\), 100\);\n', '', content)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

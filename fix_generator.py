import re

with open('src/data/maduraDatasetGenerator.ts', 'r') as f:
    content = f.read()

content = content.replace("const noBal = `${codeType}-${String(codeNum).padStart(4, '0')}`;", "const noBal = `${codeType}${String(codeNum).padStart(4, '0')}`;")

with open('src/data/maduraDatasetGenerator.ts', 'w') as f:
    f.write(content)
print("Fixed Generator")

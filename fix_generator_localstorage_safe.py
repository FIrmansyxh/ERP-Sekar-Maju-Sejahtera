import re

with open('src/data/maduraDatasetGenerator.ts', 'r') as f:
    content = f.read()

content = content.replace("try {", "try {\n    if (typeof window === 'undefined') throw new Error('SSR');")

with open('src/data/maduraDatasetGenerator.ts', 'w') as f:
    f.write(content)
print("Made localStorage safe for SSR")

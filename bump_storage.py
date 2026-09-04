import re

with open('src/utils/storage.ts', 'r') as f:
    content = f.read()

replacements = {
    "_v9": "_v10"
}
for k, v in replacements.items():
    content = content.replace(k, v)

with open('src/utils/storage.ts', 'w') as f:
    f.write(content)
print("Bumped storage version to v10")

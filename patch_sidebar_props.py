import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'gudangCount={gudangList.length}',
    'gudangCount={gudangList.length}\n          hargaJualCount={hargaJualList.length}\n          hargaCount={hargaList.length}'
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("patched")

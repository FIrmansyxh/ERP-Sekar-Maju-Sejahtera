import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

replacement = """<SortirPageView
                petaniList={petaniList}
                hargaList={hargaList}
                transaksiList={transaksiList}
                barangList={barangList}
                gudangList={gudangList}
                userRole={currentRole}
                currentUser={currentUser}"""

content = re.sub(r"<SortirPageView\s*petaniList=\{petaniList\}\s*hargaList=\{hargaList\}\s*transaksiList=\{transaksiList\}\s*barangList=\{barangList\}\s*gudangList=\{gudangList\}\s*userRole=\{currentRole\}", replacement, content, count=1)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Patched App.tsx")

import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(
    r"(\{\s*checkAccess\('modul-5-pengiriman'\)\s*&&\s*\([\s\S]*?\}\s*\))\s*(\{\s*checkAccess\('modul-4-sample'\)\s*&&\s*\([\s\S]*?\}\s*\))\s*(\{\s*checkAccess\('modul-status-batch'\)\s*&&\s*\([\s\S]*?\}\s*\))",
    re.MULTILINE
)

def repl(m):
    block5 = m.group(1)
    block4 = m.group(2)
    block_status = m.group(3)
    
    return block4 + "\n\n                " + block5 + "\n\n                " + block_status

new_content = pattern.sub(repl, content)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(new_content)
print("Done reordering")

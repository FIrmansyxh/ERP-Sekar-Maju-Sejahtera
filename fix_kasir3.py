with open('src/components/transaksi/KasirPageView.tsx', 'r') as f:
    content = f.read()

import re

# Let's fix the filteredList useMemo properly.
block_to_replace = r"(  const filteredList = useMemo\(\(\) => \{\n\s*return transaksiList\.filter\(\(tx\) => \{)([\s\S]*?)(    \}\);\n\n    // Sort by Kupon\n    return filtered\.sort\(\(a, b\) => \{)"

def replacer(match):
    return f"  const filteredList = useMemo(() => {{\n    const filtered = transaksiList.filter((tx) => {{{match.group(2)}    }});\n\n    // Sort by Kupon\n    return filtered.sort((a, b) => {{"

content = re.sub(block_to_replace, replacer, content)

with open('src/components/transaksi/KasirPageView.tsx', 'w') as f:
    f.write(content)

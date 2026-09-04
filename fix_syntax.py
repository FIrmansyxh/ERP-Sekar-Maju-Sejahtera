import re
with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("  };\n    setActiveDefaultGrade('');", "    setActiveDefaultGrade('');\n  };")

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)

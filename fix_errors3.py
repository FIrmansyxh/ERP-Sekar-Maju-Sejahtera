import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

content = re.sub(r"// Click outside for dropdown[\s\S]*?const handleClickOutside = \(event: MouseEvent\) => \{[\s\S]*?\}\s*\};", "", content)

# I will also just delete `const handleClickOutside` completely.
# Let's find it.
content = re.sub(r"const\s*handleClickOutside\s*=\s*\(event:\s*MouseEvent\)\s*=>\s*\{[\s\S]*?\}\s*\};", "", content)

# Remove `if \(!sortirDropdownRef\.current\) return;`
content = re.sub(r"if \(\!sortirDropdownRef\.current\) return;", "", content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)
print("Removed remaining dropdown refs")

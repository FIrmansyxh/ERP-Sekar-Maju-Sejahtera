import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Remove states
content = re.sub(r"const\s*\[isBalDropdownOpen,\s*setIsBalDropdownOpen\]\s*=\s*useState\(false\);\n", "", content)
content = re.sub(r"const\s*\[highlightedIndex,\s*setHighlightedIndex\]\s*=\s*useState\(0\);\n", "", content)
content = re.sub(r"const\s*sortirDropdownRef\s*=\s*useRef<HTMLDivElement>\(null\);\n", "", content)

# Remove handleClickOutside
handleClickOutside_pattern = r"// Click outside for dropdown[\s\S]*?\}, \[\]\);\n"
content = re.sub(handleClickOutside_pattern, "", content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)
print("Cleaned States")

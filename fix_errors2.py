import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Remove the useEffect for click outside completely (if it was left over)
content = re.sub(r"useEffect\(\(\) => \{\s*document\.addEventListener\('mousedown', handleClickOutside\);\s*return \(\) => document\.removeEventListener\('mousedown', handleClickOutside\);\s*\}, \[\]\);", "", content)

# Remove any remaining mentions of isBalDropdownOpen and sortirDropdownRef
# Find them and remove the blocks
pattern = r"\{\/\*\s*Autocomplete Dropdown\s*\*\/\}[\s\S]*?(<div\s*className=\"md:col-span-3\">|\{\/\*\s*Add Button\s*\*\/\}|<div\s*className=\"md:col-span-1 flex items-center pt-5\">)"
content = re.sub(pattern, r"\1", content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)
print("Cleaned up remaining dropdown code")

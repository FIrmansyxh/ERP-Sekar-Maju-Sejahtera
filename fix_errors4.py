import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

pattern = r"// Close dropdown on outside click[\s\S]*?\}, \[\]\);"
content = re.sub(pattern, "", content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)
print("Removed useEffect outside click")

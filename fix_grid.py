import re
with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Add missing </div> for No Bal Input wrapper
pattern = r"(<div className=\"md:col-span-3 relative\">[\s\S]*?</button>\s*\)\}\s*</div>)\s*(<div className=\"md:col-span-3\">)"
content = re.sub(pattern, r"\1\n              </div>\n              \2", content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

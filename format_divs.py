import re
with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Fix the missing closing div for No Bal Input
content = content.replace(
"""                </div>
                <div className="md:col-span-3">""",
"""                </div>
              </div>
              <div className="md:col-span-3">""")

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

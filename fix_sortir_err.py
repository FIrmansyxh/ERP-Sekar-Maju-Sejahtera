with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Fix currentNoKupon -> noKupon
content = content.replace("const currentMatch = currentNoKupon.match", "const currentMatch = noKupon.match")

# Define isKuponExists inside the component
# Let's find `const activeItemIndex` or something similar, or just put it after `const [noKupon, ...`
decl = "const isKuponExists = transaksiList.some(tx => tx.no_kupon.toLowerCase() === noKupon.toLowerCase());"

if "isKuponExists = " not in content:
    content = content.replace(
        "const [activeScannerSource, setActiveScannerSource] = useState<'input_1' | 'input_2' | 'input_3'>('input_1');",
        f"const [activeScannerSource, setActiveScannerSource] = useState<'input_1' | 'input_2' | 'input_3'>('input_1');\n  {decl}"
    )
    # in case it still fails:
    content = content.replace(
        "const [petaniId, setPetaniId] = useState<string>('');",
        f"const [petaniId, setPetaniId] = useState<string>('');\n  {decl}"
    )

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

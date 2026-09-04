with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

content = content.replace("const [inputNoBal, setInputNoBal] = useState('');",
"const [inputNoBal, setInputNoBal] = useState('');\n  const isKuponExists = transaksiList.some(tx => tx.no_kupon.toLowerCase() === noKupon.toLowerCase());")

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

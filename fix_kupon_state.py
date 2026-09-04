import re

with open('src/components/transaksi/TimbanganPageView.tsx', 'r') as f:
    content = f.read()

state_pattern = r"(const \[selectedTxId, setSelectedTxId\] = useState<string>\(\(\) => \{[\s\S]*?\}\);)"
replacement = r"""\1
  const [kuponInput, setKuponInput] = useState<string>('');
  
  // Sync kuponInput when selectedTxId changes from elsewhere
  useEffect(() => {
    const tx = transaksiList.find(t => t.transaksi_id === selectedTxId);
    if (tx) setKuponInput(tx.no_kupon);
  }, [selectedTxId, transaksiList]);
"""

if "const [kuponInput, setKuponInput]" not in content:
    content = re.sub(state_pattern, replacement, content)

with open('src/components/transaksi/TimbanganPageView.tsx', 'w') as f:
    f.write(content)

import re

with open('src/components/pengiriman/StatusBatchPengirimanManagement.tsx', 'r') as f:
    content = f.read()

state_code = """  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [highlightedBatchIndex, setHighlightedBatchIndex] = useState(0);
  const [scanBatchId, setScanBatchId] = useState('');
  const batchDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(e.target as Node)) {
        setIsBatchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const batchSuggestions = useMemo(() => {
    const q = scanBatchId.trim().toLowerCase();
    if (!q) return batchSampleList.slice(0, 5); // show recent 5 by default
    return batchSampleList.filter((b) => 
      b.kode_batch.toLowerCase().includes(q) || 
      b.tujuan_buyer.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [batchSampleList, scanBatchId]);

  const handleSelectSuggestedBatch = (batchId: string) => {
    setScanBatchId(batchId);
    setIsBatchDropdownOpen(false);
    setSelectedBatchId(batchId);
  };
"""

content = content.replace("  const [activeMainTab, setActiveMainTab] = useState<'sample_batch' | 'pengiriman_batch'>('sample_batch');", "  const [activeMainTab, setActiveMainTab] = useState<'sample_batch' | 'pengiriman_batch'>('sample_batch');\n" + state_code)

with open('src/components/pengiriman/StatusBatchPengirimanManagement.tsx', 'w') as f:
    f.write(content)
print("fixed status batch lint 3")

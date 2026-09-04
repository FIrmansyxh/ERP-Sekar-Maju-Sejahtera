import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

# Replace the state definitions
state_replacement = """  const [scanGudang, setScanGudang] = useState('');
  const [scanPembeli, setScanPembeli] = useState('');
  const [scanGrade, setScanGrade] = useState('');
  
  const inputGudangRef = React.useRef<HTMLInputElement>(null);
  const inputPembeliRef = React.useRef<HTMLInputElement>(null);
  const inputGradeRef = React.useRef<HTMLInputElement>(null);
  const [pendingScanBal, setPendingScanBal] = useState<Barang | null>(null);"""

content = re.sub(r'const \[scanSampleInput, setScanSampleInput\] = useState\(\'\'\);\n.*?const sampleScannerRef = React\.useRef<HTMLInputElement>\(null\);', state_replacement, content, flags=re.DOTALL)

# Delete the unused autocomplete functions
content = re.sub(r'// Select a bal from autocomplete dropdown directly\n\s*const handleSelectSuggestedBal = \(bal: Barang\) => \{.*?setScanSampleInput\(\'\'\);\n\s*\}\n\s*\}\n\s*\};\n', '', content, flags=re.DOTALL)

# Re-run the regex from earlier to remove any leftover useBarcodeScanner stuff
content = re.sub(r'const balDropdownRef = React\.useRef<HTMLDivElement>\(null\);\n', '', content)
content = re.sub(r'const balSuggestions = useMemo\(\(\) => \{.*?\}, \[availableBalList, barangList, scanSampleInput\]\);\n', '', content, flags=re.DOTALL)


with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

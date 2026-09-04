import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

# Remove useBarcodeScanner import
content = re.sub(r"import \{ useBarcodeScanner \} from '../../hooks/useBarcodeScanner';\n", "", content)

# Remove the useBarcodeScanner hook call
content = re.sub(r"\s*// Barcode Scanner Listener\n\s*useBarcodeScanner\(\(scanned\) => \{\n\s*if \(viewMode === 'create_batch'\) \{\n\s*handleProcessScanSample\(scanned\);\n\s*\}\n\s*\}\);\n", "\n", content)

# Update state variables
content = re.sub(r"const \[scanSampleInput, setScanSampleInput\] = useState\(''\);\n\s*const sampleScannerRef = useRef<HTMLInputElement>\(null\);\n\s*const \[scanStep, setScanStep\] = useState<1 \| 2 \| 3>\(1\);\n\s*const \[pendingScanBal, setPendingScanBal\] = useState<Barang \| null>\(null\);\n\s*const \[pendingKodePembeli, setPendingKodePembeli\] = useState<string \| null>\(null\);", """const [scanGudang, setScanGudang] = useState('');
  const [scanPembeli, setScanPembeli] = useState('');
  const [scanGrade, setScanGrade] = useState('');
  
  const inputGudangRef = useRef<HTMLInputElement>(null);
  const inputPembeliRef = useRef<HTMLInputElement>(null);
  const inputGradeRef = useRef<HTMLInputElement>(null);
  const [pendingScanBal, setPendingScanBal] = useState<Barang | null>(null);""", content)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

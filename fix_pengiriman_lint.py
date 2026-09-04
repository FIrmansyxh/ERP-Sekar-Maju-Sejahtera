import re

with open('src/components/pengiriman/PengirimanManagement.tsx', 'r') as f:
    content = f.read()

# Let's fix the Search import first
if "Search," not in content and "Search " not in content:
    content = content.replace("import { ", "import { Search, ")

# Remove the broken state definition that was placed incorrectly
# Actually it was placed correctly but maybe the `batchDropdownRef` etc were already there? Wait, no, TS errors indicate they were not found.

# Let's just find the start of the component to place the state.
component_start = "export const PengirimanManagement: React.FC<PengirimanManagementProps> = ({"

state_code = """
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [highlightedBatchIndex, setHighlightedBatchIndex] = useState(0);
  const [scanBatchId, setScanBatchId] = useState('');
  const batchDropdownRef = React.useRef<HTMLDivElement>(null);
  const inputBatchRef = React.useRef<HTMLInputElement>(null);

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
"""
# Need to make sure it's placed right after props destructuring.
with open('src/components/pengiriman/PengirimanManagement.tsx', 'w') as f:
    f.write(content)
print("done")

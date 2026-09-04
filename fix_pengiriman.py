import re

with open('src/components/pengiriman/PengirimanManagement.tsx', 'r') as f:
    content = f.read()

# Add imports
if "Search" not in content[:500]:
    content = content.replace("import {", "import { Search,", 1)

if "useRef" not in content[:200]:
    content = content.replace("import React, { useState, useEffect, useMemo }", "import React, { useState, useEffect, useMemo, useRef }")

state_code = """  const [viewMode, setViewMode] = useState<'list' | 'create'>('create');
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [highlightedBatchIndex, setHighlightedBatchIndex] = useState(0);
  const [scanBatchId, setScanBatchId] = useState('');
  const batchDropdownRef = useRef<HTMLDivElement>(null);
  const inputBatchRef = useRef<HTMLInputElement>(null);

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

content = content.replace("  const [viewMode, setViewMode] = useState<'list' | 'create'>('create');", state_code)

with open('src/components/pengiriman/PengirimanManagement.tsx', 'w') as f:
    f.write(content)
print("fixed")

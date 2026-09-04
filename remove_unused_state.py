import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'const \[isBalDropdownOpen, setIsBalDropdownOpen\] = useState\(false\);\n', '', content)
content = re.sub(r'const \[highlightedBalIndex, setHighlightedBalIndex\] = useState\(0\);\n', '', content)
content = re.sub(r'const balDropdownRef = useRef<HTMLDivElement>\(null\);\n', '', content)

content = re.sub(r'const balSuggestions = useMemo\(\(\) => \{.*?\}, \[scanSampleInput, barangList\]\);\n', '', content, flags=re.DOTALL)
content = re.sub(r'// Handle outside click for autocomplete\n\s*useEffect\(\(\) => \{.*?\n\s*\}, \[\]\);\n', '', content, flags=re.DOTALL)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

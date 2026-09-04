import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

click_out = """
  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (balDropdownRef.current && !balDropdownRef.current.contains(e.target as Node)) {
        setIsBalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
"""

content = re.sub(r'\s*// Compute bal suggestions dynamically based on scanGudang', click_out + '\n  // Compute bal suggestions dynamically based on scanGudang', content)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

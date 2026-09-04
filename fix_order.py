import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

available_str = """  const availableBalList = useMemo(() => {
    return barangList.filter((b) => b.status_stok === 'di_gudang');
  }, [barangList]);"""

content = content.replace(available_str, '')
content = content.replace('// Compute bal suggestions dynamically based on scanGudang', available_str + '\n  // Compute bal suggestions dynamically based on scanGudang')

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)
print("done")

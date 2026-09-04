import re
with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

handle_change = """  const handleGradeChange = (gradeCode: string) => {
    setSelectedGrade(gradeCode);
    const found = hargaList.find((h) => h.kode_grade === gradeCode);
    if (found) {
      setHargaSatuan(found.harga_per_kg);
    } else {
      setHargaSatuan(0);
    }
  };"""

content = re.sub(r"const handleGradeChange = \(gradeCode: string\) => \{[\s\S]*?  \};", handle_change, content, count=1)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

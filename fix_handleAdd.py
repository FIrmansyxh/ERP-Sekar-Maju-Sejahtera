import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

pattern = r"(const handleAddBalItem = \(\) => \{)([\s\S]*?)(const tara = isGantiTikar \? 2 : 3;)"
replacement = r"""\1
    if (!selectedGrade) {
      setScanFeedback({ text: 'Gagal: Anda harus memilih Grade / Mutu Barang terlebih dahulu!', isError: true });
      return;
    }

    const balCode = inputNoBal.trim() || getNextSuggestedNoBal();
    const cleanedBalCode = balCode.replace(/-/g, '').toUpperCase();
    
    if (!cleanedBalCode) {
      setScanFeedback({ text: 'Nomor bal wajib diisi atau discan!', isError: true });
      return;
    }

    // Check duplicate in master data
    if (barangList.some((b) => (b.no_bal || b.barang_id || '').toUpperCase() === cleanedBalCode)) {
      setScanFeedback({ text: `Gagal: Nomor bal "${cleanedBalCode}" sudah ada di master data inventaris!`, isError: true });
      return;
    }

    // Check duplicate in current batch
    if (balItems.some((b) => b.no_bal.toUpperCase() === cleanedBalCode)) {
      setScanFeedback({ text: `Nomor bal "${cleanedBalCode}" sudah ada dalam daftar sortir kupon ini!`, isError: true });
      return;
    }

    \3"""

content = re.sub(pattern, replacement, content, count=1)

# Also fix `no_bal: balCode` to `cleanedBalCode` and remove the `|| 'A'` default grade
content = re.sub(r"no_bal: balCode,", "no_bal: cleanedBalCode,", content)
content = re.sub(r"barcode: balCode,", "barcode: cleanedBalCode,", content)
content = re.sub(r"kode_grade: selectedGrade \|\| 'A',", "kode_grade: selectedGrade,", content)
content = re.sub(r"setScanFeedback\(\{ text: `✓ Bal \"\$\{balCode\}\" Grade \$\{selectedGrade\} berhasil ditambahkan!`, isError: false \}\);", r"setScanFeedback({ text: `✓ Bal \"${cleanedBalCode}\" Grade ${selectedGrade} berhasil ditambahkan!`, isError: false });", content)


with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

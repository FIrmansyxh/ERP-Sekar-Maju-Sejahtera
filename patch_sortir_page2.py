import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# 1. Remove suggestions computing
suggestions_computing_pattern = r"// Compute bal suggestions for Sortir[\s\S]*?return suggestions\.slice\(0, 15\);\s*\}, \[inputNoBal, selectedGrade, barangList\]\);"
content = re.sub(suggestions_computing_pattern, "", content)

# 2. Update handleAddBalItem
handle_add_pattern = r"(const handleAddBalItem = \(\) => \{[\s\S]*?const balCode = inputNoBal\.trim\(\) \|\| getNextSuggestedNoBal\(\);)[\s\S]*?(// Check duplicate in current batch)"

new_add_logic = r"""\1
    // Remove hyphens and make uppercase for standard format
    const cleanedBalCode = balCode.replace(/-/g, '').toUpperCase();
    if (!cleanedBalCode) {
      setScanFeedback({ text: 'Nomor bal wajib diisi atau discan!', isError: true });
      return;
    }

    // Check duplicate in master data
    if (barangList.some((b) => (b.no_bal || b.barang_id || '').toUpperCase() === cleanedBalCode)) {
      setScanFeedback({ text: `Gagal: Nomor bal "${cleanedBalCode}" sudah ada di master data inventaris (sudah dipakai)!`, isError: true });
      return;
    }

    \2"""
content = re.sub(handle_add_pattern, new_add_logic, content, count=1)

# Also update the check inside handleAddBalItem for current batch
current_batch_check = r"if \(balItems\.some\(\(b\) => b\.no_bal\.toLowerCase\(\) === balCode\.toLowerCase\(\)\)\) \{"
new_current_batch_check = "if (balItems.some((b) => b.no_bal.toUpperCase() === cleanedBalCode)) {"
content = content.replace(current_batch_check, new_current_batch_check)

# Also replace balCode with cleanedBalCode inside handleAddBalItem
content = re.sub(r"no_bal:\s*balCode,", "no_bal: cleanedBalCode,", content)
content = re.sub(r"barcode:\s*balCode,", "barcode: cleanedBalCode,", content)
content = content.replace('setScanFeedback({ text: `Nomor bal "${balCode}" sudah ada dalam daftar sortir kupon ini!`, isError: true });', 'setScanFeedback({ text: `Nomor bal "${cleanedBalCode}" sudah ada dalam daftar sortir kupon ini!`, isError: true });')

# 3. Clean up the input area (remove dropdown logic entirely)
input_area_pattern = r"""(<input\s*ref=\{barcodeInputRef\}\s*type="text"\s*value=\{inputNoBal\})[\s\S]*?(placeholder=\{`Contoh: \$\{getNextSuggestedNoBal\(\)\}`\}\s*className="w-full bg-white border border-slate-300 rounded-sm px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"\s*\/>)[\s\S]*?(\{\/\*\s*Autocomplete Dropdown\s*\*\/\}\s*\{isBalDropdownOpen[\s\S]*?<\!--\s*End dropdown\s*-->|<\/div>\s*\}\s*<\/div>)"""
# Wait, let's just find the exact block for the dropdown and input.

const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

const validationFunction = `
  const isNoJadiAlreadyUsed = (noJadi: string) => {
    const target = noJadi.trim().toLowerCase();
    if (!target) return false;
    
    // Check in current draft table
    if (selectedBalItems.some(item => (item.kodeBalPembeli || '').toLowerCase() === target)) {
      return true;
    }
    // Check in all existing batches
    for (const batch of activeBatchSampleList) {
      if (batch.items && batch.items.some(item => (item.kode_bal_pembeli || '').toLowerCase() === target)) {
        return true;
      }
    }
    return false;
  };
`;

// Insert the validation function right before handleScanPembeliSubmit
code = code.replace(
  /  const handleScanPembeliSubmit = \(\) => \{/,
  validationFunction + '\n  const handleScanPembeliSubmit = () => {'
);

const handleScanPembeliSubmitPatch = `
  const handleScanPembeliSubmit = () => {
    const trimmed = scanPembeli.trim();
    if (!trimmed) return;
    
    if (isNoJadiAlreadyUsed(trimmed)) {
      setScanSampleAlert({
        type: 'error',
        message: \`Gagal: No Jadi "\${trimmed}" sudah digunakan. No Jadi hanya bisa digunakan 1 kali.\`,
      });
      setScanPembeli('');
      setTimeout(() => inputPembeliRef.current?.focus(), 100);
      return;
    }
`;
code = code.replace(
  /  const handleScanPembeliSubmit = \(\) => \{\n    const trimmed = scanPembeli\.trim\(\);\n    if \(\!trimmed\) return;/,
  handleScanPembeliSubmitPatch
);

const handleScanHargaJualSubmitWithCodePatch = `
  const handleScanHargaJualSubmitWithCode = (foundHJ: MasterHargaJual) => {
    if (!pendingScanBal) {
      setScanSampleAlert({
        type: 'error',
        message: 'Gagal: Data Bal Gudang belum lengkap. Silakan ulangi dari awal.',
      });
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    const finalKodeBalPembeli = scanPembeli.trim() || (pendingScanBal.no_bal || pendingScanBal.barang_id);
    
    if (isNoJadiAlreadyUsed(finalKodeBalPembeli)) {
      setScanSampleAlert({
        type: 'error',
        message: \`Gagal: No Jadi "\${finalKodeBalPembeli}" sudah digunakan. No Jadi hanya bisa digunakan 1 kali. Silakan ketik No Jadi baru.\`,
      });
      setTimeout(() => inputPembeliRef.current?.focus(), 100);
      return;
    }

    const newItem = {
      barangId: pendingScanBal.barang_id,
      noBal: pendingScanBal.no_bal || pendingScanBal.barang_id,
      kodeBalPembeli: finalKodeBalPembeli,
`;
code = code.replace(
  /  const handleScanHargaJualSubmitWithCode = \(foundHJ: MasterHargaJual\) => \{\n    if \(\!pendingScanBal\) \{\n      setScanSampleAlert\(\{\n        type: 'error',\n        message: 'Gagal: Data Bal Gudang belum lengkap. Silakan ulangi dari awal.',\n      \}\);\n      setTimeout\(\(\) => inputGudangRef\.current\?\.focus\(\), 100\);\n      return;\n    \}\n\n    const newItem = \{\n      barangId: pendingScanBal\.barang_id,\n      noBal: pendingScanBal\.no_bal \|\| pendingScanBal\.barang_id,\n      kodeBalPembeli: scanPembeli\.trim\(\) \|\| \(pendingScanBal\.no_bal \|\| pendingScanBal\.barang_id\),/g,
  handleScanHargaJualSubmitWithCodePatch
);

// Fix the typo in the table {item.kodeBuyer} -> {item.kodeBalPembeli}
code = code.replace(
  /<td className="p-2\.5 font-mono font-bold text-\[\#b81d24\] border-r border-gray-200">\{item\.kodeBuyer\}<\/td>/g,
  '<td className="p-2.5 font-mono font-bold text-[#b81d24] border-r border-gray-200">{item.kodeBalPembeli}</td>'
);

fs.writeFileSync(file, code);
console.log('Patched SampleManagement.tsx');

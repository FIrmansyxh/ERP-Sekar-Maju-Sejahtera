const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/TimbanganPageView.tsx', 'utf8');

// Fix 1: selectBalAndOpen - auto focus beratBrutoInputRef
code = code.replace(
/    \/\/ PENGAMAN: Jaga fokus tetap pada kolom No Bal \/ Scanner agar tidak langsung mengisi berat tanpa sengaja\n\s*setTimeout\(\(\) => \{\n\s*if \(barcodeScannerRef\.current\) \{\n\s*barcodeScannerRef\.current\.focus\(\);\n\s*barcodeScannerRef\.current\.select\(\);\n\s*\}\n\s*\}, 120\);/m,
`    // Otomatis fokus ke input berat kotor ketika berhasil scan/pilih bal
    setTimeout(() => {
      if (beratBrutoInputRef.current) {
        beratBrutoInputRef.current.focus();
        beratBrutoInputRef.current.select();
      }
    }, 120);`
);


// Fix 2: handleApplyWeightForActiveBal - auto clear right pane
code = code.replace(
/    \/\/ Tetap pada bal terakhir yang baru saja ditimbang dalam kondisi terkunci \(tidak bisa diedit\),\n\s*\/\/ jangan berpindah ke bal selanjutnya, dan langsung kembalikan fokus ke kolom No Bal \/ Scanner\.\n\s*setScannedBarcode\(''\);\n\s*setIsDropdownOpen\(false\);\n\s*setHighlightedIndex\(-1\);/m,
`    // Kosongkan dan kembalikan ke awal untuk scan berikutnya
    setScannedBarcode('');
    setActiveItemId(''); // Ini akan mengosongkan panel kanan (kembali ke state awal/Tidak ada bal)
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);`
);

// We should also adjust the scan feedback text for the second fix, since it doesn't stay locked now.
code = code.replace(
/Terkunci\. Siap scan kupon\/bal berikutnya\./,
`Tersimpan. Siap scan kupon/bal berikutnya.`
);
code = code.replace(
/tersimpan & TERKUNCI\. Kursor otomatis kembali ke kolom No Bal \/ Scanner untuk bal berikutnya\./,
`berhasil disimpan. Panel dikosongkan dan siap scan bal berikutnya.`
);


fs.writeFileSync('src/components/transaksi/TimbanganPageView.tsx', code);

const fs = require('fs');
const file = 'src/components/transaksi/TimbanganPageView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `    setWorkingItems(updatedItems);
    setBeratBrutoInput('');`;

const newStr = `    setWorkingItems(updatedItems);
    setBeratBrutoInput('');
    
    // Save to global state so it's persisted immediately
    if (currentTx) {
      const updatedTx = {
        ...currentTx,
        items: updatedItems,
        berat_kg: updatedItems.reduce((sum, item) => sum + (item.berat_kg || 0), 0),
        total_kotor: updatedItems.reduce((sum, item) => sum + (item.total_kotor || 0), 0),
        total_potongan: updatedItems.reduce((sum, item) => sum + (item.potongan || 0), 0),
        total_bersih: updatedItems.reduce((sum, item) => sum + (item.subtotal_bersih || 0), 0),
        status_transaksi: 'menunggu',
        status_tahap: 'menunggu_timbang',
      };
      // For updatedBarangs we pass empty array or we find and modify the associated barang?
      // Actually we just pass [] because the barang might have been created before, but in this case the global App state in App.tsx might need to be notified. 
      // Passing [] is safe for onSaveTransaksi if we only update the TX.
      onSaveTransaksi(updatedTx, []);
    }`;

code = code.replace(targetStr, newStr);

fs.writeFileSync(file, code);

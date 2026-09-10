const fs = require('fs');
let file = 'src/components/pengiriman/SuratJalanPrintModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetLogic = `    // Priority 2: Transaction / Purchase price from inventory
    if (!pricePerKg || pricePerKg <= 0) {
      pricePerKg = found?.harga_per_kg;
    }

    if (!pricePerKg || pricePerKg <= 0) {
      if (found?.transaksi_pembelian_id) {
        const tx = transaksiList.find((t) => t.transaksi_id === found.transaksi_pembelian_id);
        if (tx && tx.harga_per_kg > 0) {
          pricePerKg = tx.harga_per_kg;
        }
      }
    }

    if (!pricePerKg || pricePerKg <= 0) {
      pricePerKg = getDefaultPriceByGrade(grade);
    }`;

const newLogic = `    // If no deal price is provided for DO, default to 0 to prevent leaking buy price
    if (!pricePerKg || pricePerKg <= 0) {
      pricePerKg = 0;
    }`;

code = code.replace(targetLogic, newLogic);
fs.writeFileSync(file, code);
console.log('Patched SuratJalanPrintModal.tsx');

const fs = require('fs');
let file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Dashboard Penjualan calculation -> DO NOT USE harga beli fallback if harga jual missing
const oldPenjualan = `          } else {
            // fallback: use buy price (b.harga_per_kg) or grade price so we don't zero out sales
            const fallbackPrice = b.harga_per_kg || getPriceByGrade(b.kode_grade);
            DOValue += (b.berat_kg || 0) * fallbackPrice;
            if (fallbackPrice > 0) hasValidItemVal = true;
          }`;
const newPenjualan = `          } else {
            // DO NOT fallback to buy price, this causes phantom sales.
            // A sale without a deal price is 0
            DOValue += 0;
          }`;
code = code.replace(oldPenjualan, newPenjualan);

// Profit Stats calculation -> DO NOT USE harga beli fallback
const oldProfit = `               const hargaJual = pengiriman.harga_deal_map?.[balId] || bal.harga_per_kg || getPriceByGrade(bal.kode_grade);`;
const newProfit = `               const hargaJual = pengiriman.harga_deal_map?.[balId] || 0;`;
code = code.replace(oldProfit, newProfit);


fs.writeFileSync(file, code);
console.log('Patched profit calculations!');

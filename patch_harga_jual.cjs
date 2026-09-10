const fs = require('fs');
let file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

// The current code does:
// const hj = hargaJualList[Math.floor(pseudoRandom() * hargaJualList.length)];
// hargaDealMap[item.barang_id] = hj.harga_jual;
// kodeHargaJualMap[item.barang_id] = hj.kode;

// Let's replace it so it uses the same grade index, or just adds a margin
const regex = /const hj = hargaJualList\[Math\.floor\(pseudoRandom\(\) \* hargaJualList\.length\)\];\s*hargaDealMap\[item\.barang_id\] = hj\.harga_jual;\s*kodeHargaJualMap\[item\.barang_id\] = hj\.kode;/g;

const replacement = `// Find matching sell price based on buy price index
        let hjIndex = hargaBeliList.findIndex(hb => hb.harga_per_kg === item.harga_per_kg);
        if (hjIndex === -1) hjIndex = Math.floor(pseudoRandom() * hargaJualList.length);
        
        // Sell for a higher grade or same grade + margin (just ensure it's not a loss)
        // Let's pick a sell price that is the item's buy price + 5000 to 10000 margin
        const marginPerKg = 5000 + Math.floor(pseudoRandom() * 5000);
        let actualSellPrice = (item.harga_per_kg || 25000) + marginPerKg;
        
        hargaDealMap[item.barang_id] = actualSellPrice;
        kodeHargaJualMap[item.barang_id] = hargaJualList[hjIndex]?.kode || 'J1';`;

code = code.replace(regex, replacement);

fs.writeFileSync(file, code);
console.log('Patched harga jual to always be profitable');

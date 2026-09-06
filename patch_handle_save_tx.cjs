const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetOld = `    const balCount = newTx.total_bal || (newTx.items ? newTx.items.length : 1);
    const itemBalList = (newTx.items && newTx.items.length > 0)
      ? newTx.items.map((i) => i.no_bal || i.barcode).join(', ')
      : newTx.no_bal || '-';

    const updatedPetaniList = petaniList.map((p) => {
      if (p.petani_id === newTx.petani_id) {
        const totalBal = (p.statistik?.total_setoran_bal || 0) + balCount;
        const totalKg = (p.statistik?.total_berat_kg || 0) + newTx.berat_kg;
        return {
          ...p,
          statistik: {
            ...p.statistik,
            total_setoran_bal: totalBal,
            total_berat_kg: totalKg,
            kunjungan_terakhir: (newTx.tanggal_transaksi ? newTx.tanggal_transaksi.split(' ')[0] : '') || new Date().toISOString().split('T')[0],
            grade_dominan: \`Grade \${newTx.kode_grade}\`,
          },
        };
      }
      return p;
    });`;

const targetNew = `    const balCount = newTx.total_bal || (newTx.items ? newTx.items.length : 1);
    const itemBalList = (newTx.items && newTx.items.length > 0)
      ? newTx.items.map((i) => i.no_bal || i.barcode).join(', ')
      : newTx.no_bal || '-';

    const updatedPetaniList = petaniList.map((p) => {
      if (p.petani_id === newTx.petani_id) {
        let totalBalDelta = balCount;
        let totalKgDelta = newTx.berat_kg || 0;

        if (exists && oldTx) {
          const oldBalCount = oldTx.total_bal || (oldTx.items ? oldTx.items.length : 1);
          totalBalDelta -= oldBalCount;
          totalKgDelta -= (oldTx.berat_kg || 0);
        }

        const totalBal = Math.max(0, (p.statistik?.total_setoran_bal || 0) + totalBalDelta);
        const totalKg = Math.max(0, (p.statistik?.total_berat_kg || 0) + totalKgDelta);

        return {
          ...p,
          statistik: {
            ...p.statistik,
            total_setoran_bal: totalBal,
            total_berat_kg: totalKg,
            kunjungan_terakhir: (newTx.tanggal_transaksi ? newTx.tanggal_transaksi.split(' ')[0] : '') || new Date().toISOString().split('T')[0],
            grade_dominan: \`Grade \${newTx.kode_grade}\`,
          },
        };
      }
      return p;
    });`;

code = code.replace(targetOld, targetNew);

fs.writeFileSync(file, code);

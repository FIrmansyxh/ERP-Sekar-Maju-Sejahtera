const fs = require('fs');

let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetLogic = `    // Urutkan: Bal yang tersedia dan diawali query di paling atas, kemudian bal yang sudah terpakai
    matches.sort((a, b) => {
      const usageA = checkBalUsage(a);
      const usageB = checkBalUsage(b);

      if (usageA.isAvailable && !usageB.isAvailable) return -1;
      if (!usageA.isAvailable && usageB.isAvailable) return 1;

      const aNo = a.no_bal || a.barang_id;
      const bNo = b.no_bal || b.barang_id;

      const aStarts = aNo.toLowerCase().startsWith(qClean);
      const bStarts = bNo.toLowerCase().startsWith(qClean);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' });
    });

    return matches.slice(0, 20);`;

const newLogic = `    // OPTIMIZATION: Only evaluate heavy checks on top 50 matches to prevent lag
    const topMatches = matches.slice(0, 50).map(b => {
      const aNo = b.no_bal || b.barang_id;
      return {
        bal: b,
        usage: checkBalUsage(b),
        starts: aNo.toLowerCase().startsWith(qClean),
        no: aNo
      };
    });

    // Urutkan: Bal yang tersedia dan diawali query di paling atas, kemudian bal yang sudah terpakai
    topMatches.sort((a, b) => {
      if (a.usage.isAvailable && !b.usage.isAvailable) return -1;
      if (!a.usage.isAvailable && b.usage.isAvailable) return 1;
      if (a.starts && !b.starts) return -1;
      if (!a.starts && b.starts) return 1;
      return a.no.localeCompare(b.no, undefined, { numeric: true, sensitivity: 'base' });
    });

    return topMatches.slice(0, 20).map(m => m.bal);`;

code = code.replace(targetLogic, newLogic);

fs.writeFileSync(file, code);
console.log('Patched SampleManagement.tsx');

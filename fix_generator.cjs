const fs = require('fs');
let code = fs.readFileSync('src/data/maduraDatasetGenerator.ts', 'utf8');

code = code.replace(/no_surat_jalan: \`SJ-\$\{i\}\`,/g, "no_surat_jalan: `SJ-${i}`,\n      pengiriman_id: `kirim-${i}`,");

fs.writeFileSync('src/data/maduraDatasetGenerator.ts', code);

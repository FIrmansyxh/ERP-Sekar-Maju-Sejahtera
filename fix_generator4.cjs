const fs = require('fs');
let code = fs.readFileSync('src/data/maduraDatasetGenerator.ts', 'utf8');

code = code.replace(/no_surat_jalan: \`SJ-\$\{i\}\`,/g, "pengiriman_id: `kirim-${i}`,\n        no_surat_jalan: `SJ-${i}`,");
fs.writeFileSync('src/data/maduraDatasetGenerator.ts', code);

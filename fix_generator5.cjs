const fs = require('fs');
let code = fs.readFileSync('src/data/maduraDatasetGenerator.ts', 'utf8');

code = code.replace(/\/\/ \`DO-\$\{batchId\}\`,/g, "pengiriman_id: `DO-${batchId}`,");

fs.writeFileSync('src/data/maduraDatasetGenerator.ts', code);

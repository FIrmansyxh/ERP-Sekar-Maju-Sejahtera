const fs = require('fs');
let code = fs.readFileSync('src/data/maduraDatasetGenerator.ts', 'utf8');

code = code.replace(/item\.pengiriman_id = /g, "// item.pengiriman_id = ");
fs.writeFileSync('src/data/maduraDatasetGenerator.ts', code);

const fs = require('fs');
let code = fs.readFileSync('src/data/maduraDatasetGenerator.ts', 'utf8');

code = code.replace(/\/\/ pengiriman_id:/g, "//");
fs.writeFileSync('src/data/maduraDatasetGenerator.ts', code);

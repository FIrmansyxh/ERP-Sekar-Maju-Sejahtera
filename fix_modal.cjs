const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/<EditBatchMetadataModal[\s\S]*?\/>/, '');

fs.writeFileSync(file, code);
console.log('Removed leftover EditBatchMetadataModal');

const fs = require('fs');
let file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/\} else if \(i === cancelledCount \+ 2\) \{[\s\S]*?\} else if \(i === cancelledCount \+ 3\) \{[\s\S]*?\}/g, '}');

fs.writeFileSync(file, code);

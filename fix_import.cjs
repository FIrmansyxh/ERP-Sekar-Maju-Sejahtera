const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace <Edit with <Edit3 or import Edit.
// The easiest is just to replace <Edit className... with <Edit3 className...
code = code.replace(/<Edit className/g, '<Edit3 className');

fs.writeFileSync(file, code);
console.log('Fixed Edit icon import issue');

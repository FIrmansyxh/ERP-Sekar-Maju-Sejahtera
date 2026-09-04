const fs = require('fs');

let content = fs.readFileSync('src/components/sample/SampleManagement.tsx', 'utf8');

// Remove validation for 0 bal
content = content.replace(/if \(selectedBalItems\.length === 0\) \{\s*setErrorMessage\('Pilih minimal 1 bal tembakau untuk dimasukkan ke dalam Batch Sample!'\);\s*return;\s*\}/, '');

// Also remove the disabled state of the button
content = content.replace(/disabled=\{selectedBalItems\.length === 0\}/g, '');
content = content.replace(/if \(selectedBalItems\.length === 0\) \{\s*setErrorMessage\('Pilih minimal 1 bal tembakau untuk sample batch!'\);\s*return;\s*\}/, '');

fs.writeFileSync('src/components/sample/SampleManagement.tsx', content);

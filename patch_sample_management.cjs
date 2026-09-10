const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const \[dikirimOleh, setDikirimOleh\] = useState\('Hendra Gunawan \(QC & Ekspedisi\)'\);/g, "const [dikirimOleh, setDikirimOleh] = useState('');");

fs.writeFileSync(file, code);
console.log('Patched SampleManagement.tsx');

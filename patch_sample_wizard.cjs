const fs = require('fs');
let file = 'src/components/sample/SampleWizardModal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const \[dikirimOleh, setDikirimOleh\] = useState<string>\('Petugas QC & Sortir'\);/g, "const [dikirimOleh, setDikirimOleh] = useState<string>('');");

fs.writeFileSync(file, code);
console.log('Patched SampleWizardModal.tsx');

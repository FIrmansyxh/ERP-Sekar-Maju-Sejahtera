const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const \[tujuanBuyer, setTujuanBuyer\] = useState\(''\);/,
  "const [tujuanBuyer, setTujuanBuyer] = useState('');\n  const [permintaanBuyer, setPermintaanBuyer] = useState('');"
);

fs.writeFileSync(file, code);
console.log('Fixed permintaanBuyer');

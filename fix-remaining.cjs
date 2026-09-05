const fs = require('fs');

const op = 'src/components/operator/OperatorLoketView.tsx';
let opCode = fs.readFileSync(op, 'utf8');
opCode = opCode.replace(/activeFarmers\[0\]\.nomor_kartu/g, 'activeFarmers[0].petani_id');
fs.writeFileSync(op, opCode);

const pt = 'src/components/petani/PetaniTable.tsx';
let ptCode = fs.readFileSync(pt, 'utf8');
ptCode = ptCode.replace(/\$\{deletingPetaniTarget\?\.nomor_kartu\}/g, '${deletingPetaniTarget?.petani_id}');
fs.writeFileSync(pt, ptCode);

const pie = 'src/components/petani/PetaniImportExportModal.tsx';
let pieCode = fs.readFileSync(pie, 'utf8');
pieCode = pieCode.replace(/const cardIdx = headers\.indexOf\('nomor_kartu'\);/g, "const cardIdx = headers.indexOf('petani_id');");
pieCode = pieCode.replace(/"nomor_kartu"/g, '"petani_id"');
pieCode = pieCode.replace(/nomor_kartu,nama_petani/g, 'petani_id,nama_petani');
pieCode = pieCode.replace(/KRT-/g, 'PTN-');
fs.writeFileSync(pie, pieCode);

const app = 'src/App.tsx';
let appCode = fs.readFileSync(app, 'utf8');
appCode = appCode.replace(/\$\{target\?\.nomor_kartu \|\| ''\}/g, '${target?.petani_id || \'\'}');
fs.writeFileSync(app, appCode);

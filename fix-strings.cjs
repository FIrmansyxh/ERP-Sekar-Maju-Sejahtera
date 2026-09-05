const fs = require('fs');

const pdm = 'src/components/petani/PetaniDeactivateModal.tsx';
let pdmCode = fs.readFileSync(pdm, 'utf8');
pdmCode = pdmCode.replace(/ID: \$\{petani\.petani_id\} • ID Petani: \$\{petani\.petani_id\}/g, 'ID Petani: ${petani.petani_id}');
pdmCode = pdmCode.replace(/ID Petani Fisik:/g, 'ID Petani:');
pdmCode = pdmCode.replace(/Penerbitan Ulang ID Petani Fisik/g, 'Penerbitan Ulang ID Petani');
fs.writeFileSync(pdm, pdmCode);

const tfm = 'src/components/transaksi/TransaksiFormModal.tsx';
let tfmCode = fs.readFileSync(tfm, 'utf8');
tfmCode = tfmCode.replace(/ID \/ ID Petani/g, 'ID Petani');
fs.writeFileSync(tfm, tfmCode);

const tdm = 'src/components/transaksi/TransaksiDetailModal.tsx';
let tdmCode = fs.readFileSync(tdm, 'utf8');
tdmCode = tdmCode.replace(/ID Petani \/ Kartu:/g, 'ID Petani:');
fs.writeFileSync(tdm, tdmCode);

const olv = 'src/components/operator/OperatorLoketView.tsx';
let olvCode = fs.readFileSync(olv, 'utf8');
olvCode = olvCode.replace(/Scan Barcode Kartu \/ Ketik ID Petani:/g, 'Scan Barcode / Ketik ID Petani:');
fs.writeFileSync(olv, olvCode);

const rcm = 'src/components/petani/PetaniResetCardModal.tsx';
let rcmCode = fs.readFileSync(rcm, 'utf8');
rcmCode = rcmCode.replace(/Penerbitan Ulang ID Petani Fisik/g, 'Penerbitan Ulang ID Petani');
fs.writeFileSync(rcm, rcmCode);

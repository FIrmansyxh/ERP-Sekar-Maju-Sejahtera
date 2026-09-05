const fs = require('fs');
const file = 'src/data/maduraDatasetGenerator.ts';
let code = fs.readFileSync(file, 'utf8');

const names = [
  "Abdullah", "Ahmad", "Amin", "Amir", "Anwar", "Arifin", "Azis", "Bahrudin", "Basri", "Budi Santoso",
  "Dhofir", "Djumadi", "Fadil", "Faruq", "Fauzi", "Ghozali", "Habib", "Hadi", "Hafid", "Hasan Basri",
  "Hasyim", "Husen", "Ibrahim", "Imam", "Ismail", "Jalal", "Jamil", "Junaidi", "Kamarudin", "Kholil",
  "Lutfi", "Mahfud", "Mansyur", "Muis", "Mujib", "Mukhlis", "Munir", "Mustofa", "Nawawi", "Nurkholis",
  "Qosim", "Rahman", "Rasyid", "Rizal", "Romli", "Roni", "Saifuddin", "Samsudin", "Sanusi", "Sholeh",
  "Subaidi", "Sudar", "Supriyadi", "Syaiful", "Syukur", "Taufiq", "Tohir", "Wahab", "Wahid", "Wawan",
  "Yasin", "Yunus", "Yusuf", "Zainal", "Zaini"
];

// In maduraDatasetGenerator.ts:
// nama_petani: `Petani ${d.year} ${i}`,

const targetStr = "      petaniList.push({\n        petani_id: `PTN-${d.year}-${String(i).padStart(2, '0')}`,\n        nama_petani: `Petani ${d.year} ${i}`,";

const newStr = `      const nameIndex = (petaniList.length) % ${names.length};
      const realName = ${JSON.stringify(names)}[nameIndex];
      petaniList.push({
        petani_id: \`PTN-\${d.year}-\${String(i).padStart(2, '0')}\`,
        nama_petani: realName,`;

code = code.replace(targetStr, newStr);

fs.writeFileSync(file, code);

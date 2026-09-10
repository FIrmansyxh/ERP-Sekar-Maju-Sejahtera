const fs = require('fs');

const firstNames = ['Budi', 'Agus', 'Slamet', 'Herman', 'Tono', 'Haji', 'Abdul', 'Rahmat', 'Sulaiman', 'Fauzi', 'Siti', 'Mulyadi', 'Joko', 'Hasan', 'Rizal', 'Yusuf', 'Imam', 'Samsul', 'Zainal', 'Mahfud', 'Ali', 'Umar', 'Basri', 'Tohir', 'Ghufron', 'Mahrus', 'Kholil', 'Rosyid', 'Anwar', 'Ismail', 'Syamsuddin', 'Subaidi', 'Baihaki', 'Syafiq', 'Hadi', 'Ghani', 'Farid', 'Latif', 'Soleh', 'Arifin', 'Ghozali', 'Muis', 'Zubair', 'Nawawi', 'Fadli'];
const lastNames = ['Santoso', 'Pratama', 'Hidayat', 'Setiawan', 'Rahman', 'Fadilah', 'Hakim', 'Mahendra', 'Wahid', 'Ansori', '', 'Mubarok', 'Basalamah', 'Assegaf', 'Bawazier'];

const locations = [
  'Kec. Pegantenan, Pamekasan', 'Kec. Pakong, Pamekasan', 'Kec. Kadur, Pamekasan',
  'Kec. Guluk-Guluk, Sumenep', 'Kec. Ganding, Sumenep', 'Kec. Lenteng, Sumenep',
  'Kec. Karangpenang, Sampang', 'Kec. Sokobanah, Sampang', 'Kec. Omben, Sampang',
  'Kec. Blega, Bangkalan', 'Kec. Galis, Bangkalan'
];

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const start = new Date('2022-06-01');
const end = new Date('2026-08-31');

const petaniList = [];

for (let i = 0; i < 43; i++) {
  const d = getRandomDate(start, end);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const tanggal_daftar = `${year}-${month}-${day}`;
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const nama_petani = (firstName + ' ' + lastName).trim();
  
  const no_hp = '08' + Math.floor(1000000000 + Math.random() * 9000000000);
  const loc = locations[Math.floor(Math.random() * locations.length)];
  
  petaniList.push({
    petani_id: '', // Will be assigned after sort
    nama_petani,
    no_hp: String(no_hp),
    alamat: loc,
    status_aktif: true,
    desa_kecamatan: loc,
    tanggal_daftar,
    catatan: 'Petani mitra aktif',
    statistik: {
      total_setoran_bal: Math.floor(Math.random() * 100),
      total_berat_kg: Math.floor(Math.random() * 4000),
      kunjungan_terakhir: '2026-08-15',
      grade_dominan: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
    }
  });
}

// Sort chronologically
petaniList.sort((a, b) => new Date(a.tanggal_daftar).getTime() - new Date(b.tanggal_daftar).getTime());

// Assign structured IDs based on chronological order per year
const sortedCounts = {};
petaniList.forEach(p => {
    const year = p.tanggal_daftar.split('-')[0];
    if (!sortedCounts[year]) sortedCounts[year] = 0;
    sortedCounts[year]++;
    p.petani_id = `PTN-${year}-${String(sortedCounts[year]).padStart(3, '0')}`;
});

const fileContent = `import { Petani } from '../types';\n\nexport const INITIAL_PETANI_DATA: Petani[] = ${JSON.stringify(petaniList, null, 2)};\n`;

fs.writeFileSync('src/data/initialPetaniData.ts', fileContent);
console.log('Successfully generated 43 Petani data.');

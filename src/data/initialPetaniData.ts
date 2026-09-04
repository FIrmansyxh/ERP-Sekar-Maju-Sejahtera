import { Petani } from '../types';

export const MADURA_LOCATIONS = [
  { desa: 'Desa Guluk-Guluk', kec: 'Kec. Guluk-Guluk', kab: 'Kab. Sumenep' },
  { desa: 'Desa Ganding', kec: 'Kec. Ganding', kab: 'Kab. Sumenep' },
  { desa: 'Desa Prancak', kec: 'Kec. Pasongsongan', kab: 'Kab. Sumenep' },
  { desa: 'Desa Ambunten Timur', kec: 'Kec. Ambunten', kab: 'Kab. Sumenep' },
  { desa: 'Desa Kadur', kec: 'Kec. Kadur', kab: 'Kab. Pamekasan' },
  { desa: 'Desa Pakong', kec: 'Kec. Pakong', kab: 'Kab. Pamekasan' },
  { desa: 'Desa Waru Barat', kec: 'Kec. Waru', kab: 'Kab. Pamekasan' },
  { desa: 'Desa Ketapang Daya', kec: 'Kec. Ketapang', kab: 'Kab. Sampang' },
  { desa: 'Desa Banyuates', kec: 'Kec. Banyuates', kab: 'Kab. Sampang' },
  { desa: 'Desa Blega', kec: 'Kec. Blega', kab: 'Kab. Bangkalan' }
];

export const PETANI_NAMES = [
  'H. Achmad Syafi\'i', 'Mat Rais', 'H. Moh. Thohir', 'Bunawi', 'H. Syamsul Arifin',
  'Mat Nawawi', 'Abd. Rasyid', 'H. Fathurrosi', 'Mat Sani', 'H. Supandi',
  'Moch. Zainal', 'H. Mahrus Ali', 'Marzuki', 'H. Abdul Karim', 'Mat Dahlan',
  'H. Bahruddin', 'Muksin', 'H. Hasan Basri', 'Mat Salim', 'H. Munawar'
];

export const INITIAL_PETANI_DATA: Petani[] = [];

let seed = 42;
const pseudoRandom = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

for (let i = 0; i < PETANI_NAMES.length; i++) {
  const loc = MADURA_LOCATIONS[i % MADURA_LOCATIONS.length];
  INITIAL_PETANI_DATA.push({
    petani_id: `PTN-00${i + 1}`,
    nama_petani: PETANI_NAMES[i],
    no_hp: `081234567${String(i).padStart(3, '0')}`,
    alamat: `${loc.desa}, ${loc.kec}, ${loc.kab}`,
    desa_kecamatan: `${loc.desa}, ${loc.kec}, ${loc.kab}`,
    status_aktif: true,
    nomor_kartu: `3529${String(pseudoRandom()).substring(2, 14)}`
  });
}

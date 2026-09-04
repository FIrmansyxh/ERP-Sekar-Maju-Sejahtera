import { TabelHarga } from '../types';

export const GRADE_COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string; hex: string; label?: string }> = {
  'A': { bg: 'bg-zinc-900', text: 'text-white', border: 'border-zinc-950', badge: 'bg-zinc-900 text-white border border-zinc-950', hex: '#18181b', label: 'Super' },
  'B': { bg: 'bg-zinc-800', text: 'text-zinc-100', border: 'border-zinc-700', badge: 'bg-zinc-800 text-zinc-100 border border-zinc-700', hex: '#27272a', label: 'Premium' },
  'C': { bg: 'bg-zinc-200', text: 'text-zinc-900', border: 'border-zinc-300', badge: 'bg-zinc-200 text-zinc-900 border border-zinc-300', hex: '#e4e4e7', label: 'Standar' },
  'D': { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300', badge: 'bg-zinc-100 text-zinc-700 border border-zinc-300', hex: '#f4f4f5', label: 'Medium' },
  'E': { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', badge: 'bg-zinc-50 text-zinc-600 border border-zinc-200', hex: '#fafafa', label: 'Ekonomis' },
  'F': { bg: 'bg-white', text: 'text-zinc-500', border: 'border-zinc-200', badge: 'bg-white text-zinc-500 border border-zinc-200', hex: '#ffffff', label: 'Campuran' },
};

export const INITIAL_HARGA_DATA: TabelHarga[] = [
  {
    harga_id: 'HRG-2026-001',
    kode_grade: 'A',
    nama_grade: 'Grade A (Super - Top Leaves)',
    warna_badge: 'emerald',
    harga_per_kg: 140000,
    ketentuan: 'Daun mahkota atas, warna kuning keemasan berkilau, minyak tinggi, aroma tembakau harum pekat tanpa cacat.',
    tanggal_berlaku: '2026-08-01',
    status: 'aktif',
    dibuat_oleh: 'Kepala Gudang (Bambang Sutrisno, S.T.)',
    deskripsi: 'Kualitas tertinggi untuk rokok kretek premium & ekspor.',
  },
  {
    harga_id: 'HRG-2026-002',
    kode_grade: 'B',
    nama_grade: 'Grade B (Premium - Upper Middle)',
    warna_badge: 'amber',
    harga_per_kg: 120000,
    ketentuan: 'Daun tengah atas, elastisitas tinggi, pembakaran sempurna, kadar nikotin seimbang.',
    tanggal_berlaku: '2026-08-01',
    status: 'aktif',
    dibuat_oleh: 'Kepala Gudang (Bambang Sutrisno, S.T.)',
    deskripsi: 'Kualitas daun tengah dengan rajangan halus dan merata.',
  },
  {
    harga_id: 'HRG-2026-003',
    kode_grade: 'C',
    nama_grade: 'Grade C (Standar - Middle Leaves)',
    warna_badge: 'blue',
    harga_per_kg: 100000,
    ketentuan: 'Daun bagian tengah, rajangan merata, warna cokelat kemerahan cerah, kadar air stabil.',
    tanggal_berlaku: '2026-08-01',
    status: 'aktif',
    dibuat_oleh: 'Kepala Gudang (Bambang Sutrisno, S.T.)',
    deskripsi: 'Grade standar industri rokok kretek reguler.',
  },
  {
    harga_id: 'HRG-2026-004',
    kode_grade: 'D',
    nama_grade: 'Grade D (Medium - Lower Middle)',
    warna_badge: 'purple',
    harga_per_kg: 80000,
    ketentuan: 'Daun agak bawah, tekstur sedikit tebal, aroma sedang, cocok untuk blend rokok kretek filter.',
    tanggal_berlaku: '2026-08-01',
    status: 'aktif',
    dibuat_oleh: 'Kepala Gudang (Bambang Sutrisno, S.T.)',
    deskripsi: 'Tembakau rajangan kelas menengah ke bawah.',
  },
  {
    harga_id: 'HRG-2026-005',
    kode_grade: 'E',
    nama_grade: 'Grade E (Ekonomis - Bottom Leaves)',
    warna_badge: 'slate',
    harga_per_kg: 60000,
    ketentuan: 'Daun pasir/bawah, warna kecokelatan kusam, aroma ringan, toleransi batang halus tipis.',
    tanggal_berlaku: '2026-08-01',
    status: 'aktif',
    dibuat_oleh: 'Kepala Gudang (Bambang Sutrisno, S.T.)',
    deskripsi: 'Daun bawah tanaman tembakau dengan kadar nikotin ringan.',
  },
  {
    harga_id: 'HRG-2026-006',
    kode_grade: 'F',
    nama_grade: 'Grade F (Campuran / Afkir)',
    warna_badge: 'rose',
    harga_per_kg: 40000,
    ketentuan: 'Daun campuran panen akhir, warna belang/kering matahari tidak merata.',
    tanggal_berlaku: '2026-08-01',
    status: 'aktif',
    dibuat_oleh: 'Kepala Gudang (Bambang Sutrisno, S.T.)',
    deskripsi: 'Tembakau kualitas campuran atau afkir seleksi.',
  },
];

export function hitungSimulasiHarga(
  hargaPerKg: number,
  beratTerukurKg: number = 45,
  jenisTimbang: 'bruto' | 'netto' = 'bruto',
  isGantiTikar: boolean = false
) {
  // Tara Timbangan:
  // < 50kg: 2kg (ganti) / 3kg (madura/bawaan)
  // 50-59kg: 3kg (ganti) / 4kg (madura/bawaan)
  // >= 60kg: 4kg (ganti) / 5kg (madura/bawaan)
  let potonganTaraKg = 0;
  if (jenisTimbang === 'bruto') {
    if (beratTerukurKg < 50) {
      potonganTaraKg = isGantiTikar ? 2 : 3;
    } else if (beratTerukurKg < 60) {
      potonganTaraKg = isGantiTikar ? 3 : 4;
    } else {
      potonganTaraKg = isGantiTikar ? 4 : 5;
    }
  }
  const beratNettoFinalKg = Math.max(0, beratTerukurKg - potonganTaraKg);

  // Potongan Rupiah:
  // - Potongan kuli: Rp 7.000
  // - Potongan tali: Rp 3.000
  // - Jika ganti tikar: Rp 75.000
  const potonganKuli = 7000;
  const potonganTali = 3000;
  const potonganTikar = isGantiTikar ? 75000 : 0;
  const totalPotongan = potonganKuli + potonganTali + potonganTikar;

  // Rumus:
  // Subtotal Harga Beli = Berat Netto Final * Harga per Kg
  // Total Bayar = Subtotal Harga Beli - Total Potongan
  const totalHargaBeli = Math.round(beratNettoFinalKg * hargaPerKg);
  const hargaFinal = Math.max(0, totalHargaBeli - totalPotongan);

  return {
    jenisTimbang,
    beratTerukurKg,
    potonganTaraKg,
    beratNettoFinalKg,
    hargaPerKg,
    totalHargaBeli,
    totalKotor: totalHargaBeli, // alias
    potonganKuli,
    potonganTali,
    potonganTikar,
    potonganBal: potonganTikar, // alias
    totalPotongan,
    hargaFinal,
  };
}


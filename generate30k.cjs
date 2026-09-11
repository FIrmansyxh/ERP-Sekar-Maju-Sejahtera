const fs = require('fs');

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (num, size) => String(num).padStart(size, '0');

const grades = [
  { kode: '30', harga: 30000 },
  { kode: '31', harga: 31000 },
  { kode: '32', harga: 32000 },
  { kode: '45', harga: 45000 },
  { kode: '46', harga: 46000 }
];

const petaniList = [];
for(let i=1; i<=15; i++) {
  petaniList.push({
    petani_id: `PTN-2022-${pad(i,3)}`,
    nama_petani: `Petani ${String.fromCharCode(64+i)}`,
    no_hp: `081234567${pad(i,3)}`,
    alamat: `Desa ${i}, Pamekasan`,
    status_aktif: true,
    desa_kecamatan: `Desa ${i}, Pamekasan`,
    tanggal_daftar: "2022-06-28",
    catatan: "",
    statistik: { total_setoran_bal: 0, total_berat_kg: 0 }
  });
}

const transaksiList = [];
const barangList = [];

let totalBales = 0;
const TARGET_BALES = 30000;
let kuponIndex = 1;
let petaniIndex = 0;

let counters = { SB: 1, HF: 1, T: 1 };
const prefixes = ['SB', 'HF', 'T'];

let belumDitimbangCount = 0;
let belumDibayarCount = 0;

while (totalBales < TARGET_BALES) {
  let balesCount = randInt(12, 46);
  if (totalBales + balesCount > TARGET_BALES) {
    balesCount = TARGET_BALES - totalBales;
  }

  const petani = petaniList[petaniIndex % petaniList.length];
  const kuponId = `KUP${pad(kuponIndex, 4)}`;
  const txId = `TRX-11092026-${pad(kuponIndex, 3)}`; // Using date-based TX format

  let statusTx = 'lengkap';
  let statusBayar = 'lunas';
  let statusTahap = 'lengkap';

  if (belumDitimbangCount < 2) {
    statusTx = 'menunggu';
    statusTahap = 'menunggu_timbang';
    statusBayar = 'belum_lunas';
    belumDitimbangCount++;
  } else if (belumDibayarCount < 3) {
    statusTx = 'lengkap';
    statusTahap = 'lengkap';
    statusBayar = 'belum_lunas';
    belumDibayarCount++;
  }

  const isWeighed = statusTahap === 'lengkap';
  const items = [];
  let txTotalBruto = 0;
  let txTotalNetto = 0;
  let txTotalKotor = 0;
  let txTotalPotongan = 0;
  let txTotalTara = 0;
  let txTotalPotTikar = 0;
  let txTotalPotKuli = 0;
  let txTotalPotTali = 0;
  let txHargaFinal = 0;

  const mainGrade = grades[randInt(0, grades.length - 1)];
  let combinedBalNames = [];

  for (let i = 0; i < balesCount; i++) {
    const pfx = prefixes[randInt(0, prefixes.length - 1)];
    const balNo = `${pfx}${pad(counters[pfx]++, 4)}`;
    combinedBalNames.push(balNo);

    const grade = grades[randInt(0, grades.length - 1)];

    if (!isWeighed) {
      items.push({
        item_id: `itm-${txId}-${i+1}`,
        no_bal: balNo,
        kode_grade: grade.kode,
        harga_per_kg: grade.harga,
        berat_bruto_kg: 0,
        potongan_tara_kg: 0,
        berat_kg: 0,
        potongan_kuli: 0,
        potongan_tali: 0,
        potongan_tikar: 0,
        potongan: 0,
        total_kotor: 0,
        subtotal_bersih: 0,
        status_timbang: 'menunggu_timbang',
        ganti_tikar: false
      });
    } else {
      const isGantiTikar = Math.random() > 0.8;
      const potTikar = isGantiTikar ? 75000 : 0;
      const bruto = randInt(40, 55);
      const tara = isGantiTikar ? 2 : 1.5;
      const netto = bruto - tara;
      const totalKotor = Math.round(netto * grade.harga);
      const potKuli = 7000;
      const potTali = 3000;
      const totalPot = potKuli + potTali + potTikar;
      const subtotal = Math.max(0, totalKotor - totalPot);

      txTotalBruto += bruto;
      txTotalNetto += netto;
      txTotalKotor += totalKotor;
      txTotalPotongan += totalPot;
      txHargaFinal += subtotal;
      txTotalTara += tara;
      txTotalPotTikar += potTikar;
      txTotalPotKuli += potKuli;
      txTotalPotTali += potTali;

      items.push({
        item_id: `itm-${txId}-${i+1}`,
        barang_id: `BRG-${balNo}`,
        no_bal: balNo,
        kode_grade: grade.kode,
        harga_per_kg: grade.harga,
        berat_bruto_kg: bruto,
        potongan_tara_kg: tara,
        berat_kg: netto,
        potongan_kuli: potKuli,
        potongan_tali: potTali,
        potongan_tikar: potTikar,
        potongan: totalPot,
        total_kotor: totalKotor,
        subtotal_bersih: subtotal,
        status_timbang: 'selesai',
        ganti_tikar: isGantiTikar,
        lokasi_simpan: 'Gudang Utama Pamekasan'
      });

      barangList.push({
        barang_id: `BRG-${balNo}`,
        no_bal: balNo,
        kode_grade: grade.kode,
        berat_kg: netto,
        harga_beli_per_kg: grade.harga,
        total_harga_beli: subtotal,
        status_stok: 'tersedia',
        lokasi_simpan: 'Gudang Utama Pamekasan',
        petani_id: petani.petani_id,
        nama_petani: petani.nama_petani,
        tanggal_masuk: "2026-09-11",
        transaksi_id: txId
      });

      petani.statistik.total_setoran_bal += 1;
      petani.statistik.total_berat_kg += netto;
    }
  }

  transaksiList.push({
    transaksi_id: txId,
    no_kupon: kuponId,
    petani_id: petani.petani_id,
    nama_petani: petani.nama_petani,
    no_hp: petani.no_hp,
    desa_kecamatan: petani.desa_kecamatan,
    no_bal: combinedBalNames.slice(0, 3).join(', ') + (combinedBalNames.length > 3 ? '...' : ''),
    kode_grade: mainGrade.kode,
    total_bal: balesCount,
    bal_selesai_timbang: isWeighed ? balesCount : 0,
    berat_kg: txTotalNetto,
    berat_terukur_kg: txTotalNetto,
    harga_per_kg: mainGrade.harga,
    total_kotor: txTotalKotor,
    total_potongan: txTotalPotongan,
    potongan_tikar: txTotalPotTikar,
    total_harga_beli: txTotalKotor,
    harga_final: txHargaFinal,
    status_transaksi: statusTx,
    status_tahap: statusTahap,
    status_pembayaran: statusBayar,
    metode_pembayaran: statusBayar === 'lunas' ? 'cash' : undefined,
    tanggal_transaksi: "2026-09-11 08:00:00",
    lokasi_gudang: 'Gudang Utama Pamekasan',
    items: items
  });

  totalBales += balesCount;
  kuponIndex++;
  petaniIndex++;
}

fs.writeFileSync('src/data/initialPetaniData.ts', `import { Petani } from "../types";\nexport const INITIAL_PETANI_DATA: Petani[] = ${JSON.stringify(petaniList, null, 2)};`);
fs.writeFileSync('src/data/initialTransaksiData.ts', `import { TransaksiPembelian } from "../types";\nexport const INITIAL_TRANSAKSI_DATA: TransaksiPembelian[] = ${JSON.stringify(transaksiList, null, 2)};`);
fs.writeFileSync('src/data/initialBarangData.ts', `import { Barang } from "../types";\nexport const INITIAL_BARANG_DATA: Barang[] = ${JSON.stringify(barangList, null, 2)};`);

console.log(`Generated ${transaksiList.length} Kupons, ${totalBales} Bales.`);
console.log(`SB: ${counters.SB-1}, HF: ${counters.HF-1}, T: ${counters.T-1}`);

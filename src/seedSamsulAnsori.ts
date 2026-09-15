import { loadPetaniData, savePetaniData, loadTransaksiData, saveTransaksiData, loadBarangData, saveBarangData } from './utils/storage';
import { Petani, TransaksiPembelian, TransaksiItemBal, Barang } from './types';
import { generateTransaksiId } from './utils/formatters';

export function seedSamsulAnsori() {
  const petaniList = loadPetaniData();
  let samsul = petaniList.find(p => p.nama_petani === 'Samsul Ansori');
  
  if (!samsul) {
    samsul = {
      petani_id: `PTN-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      nama_petani: 'Samsul Ansori',
      no_hp: '081234567899',
      alamat: 'Dsn. Sumber Waru',
      desa_kecamatan: 'Ds. Palengaan Laok, Kec. Palengaan',
      status_aktif: true,
      tanggal_daftar: new Date().toISOString().split('T')[0],
    };
    savePetaniData([...petaniList, samsul]);
  }

  const existingTx = loadTransaksiData();
  const existingBarangs = loadBarangData();

  // Check if Samsul's transaction exists but has old SB/HF as kode_grade
  const samsulTxIndex = existingTx.findIndex(tx => tx.petani_id === samsul!.petani_id && tx.total_bal === 46);
  
  if (samsulTxIndex !== -1) {
    const tx = existingTx[samsulTxIndex];
    const hasWrongGrade = tx.items?.some(it => it.kode_grade === 'SB' || it.kode_grade === 'HF');
    
    if (hasWrongGrade) {
      // Migrate existing transaction and barangs
      const updatedItems = (tx.items || []).map((it, idx) => {
        const isSB = it.kode_grade === 'SB' || it.no_bal.toUpperCase().includes('SB') || idx % 2 === 0;
        const noBal = it.no_bal.toUpperCase().startsWith('SB') || it.no_bal.toUpperCase().startsWith('HF')
          ? it.no_bal
          : `${isSB ? 'SB' : 'HF'}-${String(idx + 1).padStart(2, '0')}`;
        const price = it.harga_per_kg || (isSB ? 55000 : 45000);
        const gradeCode = String(Math.round(price / 1000));
        return {
          ...it,
          no_bal: noBal,
          kode_grade: gradeCode,
        };
      });

      existingTx[samsulTxIndex] = {
        ...tx,
        items: updatedItems,
      };
      saveTransaksiData([...existingTx]);

      // Also migrate associated barangs
      const updatedBarangs = existingBarangs.map((b) => {
        if (b.petani_id === samsul!.petani_id && (b.kode_grade === 'SB' || b.kode_grade === 'HF')) {
          const isSB = b.kode_grade === 'SB';
          const price = b.harga_per_kg || (isSB ? 55000 : 45000);
          const gradeCode = String(Math.round(price / 1000));
          const noBal = b.no_bal.toUpperCase().startsWith('SB') || b.no_bal.toUpperCase().startsWith('HF')
            ? b.no_bal
            : `${isSB ? 'SB' : 'HF'}-${b.no_bal}`;
          return {
            ...b,
            no_bal: noBal,
            kode_grade: gradeCode,
          };
        }
        return b;
      });
      saveBarangData(updatedBarangs);
    }
    return;
  }

  const currentDate = new Date().toISOString().split('T')[0];
  const txId = generateTransaksiId(currentDate, existingTx);
  const noKupon = `KUP-${String(existingTx.length + 1).padStart(3, '0')}`;

  const items: TransaksiItemBal[] = [];
  const barangs: Barang[] = [];
  let totalKotor = 0;

  for (let i = 1; i <= 46; i++) {
    const isSB = i % 2 === 0;
    const weight = Math.floor(Math.random() * 15) + 45; // 45 to 59 kg
    const gantiTikar = Math.random() > 0.5; // randomize ganti tikar
    
    // Potongan tara: bal SB = 2kg rata
    const potonganTara = isSB ? 2 : (weight <= 49 ? 3 : (weight <= 59 ? 5 : 6));
    const netto = weight - potonganTara;
    const basePrice = isSB ? 55000 : 45000;
    const price = basePrice + (Math.floor(Math.random() * 5) * 1000); 
    // Kode harga beli dari Master Harga Beli (e.g. 55, 56, 45, 46)
    const gradeCode = String(Math.round(price / 1000));
    // SB dan HF adalah kode bal (No Bal)
    const noBal = `${isSB ? 'SB' : 'HF'}-${String(i).padStart(2, '0')}`;

    const potTikar = gantiTikar ? 75000 : 0;
    const potKuli = 7000;
    const potTali = 3000;
    const potongan = potKuli + potTali + potTikar;
    
    const kotor = netto * price;
    const bersih = kotor - potongan;

    const itemId = `BAL-${i.toString().padStart(3, '0')}`;
    const barangId = `BRG-${txId.replace('TRX-', '')}-${itemId}`;
    
    totalKotor += kotor;

    items.push({
      item_id: itemId,
      no_bal: noBal,
      kode_grade: gradeCode,
      harga_per_kg: price,
      ganti_tikar: gantiTikar,
      potongan_tikar: potTikar,
      berat_bruto_kg: weight,
      potongan_tara_kg: potonganTara,
      berat_kg: netto,
      barang_id: barangId,
      potongan_kuli: potKuli,
      potongan_tali: potTali,
      potongan: potongan,
      total_kotor: kotor,
      subtotal_bersih: bersih,
    });

    barangs.push({
      barang_id: barangId,
      kode_grade: gradeCode,
      no_bal: noBal,
      berat_kg: netto,
      harga_per_kg: price,
      total_harga: netto * price,
      berat_bruto_kg: weight,
      potongan_tara_kg: potonganTara,
      status_stok: 'di_gudang',
      tanggal_masuk: currentDate,
      petani_id: samsul.petani_id,
      nama_petani: samsul.nama_petani,
      desa_kecamatan: samsul.desa_kecamatan,
      transaksi_pembelian_id: txId,
      catatan: `Bruto: ${weight}kg, Tara: ${potonganTara}kg (${gantiTikar ? 'Ganti Tikar' : 'Tikar Standar'})`
    });
  }

  const totalBeratBruto = items.reduce((sum, item) => sum + (item.berat_bruto_kg || 0), 0);
  const totalTaraKg = items.reduce((sum, item) => sum + (item.potongan_tara_kg || 0), 0);
  const totalBerat = items.reduce((sum, item) => sum + (item.berat_kg || 0), 0);
  
  const totalPotKuli = items.reduce((sum, item) => sum + (item.potongan_kuli || 0), 0);
  const totalPotTali = items.reduce((sum, item) => sum + (item.potongan_tali || 0), 0);
  const totalPotTikar = items.reduce((sum, item) => sum + (item.potongan_tikar || 0), 0);
  const totalPotongan = totalPotKuli + totalPotTali + totalPotTikar;
  
  const totalSubNilai = items.reduce((sum, item) => sum + (item.total_kotor || 0), 0);
  const totalNilaiBersih = items.reduce((sum, item) => sum + (item.subtotal_bersih || 0), 0);

  const newTx: TransaksiPembelian = {
    transaksi_id: txId,
    no_kupon: noKupon,
    petani_id: samsul.petani_id,
    nama_petani: samsul.nama_petani,
    desa_kecamatan: samsul.desa_kecamatan,
    no_hp: samsul.no_hp,
    no_bal: '1-46',
    kode_grade: 'Multi-Grade',
    total_bal: 46,
    bal_selesai_timbang: 46,
    items,
    barang_ids: barangs.map(b => b.barang_id),
    jenis_timbang: 'bruto',
    berat_terukur_kg: totalBeratBruto,
    potongan_tara_kg: totalTaraKg,
    berat_kg: totalBerat,
    harga_per_kg: 0, 
    total_kotor: totalSubNilai,
    total_harga_beli: totalSubNilai,
    potongan_kuli: totalPotKuli,
    potongan_tali: totalPotTali,
    potongan_tikar: totalPotTikar,
    total_potongan: totalPotongan,
    harga_final: totalNilaiBersih,
    status_transaksi: 'lengkap',
    status_tahap: 'lengkap',
    status_pembayaran: 'belum_lunas',
    tanggal_transaksi: currentDate,
    operator_nama: 'Admin',
  };

  saveTransaksiData([...existingTx, newTx]);
  saveBarangData([...loadBarangData(), ...barangs]);
}

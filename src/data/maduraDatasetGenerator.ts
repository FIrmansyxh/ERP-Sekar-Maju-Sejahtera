import { 
  Petani, 
  Barang, 
  TransaksiPembelian, 
  TransaksiItemBal, 
  PengirimanBarang, 
  PengirimanSample,
  BatchPengirimanSample,
  SampleItemDetail,
  Gudang,
  TabelHarga,
  MasterHargaJual
} from '../types';

export interface GeneratorResult {
  petaniList: Petani[];
  barangList: Barang[];
  transaksiList: TransaksiPembelian[];
  pengirimanList: PengirimanBarang[];
  sampleList: PengirimanSample[];
  batchSampleList: BatchPengirimanSample[];
  gudangList: Gudang[];
  hargaBeliList: TabelHarga[];
  hargaJualList: MasterHargaJual[];
}

export function generateMaduraTobaccoDataset(): GeneratorResult {
  let seed = 100;
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const gudangList: Gudang[] = [
    { gudang_id: 'GDG-PMK-01', kode_gudang: 'GDG-PMK-01', nama_gudang: 'Gudang Pusat Induk & Intake Pamekasan', unit_cabang: 'Pamekasan', alamat: 'Pamekasan', kapasitas_bal: 5000, kepala_gudang: 'Bambang', kontak: '081234', status_aktif: true },
    { gudang_id: 'GDG-PMK-02', kode_gudang: 'GDG-PMK-02', nama_gudang: 'Gudang Intake Timur Pamekasan', unit_cabang: 'Pamekasan', alamat: 'Pamekasan', kapasitas_bal: 5000, kepala_gudang: 'Siti', kontak: '081235', status_aktif: true },
    { gudang_id: 'GDG-SMP-01', kode_gudang: 'GDG-SMP-01', nama_gudang: 'Gudang Penyangga Sumenep', unit_cabang: 'Sumenep', alamat: 'Sumenep', kapasitas_bal: 3000, kepala_gudang: 'Budi', kontak: '081236', status_aktif: true },
    { gudang_id: 'GDG-SBY-01', kode_gudang: 'GDG-SBY-01', nama_gudang: 'Gudang Distribusi Surabaya', unit_cabang: 'Surabaya', alamat: 'Surabaya', kapasitas_bal: 10000, kepala_gudang: 'Agus', kontak: '081237', status_aktif: true }
  ];

  const hargaBeliList: TabelHarga[] = [];
  const hargaJualList: MasterHargaJual[] = [];
  const grades = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const basePrice = 25000;
  for (let i = 0; i < 10; i++) {
    const price = basePrice + (i * 5000); 
    const grade = grades[i];
    hargaBeliList.push({
      harga_id: `HB-${i+1}`,
      kode_grade: `B${i+1}`,
      nama_grade: `Grade Beli ${i+1}`,
      warna_badge: 'blue',
      harga_per_kg: price,
      tanggal_berlaku: '2022-06-01',
      status: 'aktif',
      dibuat_oleh: 'System'
    });
    hargaJualList.push({
      harga_jual_id: `HJ-${i+1}`,
      kode: `J${i+1}`,
      harga_jual: price,
      tanggal_berlaku: '2022-06-01',
      keterangan: `Harga Jual ${i+1}`,
      status_aktif: true
    });
  }

  const petaniList: Petani[] = [];
  const farmerDistribution = [
    { year: 2022, count: 17 },
    { year: 2023, count: 13 },
    { year: 2024, count: 13 },
    { year: 2025, count: 14 },
  ];
  farmerDistribution.forEach(d => {
    for (let i = 1; i <= d.count; i++) {
      const nameIndex = (petaniList.length) % 65;
      const realName = ["Abdullah","Ahmad","Amin","Amir","Anwar","Arifin","Azis","Bahrudin","Basri","Budi Santoso","Dhofir","Djumadi","Fadil","Faruq","Fauzi","Ghozali","Habib","Hadi","Hafid","Hasan Basri","Hasyim","Husen","Ibrahim","Imam","Ismail","Jalal","Jamil","Junaidi","Kamarudin","Kholil","Lutfi","Mahfud","Mansyur","Muis","Mujib","Mukhlis","Munir","Mustofa","Nawawi","Nurkholis","Qosim","Rahman","Rasyid","Rizal","Romli","Roni","Saifuddin","Samsudin","Sanusi","Sholeh","Subaidi","Sudar","Supriyadi","Syaiful","Syukur","Taufiq","Tohir","Wahab","Wahid","Wawan","Yasin","Yunus","Yusuf","Zainal","Zaini"][nameIndex];
      petaniList.push({
        petani_id: `PTN-${d.year}-${String(i).padStart(2, '0')}`,
        nama_petani: realName,
        nomor_kartu: `KRT-${d.year}-${String(i).padStart(4, '0')}`,
        desa_kecamatan: 'Madura',
        alamat: 'Desa Tembakau, Madura',
        no_hp: '0812345678',
        status_aktif: true
      });
    }
  });

  const trxCount = 345;
  const totalBals = 9255;
  const balCounts = new Array(trxCount).fill(19);
  let remainingBals = totalBals - (19 * trxCount); 
  for(let i=0; i<remainingBals; i++) {
     let idx = Math.floor(pseudoRandom() * trxCount);
     while (balCounts[idx] >= 39) {
        idx = (idx + 1) % trxCount;
     }
     balCounts[idx]++;
  }

  const barangList: Barang[] = [];
  const transaksiList: TransaksiPembelian[] = [];
  const startTrxId = 124;
  const startKupon = 125;
  const startDate = new Date('2022-06-01T08:00:00Z').getTime();
  const endDate = new Date('2026-09-01T08:00:00Z').getTime();
  const totalMs = endDate - startDate;

  let currentBalGlobal = 1;
  const KODE_BALS = ['SB', 'HS', 'ST'];

  for (let i = 0; i < trxCount; i++) {
    const trxId = `TRX-${String(startTrxId + i).padStart(4, '0')}`;
    const kuponId = `KUP${String(startKupon + i).padStart(4, '0')}`;
    const trxTime = startDate + ((i / trxCount) * totalMs);
    const trxDateStr = new Date(trxTime).toISOString();
    
    const petani = petaniList[Math.floor(pseudoRandom() * petaniList.length)];
    const numBals = balCounts[i];

    const trxItems: TransaksiItemBal[] = [];
    let sumNetto = 0;
    let sumBruto = 0;
    let sumBeli = 0;

    const gradesInTrx = new Set<string>();
    let sumHargaPerKg = 0;
    for (let j = 0; j < numBals; j++) {
      const hargaBeli = hargaBeliList[Math.floor(pseudoRandom() * hargaBeliList.length)];
      gradesInTrx.add(hargaBeli.kode_grade);
      sumHargaPerKg += hargaBeli.harga_per_kg;
      const codeType = KODE_BALS[(currentBalGlobal - 1) % 3];
      const codeNum = Math.floor((currentBalGlobal - 1) / 3) + 1;
      const noBal = `${codeType}${String(codeNum).padStart(4, '0')}`;
      
      const beratBruto = Number((45 + pseudoRandom() * 10).toFixed(1));
      const netto = Number((beratBruto - 2).toFixed(1));
      sumBruto += beratBruto;
      sumNetto += netto;
      
      const totalKotor = netto * hargaBeli.harga_per_kg;
      const potongan = 10000; 
      const hargaFinal = totalKotor - potongan;
      sumBeli += hargaFinal;

      const gudangAssigned = gudangList[currentBalGlobal % gudangList.length];

      const barang: Barang = {
        barang_id: `BRG-${noBal}`,
        no_bal: noBal,
        petani_id: petani.petani_id,
        nama_petani: petani.nama_petani,
        kode_grade: hargaBeli.kode_grade,
        tanggal_masuk: trxDateStr,
        lokasi_gudang: gudangAssigned.nama_gudang,
        gudang_id: gudangAssigned.gudang_id,
        berat_bruto_kg: beratBruto,
        potongan_tara_kg: 2,
        berat_kg: netto,
        harga_per_kg: hargaBeli.harga_per_kg,
        total_harga: hargaFinal,
        status_stok: 'di_gudang'
      };
      
      barangList.push(barang);
      
      trxItems.push({
        item_id: barang.barang_id,
        no_bal: barang.no_bal,
        kode_grade: barang.kode_grade,
        berat_bruto_kg: beratBruto,
        potongan_tara_kg: 2,
        berat_kg: netto,
        harga_per_kg: barang.harga_per_kg || 0,
        potongan: potongan,
        total_kotor: totalKotor,
        subtotal_bersih: hargaFinal
      });

      currentBalGlobal++;
    }

    transaksiList.push({
      transaksi_id: trxId,
      no_kupon: kuponId,
      petani_id: petani.petani_id,
      nama_petani: petani.nama_petani,
      nomor_kartu: petani.nomor_kartu,
      desa_kecamatan: petani.desa_kecamatan,
      no_bal: `${trxItems[0].no_bal} - ${trxItems[trxItems.length-1].no_bal}`,
      kode_grade: Array.from(gradesInTrx).join(', '),
      tanggal_transaksi: trxDateStr.split('T')[0],
      total_bal: numBals,
      bal_selesai_timbang: numBals,
      items: trxItems,
      barang_ids: trxItems.map(t => t.item_id),
      jenis_timbang: 'bruto',
      berat_terukur_kg: Number(sumBruto.toFixed(1)),
      potongan_tara_kg: numBals * 2,
      berat_kg: Number(sumNetto.toFixed(1)),
      lokasi_gudang: gudangList[0].nama_gudang,
      harga_per_kg: Math.round(sumHargaPerKg / numBals),
      total_harga_beli: sumBeli,
      potongan_kuli: numBals * 7000,
      potongan_tikar: 0,
      total_potongan: numBals * (10000 + 7000),
      harga_final: sumBeli,
      status_transaksi: 'lengkap',
      operator_nama: 'Admin',
      status_pembayaran: 'lunas',
    });
  }

  const shippedCount = 6380;
  for (let i = 0; i < shippedCount; i++) {
    barangList[i].status_stok = 'keluar';
  }

  const batchSampleList: BatchPengirimanSample[] = [];
  const sampleList: PengirimanSample[] = [];
  const pengirimanList: PengirimanBarang[] = [];

  const totalBatches = 195;
  const cancelledCount = 4;
  const deliveringCount = 4;
  const completedCount = 187;

  let activeBatchCounts = new Array(191).fill(33);
  let remBatchItems = shippedCount - (33 * 191);
  for (let i = 0; i < remBatchItems; i++) activeBatchCounts[i]++;

  let currentItemIdx = 0;
  let activeBatchIdx = 0;

  for (let i = 0; i < totalBatches; i++) {
    let status = 'selesai';
    if (i < cancelledCount) status = 'dibatalkan';
    else if (i < cancelledCount + deliveringCount) status = 'dikirim';

    const batchId = `SPL${String(i + 1).padStart(4, '0')}`;
    const batchDate = new Date(startDate + ((i / totalBatches) * totalMs));
    const dateStr = batchDate.toISOString().split('T')[0];
    const sjId = `SJ-${dateStr.replace(/-/g, '')}-${String(i+1).padStart(3, '0')}`;

    let batchItems: SampleItemDetail[] = [];
    let doBarangIds: string[] = [];
    let selectedBals: Barang[] = [];
    let hargaDealMap: Record<string, number> = {};
    let kodeHargaJualMap: Record<string, string> = {};

    if (status === 'dibatalkan') {
      const randItem = barangList[shippedCount + i];
      if (randItem) {
        batchItems.push({
          sample_item_id: `SMP-${batchId}-1`,
          barang_id: randItem.barang_id,
          no_bal: randItem.no_bal,
          kode_grade: randItem.kode_grade,
          berat_bal_kg: randItem.berat_kg,
          harga_tawaran_kg: (randItem.harga_per_kg || 0) + 5000,
          status_item: 'ditolak'
        });
        selectedBals.push(randItem);
        sampleList.push({
          sample_id: `SMP-${batchId}-${1}`,
          batch_id: batchId,
          barang_id: randItem.barang_id,
          no_bal: randItem.no_bal,
          kode_grade: randItem.kode_grade,
          berat_sample_gram: 200,
          tanggal_kirim: dateStr,
          sumber: randItem.lokasi_gudang,
          tujuan: 'Pabrik A',
          dikirim_oleh: 'System',
          status: 'ditolak'
        });
      }
    } else {
      let numItems = activeBatchCounts[activeBatchIdx++];
      for (let k = 0; k < numItems; k++) {
        const item = barangList[currentItemIdx++];
        batchItems.push({
          sample_item_id: `SMP-${batchId}-${k+1}`,
          barang_id: item.barang_id,
          no_bal: item.no_bal,
          kode_grade: item.kode_grade,
          berat_bal_kg: item.berat_kg,
          harga_tawaran_kg: (item.harga_per_kg || 0) + 10000,
          status_item: status === 'dikirim' ? 'dikirim' : 'disetujui'
        });
        selectedBals.push(item);
        doBarangIds.push(item.barang_id);
        
        const hj = hargaJualList[Math.floor(pseudoRandom() * hargaJualList.length)];
        hargaDealMap[item.barang_id] = hj.harga_jual;
        kodeHargaJualMap[item.barang_id] = hj.kode;

        sampleList.push({
          sample_id: `SMP-${batchId}-${k+1}`,
          batch_id: batchId,
          barang_id: item.barang_id,
          no_bal: item.no_bal,
          kode_grade: item.kode_grade,
          berat_sample_gram: 200,
          tanggal_kirim: dateStr,
          sumber: item.lokasi_gudang,
          tujuan: 'Pabrik A',
          dikirim_oleh: 'System',
          status: status === 'dikirim' ? 'dikirim' : 'disetujui'
        });
      }
    }

    const totalKg = Number(selectedBals.reduce((sum, b) => sum + b.berat_kg, 0).toFixed(1));

    batchSampleList.push({
      batch_id: batchId,
      kode_batch: batchId,
      tujuan_buyer: 'Pabrik A',
      sumber_gudang: selectedBals[0]?.lokasi_gudang || 'Gudang Pusat',
      dikirim_oleh: 'System',
      tanggal_kirim: dateStr,
      status: status as any,
      items: batchItems,
      total_sample_bal: batchItems.length,
      total_bal_disetujui: status === 'selesai' ? batchItems.length : 0,
      total_bal_ditolak: status === 'dibatalkan' ? batchItems.length : 0,
      total_bal_nego: 0,
      total_estimasi_nilai: 0,
      total_nilai_deal: 0,
    });

    if (status !== 'dibatalkan') {
      pengirimanList.push({
        pengiriman_id: `DO-${batchId}`,
        no_surat_jalan: sjId,
        tujuan: 'Pabrik A',
        tanggal_kirim: dateStr,
        driver_nama: 'Supir A',
        plat_nomor: 'M 1234 XX',
        status: status as any,
        total_bal: batchItems.length,
        total_berat_kg: totalKg,
        barang_ids: doBarangIds,
        harga_deal_map: hargaDealMap,
        kode_harga_jual_map: kodeHargaJualMap
      });
    }
  }

  return {
    petaniList,
    barangList,
    transaksiList,
    pengirimanList,
    sampleList,
    batchSampleList,
    gudangList,
    hargaBeliList,
    hargaJualList
  };
}

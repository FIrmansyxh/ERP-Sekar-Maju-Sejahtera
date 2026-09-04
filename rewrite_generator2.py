import re

content = """import { 
  Petani, 
  Barang, 
  TransaksiPembelian, 
  TransaksiItemBal, 
  PengirimanBarang, 
  PengirimanSample,
  BatchPengirimanSample,
  SampleItemDetail
} from '../types';
import { INITIAL_PETANI_DATA } from './initialPetaniData';
import { INITIAL_HARGA_DATA } from './initialHargaData';

export interface GeneratorResult {
  petaniList: Petani[];
  barangList: Barang[];
  transaksiList: TransaksiPembelian[];
  pengirimanList: PengirimanBarang[];
  sampleList: PengirimanSample[];
  batchSampleList: BatchPengirimanSample[];
}

export function generateMaduraTobaccoDataset(): GeneratorResult {
  const petaniList: Petani[] = INITIAL_PETANI_DATA;
  const barangList: Barang[] = [];
  const transaksiList: TransaksiPembelian[] = [];
  const pengirimanList: PengirimanBarang[] = [];
  const sampleList: PengirimanSample[] = [];
  const batchSampleList: BatchPengirimanSample[] = [];

  const GRADE_PRICES: Record<string, number> = {};
  INITIAL_HARGA_DATA.forEach(h => {
    GRADE_PRICES[h.kode_grade] = h.harga_per_kg;
  });

  const KODE_BALS = ['SB', 'HS', 'ST'];
  const TOTAL_BALS = 1187;
  
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  let currentBal = 1;
  let trxCounter = 1;
  
  const grades = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  while (currentBal <= TOTAL_BALS) {
    let balCount = Math.floor(pseudoRandom() * 10) + 5;
    if (currentBal + balCount > TOTAL_BALS + 1) {
      balCount = (TOTAL_BALS + 1) - currentBal;
    }
    
    if (balCount <= 0) break;

    const petani = petaniList[Math.floor(pseudoRandom() * petaniList.length)] || petaniList[0];
    const transaksiId = `TRX-${String(trxCounter).padStart(4, '0')}`;
    const tanggalTrx = new Date(2023, 7, 1 + Math.floor(pseudoRandom() * 30)).toISOString();
    
    const trxItems: TransaksiItemBal[] = [];
    let totalHargaTrx = 0;
    let totalPotonganTrx = 0;
    let totalNettoTrx = 0;
    let totalBrutoTrx = 0;
    let totalTaraTrx = 0;
    
    for (let b = 0; b < balCount; b++) {
      const codeType = KODE_BALS[(currentBal - 1) % 3];
      const codeNum = Math.floor((currentBal - 1) / 3) + 1;
      const noBal = `${codeType}-${String(codeNum).padStart(4, '0')}`;
      const grade = grades[Math.floor(pseudoRandom() * grades.length)];
      const beratBruto = 45 + pseudoRandom() * 10;
      const netto = beratBruto - 2;
      const hargaPerKg = GRADE_PRICES[grade] || 100000;
      const totalKotor = netto * hargaPerKg;
      const potongan = 7000 + 3000; // kuli + tali
      const subtotalBersih = totalKotor - potongan;
      
      const barang: Barang = {
        barang_id: `BAL-${String(currentBal).padStart(4, '0')}`,
        kode_grade: grade,
        no_bal: noBal,
        berat_bruto_kg: Number(beratBruto.toFixed(2)),
        potongan_tara_kg: 2,
        berat_kg: Number(netto.toFixed(2)),
        harga_per_kg: hargaPerKg,
        total_harga: Math.round(subtotalBersih),
        status_stok: 'di_gudang',
        lokasi_gudang: 'Gudang Utama - Blok A',
        tanggal_masuk: tanggalTrx,
        petani_id: petani?.petani_id || 'PTN-001',
        nama_petani: petani?.nama_petani || 'Unknown',
        desa_kecamatan: petani?.desa_kecamatan || '',
        transaksi_pembelian_id: transaksiId
      };
      
      barangList.push(barang);
      trxItems.push({
        item_id: `ITM-${String(currentBal).padStart(4, '0')}`,
        barang_id: barang.barang_id,
        kode_grade: barang.kode_grade,
        no_bal: barang.no_bal,
        berat_bruto_kg: barang.berat_bruto_kg!,
        potongan_tara_kg: barang.potongan_tara_kg!,
        berat_kg: barang.berat_kg,
        harga_per_kg: barang.harga_per_kg!,
        ganti_tikar: false,
        potongan_kuli: 7000,
        potongan_tali: 3000,
        potongan_tikar: 0,
        potongan: potongan,
        total_kotor: totalKotor,
        subtotal_bersih: subtotalBersih,
        status_timbang: 'selesai_timbang',
        lokasi_simpan: barang.lokasi_gudang
      });
      
      totalBrutoTrx += barang.berat_bruto_kg!;
      totalNettoTrx += barang.berat_kg;
      totalTaraTrx += barang.potongan_tara_kg!;
      totalHargaTrx += totalKotor;
      totalPotonganTrx += potongan;
      currentBal++;
    }
    
    transaksiList.push({
      transaksi_id: transaksiId,
      no_kupon: `KUP-${String(trxCounter).padStart(3, '0')}`,
      petani_id: petani?.petani_id || 'PTN-001',
      nama_petani: petani?.nama_petani || 'Unknown',
      nomor_kartu: petani?.nomor_kartu || '-',
      desa_kecamatan: petani?.desa_kecamatan || '',
      tanggal_transaksi: tanggalTrx,
      berat_terukur_kg: Number(totalBrutoTrx.toFixed(2)),
      potongan_tara_kg: Number(totalTaraTrx.toFixed(2)),
      berat_kg: Number(totalNettoTrx.toFixed(2)),
      harga_per_kg: trxItems[0].harga_per_kg,
      total_kotor: totalHargaTrx,
      potongan_kuli: trxItems.length * 7000,
      potongan_tali: trxItems.length * 3000,
      potongan_tikar: 0,
      total_potongan: totalPotonganTrx,
      total_harga_beli: totalHargaTrx,
      harga_final: totalHargaTrx - totalPotonganTrx,
      status_pembayaran: 'lunas',
      operator_nama: "Sistem",
      items: trxItems,
      no_bal: trxItems.map(it => it.no_bal).join(', '),
      kode_grade: trxItems[0].kode_grade,
      lokasi_gudang: 'Gudang Utama - Blok A',
      status_transaksi: 'lengkap',
      status_tahap: 'lengkap',
      jenis_timbang: 'bruto',
      total_bal: trxItems.length,
      bal_selesai_timbang: trxItems.length
    });
    
    trxCounter++;
  }
  
  return {
    petaniList,
    barangList,
    transaksiList,
    pengirimanList,
    sampleList,
    batchSampleList
  };
}
"""

with open('src/data/maduraDatasetGenerator.ts', 'w') as f:
    f.write(content)

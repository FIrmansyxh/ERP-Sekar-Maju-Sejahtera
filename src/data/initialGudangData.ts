import { Gudang } from '../types';

export const INITIAL_GUDANG_DATA: Gudang[] = [
  {
    gudang_id: 'PMK-01',
    kode_gudang: 'PMK-01',
    nama_gudang: 'Gudang Utama Pamekasan',
    alamat: 'Jl. Raya Pamekasan - Sumenep KM 4, Pamekasan, Madura',
    kapasitas_bal: 10000,
    kepala_gudang: 'Ahmad Fauzi, S.P.',
    kontak: '0812-3456-7801',
    status_aktif: true,
    deskripsi: 'Gudang Penerimaan Utama & Sortir Tembakau Pamekasan',
  },
  {
    gudang_id: 'PMK-02',
    kode_gudang: 'PMK-02',
    nama_gudang: 'Gudang Produksi Rokok',
    alamat: 'Kawasan Industri Tembakau Pamekasan Blok C, Madura',
    kapasitas_bal: 5000,
    kepala_gudang: 'Bambang Supriyanto',
    kontak: '0812-3456-7802',
    status_aktif: true,
    deskripsi: 'Gudang Pengolahan & Bahan Baku Produksi Rokok',
  },
  {
    gudang_id: 'SMP-01',
    kode_gudang: 'SMP-01',
    nama_gudang: 'Gudang Sumenep',
    alamat: 'Jl. Trunojoyo No. 88, Sumenep, Madura',
    kapasitas_bal: 6000,
    kepala_gudang: 'H. Subhan',
    kontak: '0812-3456-7803',
    status_aktif: true,
    deskripsi: 'Gudang Penyangga & Penampungan Wilayah Sumenep',
  },
];

export const STANDARD_GUDANG_LOCATIONS: string[] = [
  'Gudang Utama Pamekasan',
  'Gudang Produksi Rokok',
  'Gudang Sumenep',
];

export const getGudangLocationOptions = (gudangList: Gudang[] = []) =>
  gudangList && gudangList.length > 0 ? gudangList.map((g) => g.nama_gudang) : STANDARD_GUDANG_LOCATIONS;

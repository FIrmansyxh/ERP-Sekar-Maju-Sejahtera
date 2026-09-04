import { Gudang } from '../types';

export const INITIAL_GUDANG_DATA: Gudang[] = [
  {
    gudang_id: 'GDG-01',
    kode_gudang: 'GDG-PMK-01',
    nama_gudang: 'Gudang Pusat Induk & Intake Pamekasan',
    alamat: 'Jl. Raya Proppo No. 88, Kec. Proppo, Kab. Pamekasan, Madura',
    kapasitas_bal: 800,
    kepala_gudang: 'Bpk. H. Budi Santoso, S.P.',
    kontak: '0812-3456-7890',
    status_aktif: true,
  },
  {
    gudang_id: 'GDG-02',
    kode_gudang: 'GDG-SUM-01',
    nama_gudang: 'Gudang Penyangga & Fermentasi Sumenep',
    alamat: 'Jl. Raya Guluk-Guluk No. 24, Kec. Guluk-Guluk, Kab. Sumenep, Madura',
    kapasitas_bal: 500,
    kepala_gudang: 'Bpk. Agus Priyono, S.T.',
    kontak: '0813-8890-1234',
    status_aktif: true,
  },
  {
    gudang_id: 'GDG-03',
    kode_gudang: 'GDG-SMP-01',
    nama_gudang: 'Gudang Transit Pantura & QC Sampang',
    alamat: 'Jl. Raya Ketapang No. 12, Kec. Ketapang, Kab. Sampang, Madura',
    kapasitas_bal: 350,
    kepala_gudang: 'Ibu Ratna Dewi, S.T.',
    kontak: '0857-1122-3344',
    status_aktif: true,
  },
  {
    gudang_id: 'GDG-04',
    kode_gudang: 'GDG-BKL-01',
    nama_gudang: 'Gudang Distribusi Gerbang Barat Bangkalan',
    alamat: 'Jl. Raya Blega No. 56, Kec. Blega, Kab. Bangkalan, Madura',
    kapasitas_bal: 300,
    kepala_gudang: 'Bpk. Moch. Mansur',
    kontak: '0878-9900-1122',
    status_aktif: true,
  },
];

export const STANDARD_GUDANG_LOCATIONS: string[] = [
  'Gudang Pusat Induk & Intake Pamekasan',
  'Gudang Penyangga & Fermentasi Sumenep',
  'Gudang Transit Pantura & QC Sampang',
  'Gudang Distribusi Gerbang Barat Bangkalan',
];

export const getGudangLocationOptions = (gudangs: Gudang[] = INITIAL_GUDANG_DATA): string[] => {
  if (!gudangs || gudangs.length === 0) return STANDARD_GUDANG_LOCATIONS;
  return gudangs.map((g) => g.nama_gudang || `${g.kode_gudang} - ${g.alamat}`);
};

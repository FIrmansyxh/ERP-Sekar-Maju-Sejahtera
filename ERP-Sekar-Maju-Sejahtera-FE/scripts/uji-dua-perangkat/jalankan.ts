/**
 * Uji dua perangkat (dua komputer / dua akun) terhadap backend SUNGGUHAN.
 *
 * Dua proses "perangkat" (perangkat.ts) menjalankan kode aplikasi yang sama dengan layar, masing-masing dengan
 * penyimpanan peramban dan antrean sendiri, lalu menjalankan skenario yang dulu bermasalah di produksi:
 * tambah tidak bertambah, edit tidak berubah, hapus muncul lagi, data berbeda antar komputer, sampai laporan.
 *
 * Prasyarat: backend berjalan dengan database UJI (jangan database produksi), dua akun aktif.
 *   E2E_API        (bawaan http://127.0.0.1:8000/api/v1)
 *   E2E_USER_A / E2E_PASS_A, E2E_USER_B / E2E_PASS_B
 * Menjalankan:  npx vite-node scripts/uji-dua-perangkat/jalankan.ts
 */
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const API = process.env.E2E_API || 'http://127.0.0.1:8000/api/v1';
const AKUN_A = { username: process.env.E2E_USER_A || 'Sekarmajuadmin', password: process.env.E2E_PASS_A || '' };
const AKUN_B = { username: process.env.E2E_USER_B || 'sortir1', password: process.env.E2E_PASS_B || '' };
if (!AKUN_A.password || !AKUN_B.password) {
  console.error('Isi E2E_PASS_A dan E2E_PASS_B (kata sandi akun uji).');
  process.exit(2);
}

const FOLDER = path.dirname(fileURLToPath(import.meta.url));
const AKAR_FE = path.resolve(FOLDER, '../..');

// ---------- Perangkat ----------
class Perangkat {
  private proses: ChildProcessWithoutNullStreams;
  private urut = 0;
  private menunggu = new Map<number, { selesai: (v: unknown) => void; gagal: (e: Error) => void }>();
  siap: Promise<void>;

  constructor(readonly nama: string) {
    this.proses = spawn(process.execPath, [path.join(AKAR_FE, 'node_modules/vite-node/vite-node.mjs'), path.join(FOLDER, 'perangkat.ts')], {
      cwd: AKAR_FE,
      env: { ...process.env, VITE_API_BASE_URL: API },
    });
    let tandaSiap: () => void = () => undefined;
    this.siap = new Promise((r) => (tandaSiap = r));
    readline.createInterface({ input: this.proses.stdout }).on('line', (teks) => {
      if (!teks.startsWith('@@')) return;
      const pesan = JSON.parse(teks.slice(2));
      if (pesan.siap) return tandaSiap();
      const t = this.menunggu.get(pesan.id);
      if (!t) return;
      this.menunggu.delete(pesan.id);
      if (pesan.ok) t.selesai(pesan.hasil);
      else t.gagal(Object.assign(new Error(`[${nama}] ${pesan.galat}`), { status: pesan.status }));
    });
    this.proses.stderr.on('data', (d) => {
      const teks = String(d);
      if (process.env.E2E_VERBOSE) process.stderr.write(`[${nama}] ${teks}`);
    });
  }

  kirim<T = any>(cmd: string, args?: unknown): Promise<T> {
    const id = ++this.urut;
    return new Promise<T>((selesai, gagal) => {
      this.menunggu.set(id, { selesai: selesai as (v: unknown) => void, gagal });
      this.proses.stdin.write(`${JSON.stringify({ id, cmd, args })}\n`);
    });
  }
}

// ---------- Pemeriksaan ----------
const hasil: Array<{ skenario: string; periksa: string; lulus: boolean; rincian?: string }> = [];
let skenario = '';
function periksa(kondisi: boolean, keterangan: string, rincian?: unknown) {
  hasil.push({ skenario, periksa: keterangan, lulus: kondisi, rincian: kondisi ? undefined : JSON.stringify(rincian) });
  console.log(`${kondisi ? '  LULUS ' : '  GAGAL '} ${keterangan}${kondisi ? '' : `  -> ${JSON.stringify(rincian)}`}`);
}
function mulai(nama: string) {
  skenario = nama;
  console.log(`\n=== ${nama}`);
}

// ---------- Server langsung (untuk memeriksa isi database) ----------
let tokenPemeriksa = '';
async function server<T = any>(metode: string, url: string, body?: unknown): Promise<{ status: number; data: T; json: any }> {
  const res = await fetch(`${API}${url}`, {
    method: metode,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(tokenPemeriksa ? { Authorization: `Bearer ${tokenPemeriksa}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json?.data, json };
}

const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms));
const akhiran = Date.now().toString(36).slice(-5).toUpperCase();

function kuponBaru(transaksiId: string, noKupon: string, petani: { petani_id: string; nama_petani: string }, noBal: string[]) {
  return {
    transaksi_id: transaksiId,
    no_kupon: noKupon,
    petani_id: petani.petani_id,
    nama_petani: petani.nama_petani,
    tanggal_transaksi: new Date().toISOString().slice(0, 10),
    status_tahap: 'proses_sortir',
    status_pembayaran: 'belum_lunas',
    status_transaksi: 'menunggu',
    jenis_timbang: 'bruto',
    items: noBal.map((n, i) => bal(n, i)),
  };
}
function bal(noBal: string, i = 0) {
  return {
    item_id: `BAL-ITEM-${Date.now()}-${i + 1}`,
    no_bal: noBal,
    barcode: noBal,
    kode_grade: '40',
    harga_per_kg: 40000,
    ganti_tikar: false,
    gt_diubah_pada: Date.now(),
    berat_bruto_kg: 0,
    potongan_tara_kg: 0,
    berat_kg: 0,
    potongan_kuli: 7000,
    potongan_tali: 3000,
    potongan_tikar: 0,
    potongan: 10000,
    total_kotor: 0,
    subtotal_bersih: 0,
    status_timbang: 'menunggu_timbang',
  };
}
const timbang = (noBal: string, bruto: number, netto: number, cap = Date.now()) => ({
  jenis: 'ubah_bal',
  ref: { no_bal: noBal },
  perubahan: { berat_bruto_kg: bruto, potongan_tara_kg: bruto - netto, berat_kg: netto },
  timbang_diubah_pada: cap,
});
const ringkasBal = (tx: any) =>
  (tx?.items || [])
    .map((i: any) => `${i.no_bal}:${Number(i.berat_kg)}:${i.ganti_tikar ? 'GT' : '-'}`)
    .sort()
    .join('|');
const cariKupon = (daftar: any[], id: string) => daftar.find((t) => t.transaksi_id === id);

async function main() {
  const login = await server('POST', '/auth/login', AKUN_A);
  if (login.status !== 200) throw new Error(`Login pemeriksa gagal: ${JSON.stringify(login.json)}`);
  tokenPemeriksa = login.data.token;

  const A = new Perangkat('Komputer A');
  const B = new Perangkat('Komputer B');
  await Promise.all([A.siap, B.siap]);
  mulai('Login dua komputer dengan akun berbeda');
  periksa((await A.kirim('login', AKUN_A)) === 'api', `Komputer A login ke server sebagai ${AKUN_A.username}`);
  periksa((await B.kirim('login', AKUN_B)) === 'api', `Komputer B login ke server sebagai ${AKUN_B.username}`);

  const petaniA = await A.kirim<any[]>('daftar', { entitas: 'petani' });
  if (petaniA.length === 0) throw new Error('Database uji belum punya petani');
  const petani = petaniA[0];

  // ------------------------------------------------------------------------------------------------------------
  mulai('1. Sortir di A dan Timbangan di B pada kupon yang sama');
  const K1 = `TRX-E2E-${akhiran}1`;
  const NO1 = `K${akhiran}1`;
  const [X1, X2, X3] = [`X${akhiran}1`, `X${akhiran}2`, `X${akhiran}3`];
  await A.kirim('operasi', { transaksiId: K1, noKupon: NO1, op: { jenis: 'buat', kupon: kuponBaru(K1, NO1, petani, [X1, X2]) } });
  let rA = await A.kirim('tungguAntrean');
  periksa(rA.menunggu === 0, 'kupon baru dari A langsung tersimpan di server', rA);
  await B.kirim('sinkron');
  periksa(ringkasBal(cariKupon(await B.kirim('kupon'), K1)) === `${X1}:0:-|${X2}:0:-`, 'B melihat kupon baru A (tambah data bertambah di komputer lain)');

  // A menambah bal, B (belum sinkron, salinannya belum memuat X3) menimbang X1 -> keduanya harus tersimpan
  await A.kirim('operasi', { transaksiId: K1, noKupon: NO1, op: { jenis: 'tambah_bal', bal: [bal(X3)] } });
  await B.kirim('operasi', { transaksiId: K1, noKupon: NO1, op: timbang(X1, 45, 40) });
  await Promise.all([A.kirim('tungguAntrean'), B.kirim('tungguAntrean')]);
  let diServer = await server('GET', `/transaksi/${K1}`);
  periksa(ringkasBal(diServer.data) === `${X1}:40:-|${X2}:0:-|${X3}:0:-`, 'bal tambahan A dan timbangan B sama-sama tersimpan (tidak saling menimpa)', ringkasBal(diServer.data));
  await Promise.all([A.kirim('sinkron'), B.kirim('sinkron')]);
  const kA = cariKupon(await A.kirim('kupon'), K1);
  const kB = cariKupon(await B.kirim('kupon'), K1);
  periksa(ringkasBal(kA) === ringkasBal(diServer.data) && ringkasBal(kB) === ringkasBal(diServer.data), 'layar A dan B sama dengan server', { A: ringkasBal(kA), B: ringkasBal(kB) });

  // ------------------------------------------------------------------------------------------------------------
  mulai('2. Hapus bal di A, B masih memegang salinan lama');
  await A.kirim('operasi', { transaksiId: K1, noKupon: NO1, op: { jenis: 'hapus_bal', ref: { no_bal: X2 } } });
  await A.kirim('tungguAntrean');
  await B.kirim('operasi', { transaksiId: K1, noKupon: NO1, op: timbang(X2, 50, 45) }); // salinan basi B
  await B.kirim('tungguAntrean');
  const peristiwaB = await B.kirim<any[]>('peristiwa');
  periksa(peristiwaB.some((p) => p.jenis === 'ditolak' && p.pesan.includes('tidak ada lagi')), 'perubahan B untuk bal yang sudah dihapus DITOLAK dan dilaporkan', peristiwaB);
  diServer = await server('GET', `/transaksi/${K1}`);
  periksa(!ringkasBal(diServer.data).includes(X2), 'bal yang dihapus TIDAK muncul lagi di server', ringkasBal(diServer.data));
  for (let i = 0; i < 3; i++) await B.kirim('sinkron');
  periksa(!ringkasBal(cariKupon(await B.kirim('kupon'), K1)).includes(X2), 'bal yang dihapus hilang juga dari layar B (dan tetap hilang setelah beberapa kali sinkron)');

  // ------------------------------------------------------------------------------------------------------------
  mulai('3. Ganti tikar dari B; perubahan basi dari komputer yang sempat offline tidak menimpa');
  await B.kirim('operasi', { transaksiId: K1, noKupon: NO1, op: { jenis: 'ubah_bal', ref: { no_bal: X3 }, perubahan: { ganti_tikar: true }, gt_diubah_pada: Date.now() } });
  await B.kirim('tungguAntrean');
  await A.kirim('operasi', {
    transaksiId: K1,
    noKupon: NO1,
    op: { jenis: 'ubah_bal', ref: { no_bal: X3 }, perubahan: { ganti_tikar: false }, gt_diubah_pada: Date.now() - 10 * 60 * 1000 },
  });
  await A.kirim('operasi', { transaksiId: K1, noKupon: NO1, op: timbang(X1, 60, 55, Date.now() - 10 * 60 * 1000) });
  await A.kirim('tungguAntrean');
  await A.kirim('sinkron');
  diServer = await server('GET', `/transaksi/${K1}`);
  periksa(ringkasBal(diServer.data) === `${X1}:40:-|${X3}:0:GT`, 'GT dari B bertahan dan berat X1 tidak tertimpa timbangan lama', ringkasBal(diServer.data));
  periksa(ringkasBal(cariKupon(await A.kirim('kupon'), K1)) === ringkasBal(diServer.data), 'layar A mengikuti server (GT tercentang)');

  // ------------------------------------------------------------------------------------------------------------
  mulai('4. B offline menyimpan perubahan, A menghapus kupon; B tersambung lagi');
  await B.kirim('offline', { nilai: true });
  await B.kirim('operasi', { transaksiId: K1, noKupon: NO1, op: timbang(X3, 48, 43) });
  const tertahan = await B.kirim('tungguAntrean', { ms: 3000, bolehTertahan: true });
  periksa(tertahan.menunggu === 1, 'simpanan B ditahan selama offline (tidak hilang)', tertahan);
  const hapus = await A.kirim('mutasi', { nama: 'hapusKupon', args: { id: K1, alasan: 'uji dua perangkat' } });
  periksa(hapus.ok, 'A menghapus kupon di server', hapus);
  await B.kirim('offline', { nilai: false });
  await B.kirim('kirimUlang');
  await B.kirim('tungguAntrean');
  const p4 = await B.kirim<any[]>('peristiwa');
  periksa(p4.some((p) => p.jenis === 'kupon_dihapus'), 'simpanan lama B dijawab "sudah dihapus" (410) dan dibuang', p4);
  const cek = await server('GET', `/transaksi/${K1}`);
  periksa(cek.status === 410, 'kupon TIDAK dibuat ulang oleh simpanan lama B', cek.status);
  for (let i = 0; i < 2; i++) await Promise.all([A.kirim('sinkron'), B.kirim('sinkron')]);
  periksa(!cariKupon(await A.kirim('kupon'), K1) && !cariKupon(await B.kirim('kupon'), K1), 'kupon hilang dari layar A dan B dan tidak muncul lagi');

  // ------------------------------------------------------------------------------------------------------------
  mulai('5. Sortir -> Timbang -> Bayar lintas komputer, laporan sama');
  const K2 = `TRX-E2E-${akhiran}2`;
  const NO2 = `K${akhiran}2`;
  const [Y1, Y2] = [`Y${akhiran}1`, `Y${akhiran}2`];
  await A.kirim('operasi', { transaksiId: K2, noKupon: NO2, op: { jenis: 'buat', kupon: kuponBaru(K2, NO2, petani, [Y1, Y2]) } });
  await A.kirim('operasi', { transaksiId: K2, noKupon: NO2, op: { jenis: 'ubah_kupon', perubahan: { status_tahap: 'menunggu_timbang' } } });
  await A.kirim('tungguAntrean');
  await B.kirim('sinkron');
  await B.kirim('operasi', { transaksiId: K2, noKupon: NO2, op: timbang(Y1, 50, 45) });
  await B.kirim('operasi', { transaksiId: K2, noKupon: NO2, op: timbang(Y2, 52.5, 47.5) });
  await B.kirim('tungguAntrean');
  await A.kirim('sinkron');
  periksa(cariKupon(await A.kirim('kupon'), K2)?.status_tahap === 'lengkap', 'A melihat kupon lengkap setelah B menimbang semua bal');
  await A.kirim('operasi', { transaksiId: K2, noKupon: NO2, op: { jenis: 'bayar', metode: 'cash' } });
  const rBayar = await A.kirim('tungguAntrean');
  periksa(rBayar.menunggu === 0, 'pelunasan di A tersimpan', rBayar);
  await Promise.all([A.kirim('sinkron'), B.kirim('sinkron')]);
  const barangA = (await A.kirim<any[]>('daftar', { entitas: 'barang' })).filter((b) => b.transaksi_pembelian_id === K2);
  const barangB = (await B.kirim<any[]>('daftar', { entitas: 'barang' })).filter((b) => b.transaksi_pembelian_id === K2);
  periksa(barangA.length === 2 && barangB.length === 2, 'stok bal hasil pelunasan muncul di A dan B', { A: barangA.length, B: barangB.length });
  const k2A = cariKupon(await A.kirim('kupon'), K2);
  const k2B = cariKupon(await B.kirim('kupon'), K2);
  periksa(k2A?.status_pembayaran === 'lunas' && k2B?.status_pembayaran === 'lunas', 'status lunas sama di A dan B');
  periksa(JSON.stringify(k2A) === JSON.stringify(k2B), 'data kupon (dasar semua laporan pembelian) identik di A dan B', { A: k2A?.harga_final, B: k2B?.harga_final });
  const semuaServer = await server<any[]>('GET', '/transaksi');
  const nettoServer = semuaServer.data.filter((t) => t.status_pembayaran === 'lunas').reduce((j, t) => j + t.items.reduce((s: number, i: any) => s + Number(i.berat_kg), 0), 0);
  const nettoA = (await A.kirim<any[]>('kupon')).filter((t) => t.status_pembayaran === 'lunas').reduce((j, t) => j + t.berat_kg, 0);
  const nettoB = (await B.kirim<any[]>('kupon')).filter((t) => t.status_pembayaran === 'lunas').reduce((j, t) => j + t.berat_kg, 0);
  periksa(Math.abs(nettoA - nettoServer) < 0.001 && Math.abs(nettoB - nettoServer) < 0.001, 'total netto kupon lunas (laporan) sama: server = A = B', { server: nettoServer, A: nettoA, B: nettoB });

  // ------------------------------------------------------------------------------------------------------------
  mulai('6. Master data: tambah, edit, nonaktif lintas akun');
  const namaBaru = `Petani E2E ${akhiran}`;
  const tambahPetani = await A.kirim('mutasi', { nama: 'simpanPetani', args: { baru: true, petani: { petani_id: '', nama_petani: namaBaru, no_hp: '', alamat: 'Desa Uji', status_aktif: true } } });
  periksa(tambahPetani.ok, 'A menambah petani', tambahPetani);
  await B.kirim('sinkron');
  const pB = (await B.kirim<any[]>('daftar', { entitas: 'petani' })).find((p) => p.nama_petani === namaBaru);
  periksa(Boolean(pB), 'petani baru dari A muncul di B');
  const edit = await B.kirim('mutasi', { nama: 'simpanPetani', args: { baru: false, petani: { ...pB, nama_petani: `${namaBaru} (edit B)` } } });
  periksa(edit.ok, 'B mengedit petani', edit);
  await A.kirim('sinkron');
  periksa((await A.kirim<any[]>('daftar', { entitas: 'petani' })).some((p) => p.petani_id === pB.petani_id && p.nama_petani === `${namaBaru} (edit B)`), 'hasil edit B terlihat di A (edit berganti)');
  const nonaktif = await A.kirim('mutasi', { nama: 'simpanPetani', args: { baru: false, petani: { ...pB, nama_petani: `${namaBaru} (edit B)`, status_aktif: false, alasan_nonaktif: 'uji' } } });
  periksa(nonaktif.ok, 'A menonaktifkan petani', nonaktif);
  await B.kirim('sinkron');
  periksa((await B.kirim<any[]>('daftar', { entitas: 'petani' })).some((p) => p.petani_id === pB.petani_id && p.status_aktif === false), 'status nonaktif terlihat di B');
  const tolak = await A.kirim('mutasi', { nama: 'simpanPetani', args: { baru: false, petani: { ...pB, nama_petani: '' } } });
  periksa(!tolak.ok && tolak.status === 422, 'data tidak sah ditolak server dan dilaporkan', tolak);
  periksa((await A.kirim<any[]>('daftar', { entitas: 'petani' })).some((p) => p.petani_id === pB.petani_id && p.nama_petani === `${namaBaru} (edit B)`), 'penolakan tidak mengubah layar A (tidak tersimpan diam-diam)');

  const kodeHJ = `HJE${akhiran}`;
  periksa((await A.kirim('mutasi', { nama: 'simpanHargaJual', args: { harga: { harga_jual_id: `HJ-${akhiran}`, kode: kodeHJ, harga_jual: 50000, tanggal_berlaku: '2026-09-24', status_aktif: true } } })).ok, 'A menambah harga jual');
  await B.kirim('sinkron');
  const hjB = (await B.kirim<any[]>('daftar', { entitas: 'harga_jual' })).find((h) => h.kode === kodeHJ);
  periksa(hjB?.harga_jual === 50000, 'harga jual baru terlihat di B', hjB);
  periksa((await B.kirim('mutasi', { nama: 'simpanHargaJual', args: { harga: { ...hjB, harga_jual: 52000 } } })).ok, 'B mengubah harga jual');
  await A.kirim('sinkron');
  periksa((await A.kirim<any[]>('daftar', { entitas: 'harga_jual' })).find((h) => h.kode === kodeHJ)?.harga_jual === 52000, 'perubahan harga jual B terlihat di A');

  // ------------------------------------------------------------------------------------------------------------
  mulai('7. Batch sample & Surat Jalan: relasi dijaga server');
  const idBarang = barangB.map((b) => b.barang_id);
  const BATCH = `SPE${akhiran}`;
  const buatBatch = await B.kirim('mutasi', {
    nama: 'simpanBatch',
    args: {
      baru: true,
      batch: {
        batch_id: BATCH,
        kode_batch: `SS-${akhiran}`,
        tujuan_buyer: 'Pabrik Uji',
        tanggal_kirim: '2026-09-24',
        status: 'sample',
        dikirim_oleh: 'Penguji',
        sumber_gudang: 'Gudang Utama',
        items: idBarang.map((id) => ({ barang_id: id, no_bal: id, harga_tawaran_kg: 50000, status_item: 'dikirim' })),
      },
    },
  });
  periksa(buatBatch.ok, 'B membuat batch sample', buatBatch);
  await A.kirim('sinkron');
  periksa((await A.kirim<any[]>('daftar', { entitas: 'batch_sample' })).some((b) => b.batch_id === BATCH), 'batch dari B terlihat di A');
  const SJ = `SJ-${akhiran}`;
  const buatSJ = await A.kirim('mutasi', {
    nama: 'simpanSJ',
    args: {
      baru: true,
      sj: {
        pengiriman_id: SJ,
        no_surat_jalan: `SJ/${akhiran}`,
        tujuan: 'Pabrik Uji',
        driver_nama: 'Sopir',
        plat_nomor: 'M 1 UJ',
        tanggal_kirim: '2026-09-24',
        status: 'dikirim',
        batch_sample_id_ref: BATCH,
        barang_ids: idBarang,
        harga_deal_map: Object.fromEntries(idBarang.map((id) => [id, 50000])),
      },
    },
  });
  periksa(buatSJ.ok, 'A menerbitkan Surat Jalan dari batch', buatSJ);
  await B.kirim('sinkron');
  let batchB = (await B.kirim<any[]>('daftar', { entitas: 'batch_sample' })).find((b) => b.batch_id === BATCH);
  periksa(batchB?.status === 'selesai' && batchB.items.every((i: any) => i.sudah_dikirim_do), 'B melihat batch otomatis "selesai" dan semua bal bertanda sudah DO', batchB?.status);
  periksa((await B.kirim<any[]>('daftar', { entitas: 'pengiriman' })).some((p) => p.pengiriman_id === SJ), 'Surat Jalan dari A terlihat di B');
  periksa((await A.kirim('mutasi', { nama: 'statusSJ', args: { id: SJ, status: 'dalam_perjalanan' } })).ok, 'A mengubah status Surat Jalan');
  await B.kirim('sinkron');
  periksa((await B.kirim<any[]>('daftar', { entitas: 'pengiriman' })).find((p) => p.pengiriman_id === SJ)?.status === 'dalam_perjalanan', 'status Surat Jalan terlihat di B');
  periksa((await B.kirim('mutasi', { nama: 'hapusSJ', args: { id: SJ } })).ok, 'B membatalkan Surat Jalan');
  for (let i = 0; i < 2; i++) await A.kirim('sinkron');
  periksa(!(await A.kirim<any[]>('daftar', { entitas: 'pengiriman' })).some((p) => p.pengiriman_id === SJ), 'Surat Jalan yang dibatalkan hilang dari A dan tidak muncul lagi');
  batchB = (await A.kirim<any[]>('daftar', { entitas: 'batch_sample' })).find((b) => b.batch_id === BATCH);
  periksa(batchB?.status === 'diproses' && batchB.items.every((i: any) => !i.sudah_dikirim_do), 'tanda DO di batch dicabut server dan batch terbuka lagi', batchB?.status);
  periksa((await A.kirim('mutasi', { nama: 'hapusBatch', args: { id: BATCH } })).ok, 'A menghapus batch');
  const editBasi = await B.kirim('mutasi', { nama: 'simpanBatch', args: { baru: false, batch: { ...batchB, tujuan_buyer: 'Edit basi dari B' } } });
  periksa(!editBasi.ok && editBasi.status === 410, 'edit batch dari B (salinan basi) ditolak 410, batch tidak dibuat ulang', editBasi);
  for (let i = 0; i < 2; i++) await B.kirim('sinkron');
  periksa(!(await B.kirim<any[]>('daftar', { entitas: 'batch_sample' })).some((b) => b.batch_id === BATCH), 'batch yang dihapus hilang dari B dan tidak muncul lagi');

  // ------------------------------------------------------------------------------------------------------------
  mulai('8. Penolakan server tidak pernah disimpan diam-diam di satu komputer');
  await B.kirim('operasi', { transaksiId: K2, noKupon: NO2, op: { jenis: 'tambah_bal', bal: [bal(`Z${akhiran}`)] } });
  await B.kirim('tungguAntrean');
  const p8 = await B.kirim<any[]>('peristiwa');
  periksa(p8.some((p) => p.jenis === 'ditolak' && /lunas/i.test(p.pesan)), 'tambah bal ke kupon lunas ditolak dengan alasan jelas', p8);
  periksa(ringkasBal(cariKupon(await B.kirim('kupon'), K2)) === ringkasBal(cariKupon(await A.kirim('kupon'), K2)), 'layar B tetap sama dengan A (bal yang ditolak tidak tampil)');

  // ------------------------------------------------------------------------------------------------------------
  mulai('9. Konsistensi akhir seluruh data (dasar semua laporan)');
  await Promise.all([A.kirim('sinkron', { penuh: true }), B.kirim('sinkron', { penuh: true })]);
  for (const entitas of ['petani', 'barang', 'harga_beli', 'harga_jual', 'batch_sample', 'pengiriman']) {
    const a = await A.kirim<any[]>('daftar', { entitas });
    const b = await B.kirim<any[]>('daftar', { entitas });
    const kunci = (x: any) => JSON.stringify(x, Object.keys(x).sort());
    const sama = a.length === b.length && a.map(kunci).sort().join() === b.map(kunci).sort().join();
    periksa(sama, `daftar ${entitas} identik di A dan B (${a.length} baris)`, { A: a.length, B: b.length });
  }
  const kuponA = await A.kirim<any[]>('kupon');
  const kuponB = await B.kirim<any[]>('kupon');
  const kuponServer = (await server<any[]>('GET', '/transaksi')).data;
  const ringkasDaftar = (d: any[]) => d.map((t) => `${t.transaksi_id}=${ringkasBal(t)}=${t.status_pembayaran}`).sort().join('\n');
  periksa(ringkasDaftar(kuponA) === ringkasDaftar(kuponB), 'daftar kupon identik di A dan B', { A: kuponA.length, B: kuponB.length });
  periksa(ringkasDaftar(kuponA) === ringkasDaftar(kuponServer), 'daftar kupon di layar sama dengan database server', { layar: kuponA.length, server: kuponServer.length });

  await Promise.all([A.kirim('selesai'), B.kirim('selesai')]);
  await tunggu(200);

  const gagal = hasil.filter((h) => !h.lulus);
  console.log(`\nHasil: ${hasil.length - gagal.length} lulus, ${gagal.length} gagal dari ${hasil.length} pemeriksaan.`);
  process.exit(gagal.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Uji berhenti karena galat:', err);
  process.exit(1);
});

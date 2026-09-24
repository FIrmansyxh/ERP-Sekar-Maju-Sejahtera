/**
 * Satu "komputer" ERP tiruan untuk uji dua perangkat (lihat jalankan.ts).
 *
 * Menjalankan KODE APLIKASI YANG SAMA dengan layar (apiClient, erpApi, antrianKupon, TokoDataServer, mutasiServer)
 * dengan penyimpanan peramban sendiri, terhadap backend sungguhan. Perintah diterima per baris JSON lewat stdin,
 * jawaban dikirim per baris JSON lewat stdout.
 */
import readline from 'node:readline';

class PenyimpananMemori {
  private isi = new Map<string, string>();
  getItem(k: string) {
    return this.isi.has(k) ? (this.isi.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.isi.set(k, String(v));
  }
  removeItem(k: string) {
    this.isi.delete(k);
  }
  clear() {
    this.isi.clear();
  }
  key(i: number) {
    return Array.from(this.isi.keys())[i] ?? null;
  }
  get length() {
    return this.isi.size;
  }
}

// Lingkungan "peramban" minimal; harus terpasang SEBELUM modul aplikasi dimuat (alamat API dibaca saat dimuat)
const jendela = new EventTarget() as EventTarget & Record<string, unknown>;
jendela.location = { hostname: 'localhost', origin: 'http://localhost:3000', search: '' };
jendela.localStorage = new PenyimpananMemori();
Object.assign(globalThis, { window: jendela, localStorage: jendela.localStorage });

let offline = false;
const fetchAsli = globalThis.fetch;
globalThis.fetch = (async (...arg: Parameters<typeof fetch>) => {
  if (offline) throw new TypeError('Failed to fetch');
  return fetchAsli(...arg);
}) as typeof fetch;

const { ErpApiService } = await import('../../src/services/erpApi');
const { antrianKupon } = await import('../../src/services/antrianKupon');
const { TokoDataServer } = await import('../../src/services/tokoDataServer');
const mutasi = await import('../../src/services/mutasiServer');

const toko = new TokoDataServer();
const peristiwa: Array<{ jenis: string; label?: string; pesan: string }> = [];
antrianKupon.saatBerhasil((_id, tx) => toko.pasangBaris('transaksi', tx));
antrianKupon.saatDitolak((t, pesan) => peristiwa.push({ jenis: 'ditolak', label: t.label, pesan }));
antrianKupon.saatKuponDihapus((id, noKupon, pesan) => {
  toko.hapusBaris('transaksi', id);
  peristiwa.push({ jenis: 'kupon_dihapus', label: noKupon, pesan });
});
antrianKupon.aturJeda(() => 300);

const statusGalat = (err: unknown) => (err as { status?: number } | null)?.status ?? 0;
const pesanGalat = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Perubahan non-kupon: persis pola App.kirimKeServer (server dulu, layar mengikuti jawaban server). */
async function jalankanMutasi(nama: string, a: any): Promise<unknown> {
  switch (nama) {
    case 'simpanPetani':
      return toko.pasangBaris('petani', await mutasi.simpanPetaniServer(a.petani, a.baru));
    case 'simpanHargaJual':
      return toko.pasangBaris('harga_jual', await mutasi.simpanHargaJualServer(a.harga));
    case 'simpanBatch':
      return toko.pasangBaris('batch_sample', await mutasi.simpanBatchSampleServer(a.batch, a.baru));
    case 'hapusBatch':
      await mutasi.hapusBatchSampleServer(a.id);
      return toko.hapusBaris('batch_sample', a.id);
    case 'simpanSJ':
      return toko.pasangBaris('pengiriman', await mutasi.simpanPengirimanServer(a.sj, a.baru));
    case 'hapusSJ':
      await mutasi.hapusPengirimanServer(a.id);
      return toko.hapusBaris('pengiriman', a.id);
    case 'statusSJ': {
      const sj = toko.ambil().pengiriman.find((p) => p.pengiriman_id === a.id);
      if (!sj) throw new Error(`Surat Jalan ${a.id} tidak ada di layar`);
      return toko.pasangBaris('pengiriman', await mutasi.ubahStatusPengirimanServer(sj, a.status));
    }
    case 'hapusKupon':
      await mutasi.hapusTransaksiServer(a.id, a.alasan);
      antrianKupon.batalkanKupon(a.id);
      toko.hapusBaris('transaksi', a.id);
      return toko.hapusBaris('barang', toko.ambil().barang.filter((b) => b.transaksi_pembelian_id === a.id).map((b) => b.barang_id));
    default:
      throw new Error(`Mutasi tidak dikenal: ${nama}`);
  }
}

async function jalankan(cmd: string, a: any): Promise<unknown> {
  switch (cmd) {
    case 'login': {
      const hasil = await ErpApiService.login(a.username, a.password);
      if (!hasil.success) throw new Error(hasil.message);
      antrianKupon.pasang((id, op) => ErpApiService.kirimOperasiKupon(id, op));
      toko.mulaiUlang();
      await toko.sinkronkan({ penuh: true });
      return hasil.mode;
    }
    case 'sinkron':
      return toko.sinkronkan({ penuh: Boolean(a?.penuh) });
    case 'kupon':
      return antrianKupon.terapkanKeDaftar(toko.ambil().transaksi);
    case 'daftar':
      return (toko.ambil() as any)[a.entitas];
    case 'operasi':
      antrianKupon.masukkan(a.transaksiId, a.noKupon, a.op);
      return antrianKupon.ringkasan().menunggu;
    case 'tungguAntrean': {
      const batas = Date.now() + (a?.ms ?? 15000);
      while (Date.now() < batas) {
        const r = antrianKupon.ringkasan();
        if (r.menunggu === 0 && !r.berjalan) return r;
        if (a?.bolehTertahan && !r.berjalan && r.rincian.every((x) => x.percobaan > 0)) return r;
        await new Promise((s) => setTimeout(s, 100));
      }
      return antrianKupon.ringkasan();
    }
    case 'kirimUlang':
      await antrianKupon.kirimUlangSekarang();
      return antrianKupon.ringkasan();
    case 'offline':
      offline = Boolean(a.nilai);
      return offline;
    case 'mutasi':
      try {
        await jalankanMutasi(a.nama, a.args || {});
        return { ok: true };
      } catch (err) {
        return { ok: false, status: statusGalat(err), pesan: pesanGalat(err) };
      }
    case 'peristiwa':
      return peristiwa.splice(0);
    case 'selesai':
      setTimeout(() => process.exit(0), 50);
      return true;
    default:
      throw new Error(`Perintah tidak dikenal: ${cmd}`);
  }
}

const baris = readline.createInterface({ input: process.stdin });
baris.on('line', async (teks) => {
  let pesan: { id: number; cmd: string; args?: unknown };
  try {
    pesan = JSON.parse(teks);
  } catch {
    return;
  }
  try {
    const hasil = await jalankan(pesan.cmd, pesan.args);
    process.stdout.write(`@@${JSON.stringify({ id: pesan.id, ok: true, hasil })}\n`);
  } catch (err) {
    process.stdout.write(`@@${JSON.stringify({ id: pesan.id, ok: false, galat: pesanGalat(err), status: statusGalat(err) })}\n`);
  }
});
process.stdout.write('@@{"siap":true}\n');

import type { TransaksiItemBal, TransaksiPembelian } from '../types';
import { hitungUlangKupon } from '../utils/kuponSortir';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL, POTONGAN_TALI_PER_BAL } from '../config/aturanTimbang';

/**
 * Perubahan kupon dinyatakan sebagai OPERASI per bal, bukan salinan utuh kupon.
 *
 * Dulu setiap simpanan mengirim seluruh isi kupon dari layar lalu digabung dengan versi server memakai tebakan (bal
 * mana yang baru, berat mana yang menang, penanda hapus per komputer). Salinan layar yang basi di komputer lain bisa
 * menghidupkan lagi bal yang sudah dihapus atau menimpa balik ganti tikar / timbangan. Sekarang yang dikirim hanya
 * maksud operator ("tambah bal A1", "timbang bal A2", "hapus bal A3"), server menerapkannya ke data terbarunya, dan
 * layar menampilkan data server ditambah operasi yang belum terkirim. Tidak ada lagi tebakan penggabungan.
 */

/** Rujukan satu bal: item_id (bila sudah dari server) dan No. Bal (selalu ada, unik di seluruh gudang). */
export interface RefBal {
  item_id?: string;
  no_bal: string;
}

export type PerubahanBal = Partial<
  Pick<
    TransaksiItemBal,
    | 'no_bal'
    | 'barcode'
    | 'kode_grade'
    | 'harga_per_kg'
    | 'kode_bal_pembeli'
    | 'lokasi_simpan'
    | 'catatan'
    | 'potongan_kuli'
    | 'potongan_tali'
    | 'ganti_tikar'
    | 'potongan_tikar'
    | 'berat_bruto_kg'
    | 'potongan_tara_kg'
    | 'berat_kg'
    | 'is_netto_manual'
  >
>;

export interface PerubahanKupon {
  status_tahap?: TransaksiPembelian['status_tahap'];
  catatan?: string;
  catatan_qc?: string;
}

export type OperasiKupon =
  | { jenis: 'buat'; kupon: TransaksiPembelian }
  | { jenis: 'tambah_bal'; bal: TransaksiItemBal[] }
  | {
      jenis: 'ubah_bal';
      ref: RefBal;
      perubahan: PerubahanBal;
      /** Cap waktu (ms) centang ganti tikar diubah; server menolak GT yang lebih lama dari yang tersimpan */
      gt_diubah_pada?: number;
      /** Cap waktu (ms) timbang / buka kunci; server menolak berat yang lebih lama dari yang tersimpan */
      timbang_diubah_pada?: number;
    }
  | { jenis: 'hapus_bal'; ref: RefBal }
  | { jenis: 'ubah_kupon'; perubahan: PerubahanKupon }
  | { jenis: 'bayar'; metode: 'cash' | 'kredit'; catatan_kasir?: string; dibayar_oleh?: string };

const KOLOM_BERAT: (keyof PerubahanBal)[] = ['berat_bruto_kg', 'potongan_tara_kg', 'berat_kg', 'is_netto_manual'];
const KOLOM_SORTIR: (keyof PerubahanBal)[] = [
  'no_bal',
  'barcode',
  'kode_grade',
  'harga_per_kg',
  'kode_bal_pembeli',
  'lokasi_simpan',
  'catatan',
  'potongan_kuli',
  'potongan_tali',
];

const noSama = (a?: string, b?: string) => String(a ?? '').trim().toUpperCase() === String(b ?? '').trim().toUpperCase();

export const cocokBal = (it: Pick<TransaksiItemBal, 'item_id' | 'no_bal'>, ref: RefBal): boolean =>
  (Boolean(ref.item_id) && it.item_id === ref.item_id) || noSama(it.no_bal, ref.no_bal);

export const refDariBal = (it: Pick<TransaksiItemBal, 'item_id' | 'no_bal'>): RefBal => ({ item_id: it.item_id, no_bal: it.no_bal });

/** Hitungan uang satu bal setelah field-nya berubah (sama dengan kolom hitungan di server). */
export function hitungUlangBal(it: TransaksiItemBal): TransaksiItemBal {
  const berat = it.berat_kg || 0;
  const gt = Boolean(it.ganti_tikar);
  const tikar = gt ? Number(it.potongan_tikar) || POTONGAN_GANTI_TIKAR : 0;
  const kuli = it.potongan_kuli ?? POTONGAN_KULI_PER_BAL;
  const tali = it.potongan_tali ?? POTONGAN_TALI_PER_BAL;
  const potongan = kuli + tali + tikar;
  const kotor = Math.round(berat * (it.harga_per_kg || 0));
  return {
    ...it,
    potongan_tikar: tikar,
    potongan,
    total_kotor: kotor,
    subtotal_bersih: berat > 0 ? Math.max(0, kotor - potongan) : 0,
    status_timbang: berat > 0 ? 'selesai_timbang' : 'menunggu_timbang',
  };
}

/**
 * Menerapkan satu operasi ke kupon di layar (tampilan sementara sampai server menjawab). Hasilnya selalu dihitung
 * ulang dari rincian bal. Mengembalikan undefined bila kupon belum ada (operasi selain "buat").
 */
export function terapkanOperasi(tx: TransaksiPembelian | undefined, op: OperasiKupon): TransaksiPembelian | undefined {
  if (op.jenis === 'buat') {
    if (tx) return tx; // sudah ada di server (kiriman sebelumnya sampai)
    return hitungUlangKupon(op.kupon, op.kupon.items || []);
  }
  if (!tx) return undefined;
  const items = tx.items || [];

  switch (op.jenis) {
    case 'tambah_bal': {
      const baru = op.bal.filter((b) => !items.some((it) => noSama(it.no_bal, b.no_bal)));
      if (baru.length === 0) return tx;
      return hitungUlangKupon(tx, [...items, ...baru.map(hitungUlangBal)]);
    }
    case 'ubah_bal': {
      let ketemu = false;
      const berikut = items.map((it) => {
        if (ketemu || !cocokBal(it, op.ref)) return it;
        ketemu = true;
        const hasil: TransaksiItemBal = { ...it, ...op.perubahan } as TransaksiItemBal;
        if (op.gt_diubah_pada && op.perubahan.ganti_tikar !== undefined) hasil.gt_diubah_pada = op.gt_diubah_pada;
        if (op.timbang_diubah_pada && KOLOM_BERAT.some((k) => k in op.perubahan)) hasil.diubah_lokal_pada = op.timbang_diubah_pada;
        return hitungUlangBal(hasil);
      });
      return ketemu ? hitungUlangKupon(tx, berikut) : tx;
    }
    case 'hapus_bal': {
      const sisa = items.filter((it) => !cocokBal(it, op.ref));
      return sisa.length === items.length ? tx : hitungUlangKupon(tx, sisa);
    }
    case 'ubah_kupon': {
      const p = op.perubahan;
      const dasar: TransaksiPembelian = {
        ...tx,
        ...(p.catatan !== undefined ? { catatan: p.catatan } : {}),
        ...(p.catatan_qc !== undefined ? { catatan_qc: p.catatan_qc } : {}),
        ...(p.status_tahap && tx.status_pembayaran !== 'lunas' ? { status_tahap: p.status_tahap } : {}),
      };
      return hitungUlangKupon(dasar, items);
    }
    case 'bayar': {
      const dibayar = hitungUlangKupon(
        {
          ...tx,
          status_pembayaran: 'lunas',
          metode_pembayaran: op.metode,
          catatan_kasir: op.catatan_kasir ?? tx.catatan_kasir,
          dibayar_oleh: op.dibayar_oleh ?? tx.dibayar_oleh,
          status_nota: 'sudah_cetak',
          status_tahap: 'menunggu_timbang',
        },
        items
      );
      return { ...dibayar, status_tahap: 'lengkap', status_transaksi: 'lengkap' };
    }
  }
}

const angka = (v: unknown) => Number(v) || 0;

/**
 * Cadangan untuk pemanggil yang tidak menyebut operasinya: operasi diturunkan dari selisih kupon lama dan baru.
 * Hanya perubahan yang jelas disengaja yang diambil: bal baru, bal yang cap waktu timbang / GT-nya lebih baru, bal
 * yang dihapus pada simpanan versi utuh (timpaPenuh), tahap sortir, dan pelunasan. Bal lain yang kebetulan berbeda
 * (salinan layar basi) TIDAK dikirim.
 */
export function turunkanOperasi(
  lama: TransaksiPembelian | undefined,
  baru: TransaksiPembelian,
  opsi: { timpaPenuh?: boolean } = {}
): OperasiKupon[] {
  if (!lama) return [{ jenis: 'buat', kupon: baru }];
  const ops: OperasiKupon[] = [];
  const itemsLama = lama.items || [];
  const itemsBaru = baru.items || [];

  const tambah: TransaksiItemBal[] = [];
  for (const it of itemsBaru) {
    const asal = itemsLama.find((l) => l.item_id === it.item_id) || itemsLama.find((l) => noSama(l.no_bal, it.no_bal));
    if (!asal) {
      tambah.push(it);
      continue;
    }
    const perubahan: PerubahanBal = {};
    const capTimbang = it.diubah_lokal_pada || 0;
    const timbangBaru = capTimbang > (asal.diubah_lokal_pada || 0);
    if (timbangBaru) {
      for (const k of KOLOM_BERAT) {
        if ((it as any)[k] !== (asal as any)[k]) (perubahan as any)[k] = (it as any)[k] ?? (k === 'is_netto_manual' ? false : 0);
      }
      // Edit bal di Sortir juga memberi cap waktu: No. Bal / grade / harga ikut diambil
      for (const k of KOLOM_SORTIR) {
        if ((it as any)[k] !== undefined && (it as any)[k] !== (asal as any)[k]) (perubahan as any)[k] = (it as any)[k];
      }
    }
    const capGt = it.gt_diubah_pada || 0;
    const gtBaru = capGt > (asal.gt_diubah_pada || 0) && Boolean(it.ganti_tikar) !== Boolean(asal.ganti_tikar);
    if (gtBaru) {
      perubahan.ganti_tikar = Boolean(it.ganti_tikar);
      perubahan.potongan_tikar = it.ganti_tikar ? angka(it.potongan_tikar) || POTONGAN_GANTI_TIKAR : 0;
    }
    if (Object.keys(perubahan).length > 0) {
      ops.push({
        jenis: 'ubah_bal',
        ref: refDariBal(asal),
        perubahan,
        ...(gtBaru ? { gt_diubah_pada: capGt } : {}),
        ...(timbangBaru ? { timbang_diubah_pada: capTimbang } : {}),
      });
    }
  }
  if (tambah.length > 0) ops.unshift({ jenis: 'tambah_bal', bal: tambah });

  if (opsi.timpaPenuh) {
    for (const l of itemsLama) {
      const masih = itemsBaru.some((it) => it.item_id === l.item_id || noSama(it.no_bal, l.no_bal));
      if (!masih) ops.push({ jenis: 'hapus_bal', ref: refDariBal(l) });
    }
  }

  if (baru.status_tahap && baru.status_tahap !== lama.status_tahap && lama.status_pembayaran !== 'lunas' && baru.status_pembayaran !== 'lunas') {
    ops.push({ jenis: 'ubah_kupon', perubahan: { status_tahap: baru.status_tahap, catatan_qc: baru.catatan_qc } });
  }
  if (baru.status_pembayaran === 'lunas' && lama.status_pembayaran !== 'lunas') {
    ops.push({
      jenis: 'bayar',
      metode: baru.metode_pembayaran === 'kredit' ? 'kredit' : 'cash',
      catatan_kasir: baru.catatan_kasir,
      dibayar_oleh: baru.dibayar_oleh,
    });
  }
  return ops;
}

/** Keterangan singkat untuk Header dan pesan galat. */
export function uraianOperasi(op: OperasiKupon): string {
  switch (op.jenis) {
    case 'buat':
      return `buka kupon (${(op.kupon.items || []).map((b) => b.no_bal).join(', ') || 'tanpa bal'})`;
    case 'tambah_bal':
      return `tambah bal ${op.bal.map((b) => b.no_bal).join(', ')}`;
    case 'ubah_bal': {
      const p = op.perubahan;
      const bagian: string[] = [];
      if (p.berat_kg !== undefined) bagian.push(p.berat_kg > 0 ? `timbang ${p.berat_kg} kg` : 'buka kunci timbang');
      if (p.ganti_tikar !== undefined) bagian.push(p.ganti_tikar ? 'ganti tikar' : 'lepas ganti tikar');
      if (p.no_bal !== undefined && !noSama(p.no_bal, op.ref.no_bal)) bagian.push(`No. Bal jadi ${p.no_bal}`);
      if (p.kode_grade !== undefined) bagian.push(`grade ${p.kode_grade}`);
      return `bal ${op.ref.no_bal}: ${bagian.join(', ') || 'ubah data'}`;
    }
    case 'hapus_bal':
      return `hapus bal ${op.ref.no_bal}`;
    case 'ubah_kupon':
      return op.perubahan.status_tahap === 'menunggu_timbang' ? 'selesai sortir' : 'ubah data kupon';
    case 'bayar':
      return 'pelunasan';
  }
}

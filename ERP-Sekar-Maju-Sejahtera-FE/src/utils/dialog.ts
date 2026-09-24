/**
 * Dialog pemberitahuan dan konfirmasi yang seragam dengan tampilan aplikasi.
 * Pengganti `alert()` dan `confirm()` bawaan peramban; ditampilkan oleh <DialogHost /> (dipasang di main.tsx).
 */

export type VarianDialog = 'danger' | 'warning' | 'primary' | 'success';

export interface OpsiDialog {
  judul?: string;
  teksOk?: string;
  teksBatal?: string;
  varian?: VarianDialog;
}

export interface PermintaanDialog {
  id: number;
  jenis: 'info' | 'konfirmasi';
  pesan: string;
  opsi: OpsiDialog;
  selesai: (hasil: boolean) => void;
}

type Pendengar = (antrean: PermintaanDialog[]) => void;

let antrean: PermintaanDialog[] = [];
let urutan = 0;
const pendengar = new Set<Pendengar>();

const umumkan = () => pendengar.forEach((fn) => fn(antrean));

function tambah(jenis: PermintaanDialog['jenis'], pesan: string, opsi: OpsiDialog): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    antrean = [...antrean, { id: ++urutan, jenis, pesan, opsi, selesai: resolve }];
    umumkan();
  });
}

/** Pemberitahuan satu tombol. Tidak perlu ditunggu; selesai saat pengguna menekan Mengerti. */
export function tampilkanInfo(pesan: string, opsi: OpsiDialog = {}): Promise<void> {
  return tambah('info', pesan, { judul: 'Perhatian', varian: 'warning', ...opsi }).then(() => undefined);
}

/** Konfirmasi Ya/Batal. Hasilnya true bila pengguna memilih lanjut. */
export function mintaKonfirmasi(pesan: string, opsi: OpsiDialog = {}): Promise<boolean> {
  return tambah('konfirmasi', pesan, { judul: 'Konfirmasi', varian: 'warning', ...opsi });
}

/** Menutup dialog teratas dengan hasil tertentu. Dipakai oleh <DialogHost />. */
export function selesaikanDialog(id: number, hasil: boolean): void {
  const target = antrean.find((p) => p.id === id);
  if (!target) return;
  antrean = antrean.filter((p) => p.id !== id);
  umumkan();
  target.selesai(hasil);
}

export function berlangganDialog(fn: Pendengar): () => void {
  pendengar.add(fn);
  fn(antrean);
  return () => {
    pendengar.delete(fn);
  };
}

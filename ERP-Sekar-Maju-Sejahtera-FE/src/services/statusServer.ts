/**
 * Status hubungan ke server untuk Header: kapan data terakhir berhasil diselaraskan dan galat terakhir.
 * Operator harus tahu bila layarnya sedang tidak mengikuti server (jaringan putus), supaya tidak mengira data
 * dari komputer lain "tidak bertambah".
 */
export interface StatusServer {
  /** null = belum pernah dicoba */
  terhubung: boolean | null;
  terakhirBerhasil: number | null;
  galat?: string;
}

let status: StatusServer = { terhubung: null, terakhirBerhasil: null };
const pendengar = new Set<() => void>();

export const statusServer = {
  ambil(): StatusServer {
    return status;
  },
  berhasil(): void {
    status = { terhubung: true, terakhirBerhasil: Date.now() };
    pendengar.forEach((fn) => fn());
  },
  gagal(pesan: string): void {
    if (status.terhubung === false && status.galat === pesan) return;
    status = { ...status, terhubung: false, galat: pesan };
    pendengar.forEach((fn) => fn());
  },
  atur(baru: StatusServer): void {
    status = baru;
    pendengar.forEach((fn) => fn());
  },
  berlangganan(fn: () => void): () => void {
    pendengar.add(fn);
    return () => pendengar.delete(fn);
  },
};

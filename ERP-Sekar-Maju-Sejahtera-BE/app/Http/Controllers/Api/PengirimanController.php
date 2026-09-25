<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PengirimanBarang;
use App\Models\PengirimanBarangItem;
use App\Models\Barang;
use App\Services\SequenceService;
use App\Support\CatatanHapus;
use App\Support\RelasiBatchSample;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PengirimanController extends Controller
{
    public function index()
    {
        $pengiriman = PengirimanBarang::with(['items.barang.item'])
            ->orderBy('tanggal_kirim', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $pengiriman]);
    }

    private function aturan(): array
    {
        return [
            'pengiriman_id' => 'nullable|string|max:20',
            'versi' => 'nullable|integer|min:1',
            'no_surat_jalan' => 'required|string|max:30',
            'tujuan' => 'required|string',
            'driver_nama' => 'required|string',
            'plat_nomor' => 'required|string',
            'tanggal_kirim' => 'required|date',
            'aturan_netto' => 'nullable|array',
            'aturan_netto.*.min' => 'required_with:aturan_netto|numeric|min:0',
            'aturan_netto.*.max' => 'nullable|numeric|min:0',
            'aturan_netto.*.potongan' => 'required_with:aturan_netto|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.barang_id' => 'required|string',
            'items.*.kode_harga_jual' => 'nullable|string',
            'items.*.harga_deal_per_kg' => 'nullable|numeric|min:0',
            'items.*.berat_kirim_kg' => 'nullable|numeric|min:0',
            'items.*.netto_jual_kg' => 'nullable|numeric|min:0',
        ];
    }

    /**
     * Pemeriksaan bal sebelum disimpan, supaya penolakan database (bal belum ada / sudah di Surat Jalan lain /
     * kode harga jual belum ada) keluar sebagai pesan yang jelas, bukan galat 500.
     */
    private function periksaItem(array $items, ?string $pengirimanId): void
    {
        $idBal = collect($items)->pluck('barang_id')->map(fn ($v) => (string) $v)->values();
        if ($idBal->count() !== $idBal->unique()->count()) {
            throw ValidationException::withMessages(['items' => ['Ada bal yang tercantum dua kali di Surat Jalan ini.']]);
        }

        $ada = Barang::whereIn('barang_id', $idBal)->pluck('barang_id')->map(fn ($v) => (string) $v);
        $belumAda = $idBal->diff($ada);
        if ($belumAda->isNotEmpty()) {
            throw ValidationException::withMessages(['items' => [
                'Bal belum tercatat sebagai stok di server (kupon belum dibayar di Kasir): ' . $belumAda->join(', '),
            ]]);
        }

        $kode = collect($items)->pluck('kode_harga_jual')->filter()->map(fn ($v) => (string) $v)->unique()->values();
        if ($kode->isNotEmpty()) {
            $adaKode = DB::table('master_harga_jual')->whereIn('kode', $kode)->pluck('kode')->map(fn ($v) => (string) $v);
            $kodeBelumAda = $kode->diff($adaKode);
            if ($kodeBelumAda->isNotEmpty()) {
                throw ValidationException::withMessages(['items' => [
                    'Kode harga jual belum ada di Master Harga Jual server: ' . $kodeBelumAda->join(', '),
                ]]);
            }
        }

        $diSjLain = DB::table('pengiriman_barang_item as i')
            ->join('pengiriman_barang as p', 'p.pengiriman_id', '=', 'i.pengiriman_id')
            ->join('barang as b', 'b.barang_id', '=', 'i.barang_id')
            ->whereIn('i.barang_id', $idBal)
            ->when($pengirimanId, fn ($q) => $q->where('i.pengiriman_id', '<>', $pengirimanId))
            ->select('b.no_bal', 'p.no_surat_jalan')
            ->get();
        if ($diSjLain->isNotEmpty()) {
            $daftar = $diSjLain->map(fn ($r) => "{$r->no_bal} (SJ {$r->no_surat_jalan})")->join(', ');
            throw ValidationException::withMessages(['items' => ["Bal sudah tercatat di Surat Jalan lain: {$daftar}"]]);
        }
    }

    private function nilaiItem(array $itemData): array
    {
        return [
            'kode_harga_jual' => ($itemData['kode_harga_jual'] ?? null) ?: null,
            'harga_deal_per_kg' => $itemData['harga_deal_per_kg'] ?? 0,
            'berat_kirim_kg' => $itemData['berat_kirim_kg'] ?? null,
            'netto_jual_kg' => $itemData['netto_jual_kg'] ?? null,
        ];
    }

    /**
     * Surat Jalan untuk diubah. Yang sudah dibatalkan dijawab 410 (bukan 404), supaya perangkat lain yang masih
     * menyimpan perubahan untuknya tidak membuatnya ulang.
     *
     * @return array{0: ?PengirimanBarang, 1: mixed}
     */
    private function cariSuratJalan(string $id): array
    {
        $pengiriman = PengirimanBarang::with('items')->where('pengiriman_id', $id)->first();
        if ($pengiriman) {
            return [$pengiriman, null];
        }
        $info = CatatanHapus::cari('pengiriman_barang', $id);
        if ($info !== null) {
            $no = $info['no_surat_jalan'] ?? $id;
            return [null, CatatanHapus::jawaban("Surat Jalan {$no} sudah dibatalkan. Perubahan untuk Surat Jalan ini dibatalkan.")];
        }
        return [null, response()->json(['status' => 'error', 'message' => "Surat Jalan {$id} tidak ditemukan"], 404)];
    }

    public function store(Request $request)
    {
        $request->validate($this->aturan());

        // Surat Jalan yang sudah dibatalkan tidak boleh dibuat ulang oleh simpanan lama di perangkat lain
        if (!empty($request->pengiriman_id) && CatatanHapus::sudahDihapus('pengiriman_barang', (string) $request->pengiriman_id)) {
            return CatatanHapus::jawaban("Surat Jalan {$request->no_surat_jalan} sudah dibatalkan. Simpanan lama untuk Surat Jalan ini dibatalkan.");
        }

        return DB::transaction(function() use ($request) {
            $noSj = trim($request->no_surat_jalan);
            $idKiriman = trim((string) $request->pengiriman_id);

            // Kirim ulang Surat Jalan yang sama (jawaban sebelumnya hilang / antrean mengulang): perbarui saja
            if ($idKiriman !== '') {
                $sama = PengirimanBarang::with('items')->where('pengiriman_id', $idKiriman)->lockForUpdate()->first();
                if ($sama && $sama->no_surat_jalan === $noSj) {
                    if ($sama->status === 'selesai') {
                        return response()->json([
                            'status' => 'success',
                            'message' => 'Surat Jalan sudah ada dan sudah Selesai',
                            'data' => $sama->load(['items.barang.item']),
                        ]);
                    }
                    return $this->simpanPerubahan($request, $sama, 'Surat Jalan sudah ada; isinya disamakan');
                }
            }
            if (PengirimanBarang::where('no_surat_jalan', $noSj)->exists()) {
                return response()->json([
                    'status' => 'error',
                    'message' => "No. Surat Jalan {$noSj} sudah dipakai Surat Jalan lain.",
                ], 422);
            }

            $this->periksaItem($request->items, null);

            $pengirimanId = $idKiriman;
            if ($pengirimanId === '' || PengirimanBarang::where('pengiriman_id', $pengirimanId)->exists()) {
                $pengirimanId = SequenceService::generatePengirimanId();
            }

            $pengiriman = PengirimanBarang::create([
                'pengiriman_id' => $pengirimanId,
                'no_surat_jalan' => $noSj,
                'tujuan' => $request->tujuan,
                'jenis_pengeluaran' => $request->jenis_pengeluaran ?? 'Pabrik Rokok',
                'driver_nama' => $request->driver_nama,
                'plat_nomor' => $request->plat_nomor,
                'tanggal_kirim' => $request->tanggal_kirim,
                'status' => in_array($request->status, ['dimuat', 'dikirim', 'dalam_perjalanan', 'diterima'], true) ? $request->status : 'dimuat',
                'batch_sample_id_ref' => $this->rujukanBatch($request->batch_sample_id_ref),
                'nomor_kontrak' => $request->nomor_kontrak ?? null,
                'aturan_netto' => $request->aturan_netto ?? null,
                'catatan' => $request->catatan ?? null,
                'dibuat_oleh' => optional(auth('sanctum')->user())->user_id,
            ]);

            // Bal dicatat masuk muatan tapi TIDAK berubah status stoknya di sini: bal baru benar-benar
            // "keluar" gudang saat Surat Jalan berstatus Selesai (lihat updateStatus). Selama itu, bal
            // tetap tampil "Di Gudang" walau sudah tercatat di Surat Jalan ini.
            foreach ($request->items as $itemData) {
                PengirimanBarangItem::create(array_merge($this->nilaiItem($itemData), [
                    'pengiriman_id' => $pengirimanId,
                    'barang_id' => (string) $itemData['barang_id'],
                ]));
            }
            RelasiBatchSample::sesuaikan(collect($request->items)->pluck('barang_id'));

            return response()->json([
                'status' => 'success',
                'message' => 'Surat jalan berhasil dibuat',
                // fresh(): kolom yang diisi database (versi, updated_at) ikut terkirim
                'data' => $pengiriman->fresh()->load(['items.barang.item'])
            ], 201);
        });
    }

    /** Rujukan batch sample hanya disimpan bila batchnya ada di server (kunci asing). */
    private function rujukanBatch($batchId): ?string
    {
        if (!$batchId) {
            return null;
        }
        return DB::table('sample_batch')->where('batch_id', $batchId)->exists() ? (string) $batchId : null;
    }

    /**
     * Selesai bersifat final: Surat Jalan tidak dapat diubah, dibatalkan, atau diganti statusnya lagi.
     */
    private function tolakBilaSelesai(PengirimanBarang $pengiriman)
    {
        if ($pengiriman->status === 'selesai') {
            return response()->json([
                'status' => 'error',
                'message' => "Surat Jalan {$pengiriman->no_surat_jalan} sudah Selesai dan tidak dapat diubah lagi.",
            ], 422);
        }
        return null;
    }

    /**
     * Mengubah Surat Jalan yang belum Selesai: tambah/keluarkan bal, data pengiriman, tujuan, sopir, dll.
     * Status tidak diubah lewat endpoint ini (diatur lewat updateStatus). Daftar `items` menggantikan
     * seluruh muatan: bal yang tidak ada lagi di daftar kembali ke gudang.
     */
    public function update(Request $request, $id)
    {
        [$pengiriman, $tolak] = $this->cariSuratJalan((string) $id);
        if ($tolak) {
            return $tolak;
        }

        if ($tolak = $this->tolakBilaSelesai($pengiriman)) {
            return $tolak;
        }

        $request->validate($this->aturan());

        return DB::transaction(function () use ($request, $pengiriman) {
            return $this->simpanPerubahan($request, $pengiriman, 'Surat jalan berhasil diperbarui');
        });
    }

    private function simpanPerubahan(Request $request, PengirimanBarang $pengiriman, string $pesan)
    {
        // Simpanan dari versi lama (Surat Jalan sudah diubah di komputer lain sejak dibuka) ditolak supaya tidak
        // menimpa perubahan itu. Tanpa `versi` (kirim ulang pembuatan / klien lama) tidak diperiksa.
        $versi = PengirimanBarang::where('pengiriman_id', $pengiriman->pengiriman_id)->lockForUpdate()->value('versi');
        if ($request->filled('versi') && (int) $request->versi !== (int) $versi) {
            return response()->json([
                'status' => 'error',
                'message' => "Surat Jalan {$pengiriman->no_surat_jalan} sudah diubah di komputer lain sejak dibuka di sini. Buka lagi Surat Jalan ini untuk memuat data terbaru, lalu ulangi perubahan",
            ], 409);
        }

        $noSj = trim($request->no_surat_jalan);
        if ($noSj !== $pengiriman->no_surat_jalan
            && PengirimanBarang::where('no_surat_jalan', $noSj)->where('pengiriman_id', '<>', $pengiriman->pengiriman_id)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => "No. Surat Jalan {$noSj} sudah dipakai Surat Jalan lain.",
            ], 422);
        }

        $this->periksaItem($request->items, $pengiriman->pengiriman_id);

        $idBaru = collect($request->items)->pluck('barang_id')->map(fn ($v) => (string) $v)->unique()->values();
        $idLama = PengirimanBarangItem::where('pengiriman_id', $pengiriman->pengiriman_id)
            ->pluck('barang_id')->map(fn ($v) => (string) $v)->values();
        $keluarDariMuatan = $idLama->diff($idBaru);

        $pengiriman->update([
            'no_surat_jalan' => $noSj,
            'tujuan' => $request->tujuan,
            'jenis_pengeluaran' => $request->jenis_pengeluaran ?? $pengiriman->jenis_pengeluaran,
            'driver_nama' => $request->driver_nama,
            'plat_nomor' => $request->plat_nomor,
            'tanggal_kirim' => $request->tanggal_kirim,
            'batch_sample_id_ref' => $request->has('batch_sample_id_ref')
                ? $this->rujukanBatch($request->batch_sample_id_ref)
                : $pengiriman->batch_sample_id_ref,
            'nomor_kontrak' => $request->nomor_kontrak ?? null,
            'aturan_netto' => $request->has('aturan_netto') ? $request->aturan_netto : $pengiriman->aturan_netto,
            'catatan' => $request->catatan ?? null,
        ]);

        // Bal yang dikeluarkan dari muatan kembali ke gudang. Dijaga juga untuk data lama yang
        // sempat berstatus keluar dari perilaku sebelumnya (bal baru "keluar" sungguhan saat Selesai).
        if ($keluarDariMuatan->isNotEmpty()) {
            PengirimanBarangItem::where('pengiriman_id', $pengiriman->pengiriman_id)
                ->whereIn('barang_id', $keluarDariMuatan)
                ->delete();
            Barang::whereIn('barang_id', $keluarDariMuatan)
                ->where('status_stok', 'keluar')
                ->update([
                    'status_stok' => 'di_gudang',
                    'tanggal_keluar' => null,
                ]);
        }

        // Tabel item berkunci komposit (pengiriman_id, barang_id) tanpa kolom id, jadi tidak memakai
        // updateOrCreate Eloquent (yang memperbarui lewat kolom "id" dan gagal 500).
        foreach ($request->items as $itemData) {
            $barangId = (string) $itemData['barang_id'];
            $nilai = $this->nilaiItem($itemData);
            $kunci = ['pengiriman_id' => $pengiriman->pengiriman_id, 'barang_id' => $barangId];
            if ($idLama->contains($barangId)) {
                DB::table('pengiriman_barang_item')->where($kunci)->update($nilai);
            } else {
                DB::table('pengiriman_barang_item')->insert(array_merge($kunci, $nilai));
            }
        }
        RelasiBatchSample::sesuaikan($idLama->merge($idBaru));

        return response()->json([
            'status' => 'success',
            'message' => $pesan,
            'data' => $pengiriman->fresh()->load(['items.barang.item']),
        ]);
    }

    /**
     * Membatalkan/menghapus Surat Jalan yang belum Selesai. Semua bal di dalamnya kembali ke gudang.
     */
    public function destroy($id)
    {
        $pengiriman = PengirimanBarang::with('items')->where('pengiriman_id', $id)->first();
        if (!$pengiriman) {
            // Belum sampai ke server (simpanan pembuatnya mungkin masih di jalan): catat agar ditolak nanti
            if (!CatatanHapus::sudahDihapus('pengiriman_barang', (string) $id)) {
                CatatanHapus::catat('pengiriman_barang', (string) $id, ['belum_di_server' => true]);
            }
            return response()->json(['status' => 'error', 'message' => "Surat Jalan {$id} tidak ditemukan"], 404);
        }

        if ($tolak = $this->tolakBilaSelesai($pengiriman)) {
            return $tolak;
        }

        return DB::transaction(function () use ($pengiriman) {
            $idBal = $pengiriman->items->pluck('barang_id');

            if ($idBal->isNotEmpty()) {
                Barang::whereIn('barang_id', $idBal)->update([
                    'status_stok' => 'di_gudang',
                    'tanggal_keluar' => null,
                ]);
            }

            CatatanHapus::catat('pengiriman_barang', $pengiriman->pengiriman_id, [
                'no_surat_jalan' => $pengiriman->no_surat_jalan,
                'jumlah_bal' => $idBal->count(),
            ]);
            $noSuratJalan = $pengiriman->no_surat_jalan;
            $pengiriman->delete(); // pengiriman_barang_item ikut terhapus (ON DELETE CASCADE)
            RelasiBatchSample::sesuaikan($idBal);

            return response()->json([
                'status' => 'success',
                'message' => "Surat Jalan {$noSuratJalan} dibatalkan; {$idBal->count()} bal kembali ke gudang.",
            ]);
        });
    }

    /**
     * Mengubah status Surat Jalan (mis. Dimuat -> Sedang Dikirim -> Selesai). Selesai bersifat final.
     * Bal baru benar-benar berstatus "keluar" gudang tepat saat Surat Jalan ini menjadi Selesai;
     * sebelum itu bal masih tampil "Di Gudang" walau sudah tercatat di Surat Jalan.
     */
    public function updateStatus(Request $request, $id)
    {
        [$pengiriman, $tolak] = $this->cariSuratJalan((string) $id);
        if ($tolak) {
            return $tolak;
        }

        $request->validate([
            'status' => 'required|in:dimuat,dalam_perjalanan,diterima,dikirim,selesai',
        ]);

        // Kirim ulang "Selesai" setelah yang pertama berhasil tetapi jawabannya hilang: bukan galat
        if ($pengiriman->status === 'selesai' && $request->status === 'selesai') {
            return response()->json([
                'status' => 'success',
                'message' => "Surat Jalan {$pengiriman->no_surat_jalan} sudah Selesai",
                'data' => $pengiriman->load(['items.barang.item']),
            ]);
        }
        if ($tolak = $this->tolakBilaSelesai($pengiriman)) {
            return $tolak;
        }

        return DB::transaction(function () use ($request, $pengiriman) {
            $pengiriman->status = $request->status;
            if ($request->status === 'selesai') {
                $pengiriman->tanggal_diterima = $pengiriman->tanggal_diterima ?? now()->toDateString();
                $idBal = $pengiriman->items->pluck('barang_id');
                if ($idBal->isNotEmpty()) {
                    Barang::whereIn('barang_id', $idBal)->update([
                        'status_stok' => 'keluar',
                        'tanggal_keluar' => $pengiriman->tanggal_diterima,
                    ]);
                }
            }
            $pengiriman->save();

            return response()->json([
                'status' => 'success',
                'message' => "Status Surat Jalan {$pengiriman->no_surat_jalan} diperbarui",
                'data' => $pengiriman->fresh()->load(['items.barang.item']),
            ]);
        });
    }
}

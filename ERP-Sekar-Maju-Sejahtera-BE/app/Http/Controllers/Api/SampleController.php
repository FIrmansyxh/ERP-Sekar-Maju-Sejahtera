<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SampleBatch;
use App\Models\SampleBatchItem;
use App\Services\SequenceService;
use App\Support\CatatanHapus;
use App\Support\RelasiBatchSample;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Batch sample / Reclass. Reclass hanya penentuan harga ulang: status bal tidak pernah diubah di sini
 * (bal baru keluar gudang lewat Surat Jalan). Satu bal hanya boleh ada di satu batch aktif.
 */
class SampleController extends Controller
{
    private const STATUS_BATCH = 'draft,sample,diproses,dikirim,dibatalkan,selesai';
    private const STATUS_ITEM = 'sample,dikirim,diterima,disetujui,ditolak,nego';

    public function indexBatch()
    {
        $batches = SampleBatch::with(['items.barang.item', 'gudang'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $batches]);
    }

    private function aturanBatch(bool $baru): array
    {
        return [
            'batch_id' => 'nullable|string|max:20',
            'versi' => 'nullable|integer|min:1',
            'kode_batch' => ($baru ? 'nullable' : 'sometimes') . '|string|max:40',
            'status' => 'sometimes|in:' . self::STATUS_BATCH,
            'tujuan_buyer' => ($baru ? 'required' : 'sometimes') . '|string|max:120',
            'permintaan_buyer' => 'nullable|string',
            'tanggal_kirim' => ($baru ? 'required' : 'sometimes') . '|date',
            'tanggal_respon' => 'nullable|date',
            'petugas_qc_pabrik' => 'nullable|string|max:120',
            'dikirim_oleh' => 'nullable|string|max:120',
            'catatan' => 'nullable|string',
            'items' => ($baru ? 'required|array|min:1' : 'sometimes|array'),
            'items.*.barang_id' => 'required_with:items|string',
            'items.*.status_item' => 'nullable|in:' . self::STATUS_ITEM,
            'items.*.harga_tawaran_kg' => 'nullable|numeric|min:0',
            'items.*.harga_deal_kg' => 'nullable|numeric|min:0',
            'items.*.berat_sample_gram' => 'nullable|numeric|min:0',
            'items.*.kode_harga_jual' => 'nullable|string',
            'items.*.alasan_tolak' => 'nullable|string',
            'items.*.catatan_nego' => 'nullable|string',
            'items.*.tanggal_evaluasi' => 'nullable|date',
            'items.*.sudah_dikirim_do' => 'nullable|boolean',
        ];
    }

    /** Field batch dari kiriman; nama pengirim (teks bebas di frontend) disimpan di dikirim_oleh_nama. */
    private function fieldBatch(Request $request): array
    {
        $field = $request->only([
            'status',
            'tujuan_buyer',
            'permintaan_buyer',
            'tanggal_kirim',
            'tanggal_respon',
            'petugas_qc_pabrik',
            'catatan',
        ]);
        if ($request->has('kode_batch') && trim((string) $request->kode_batch) !== '') {
            $field['kode_batch'] = trim((string) $request->kode_batch);
        }
        if ($request->has('dikirim_oleh')) {
            $field['dikirim_oleh_nama'] = $request->dikirim_oleh ?: null;
        }
        return $field;
    }

    /**
     * Pemeriksaan sebelum menyimpan bal ke batch, supaya penolakan database (kunci asing / unik) keluar sebagai
     * pesan yang bisa dibaca operator, bukan galat 500.
     */
    private function periksaItem(array $items, ?string $batchId): void
    {
        $idBal = collect($items)->pluck('barang_id')->map(fn ($v) => (string) $v)->filter()->values();
        if ($idBal->count() !== $idBal->unique()->count()) {
            throw ValidationException::withMessages(['items' => ['Ada bal yang tercantum dua kali di batch ini.']]);
        }

        $adaDiStok = DB::table('barang')->whereIn('barang_id', $idBal)->pluck('barang_id')->map(fn ($v) => (string) $v);
        $belumAda = $idBal->diff($adaDiStok);
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

        $dipakai = DB::table('sample_batch_item as i')
            ->join('sample_batch as b', 'b.batch_id', '=', 'i.batch_id')
            ->join('barang as g', 'g.barang_id', '=', 'i.barang_id')
            ->whereIn('i.barang_id', $idBal)
            ->where('i.status_item', '<>', 'ditolak')
            ->when($batchId, fn ($q) => $q->where('i.batch_id', '<>', $batchId))
            ->select('g.no_bal', 'b.kode_batch')
            ->get();
        if ($dipakai->isNotEmpty()) {
            $daftar = $dipakai->map(fn ($r) => "{$r->no_bal} ({$r->kode_batch})")->join(', ');
            throw ValidationException::withMessages(['items' => ["Bal sudah tercatat di batch sample lain: {$daftar}"]]);
        }
    }

    /**
     * Menyamakan isi batch dengan daftar kiriman: bal baru masuk, bal yang tidak ada lagi keluar, bal yang
     * tetap diperbarui harga/evaluasinya. ID item dibuat berurutan per batch ({batch_id}-001) agar tidak kembar.
     */
    private function sinkronkanItem(SampleBatch $batch, array $items): void
    {
        $lama = SampleBatchItem::where('batch_id', $batch->batch_id)->get()->keyBy(fn ($it) => (string) $it->barang_id);
        $idBaru = collect($items)->pluck('barang_id')->map(fn ($v) => (string) $v);

        $dibuang = $lama->keys()->diff($idBaru);
        if ($dibuang->isNotEmpty()) {
            SampleBatchItem::where('batch_id', $batch->batch_id)->whereIn('barang_id', $dibuang)->delete();
        }

        $urut = 0;
        foreach (SampleBatchItem::where('batch_id', $batch->batch_id)->pluck('sample_item_id') as $sid) {
            if (preg_match('/-(\d+)$/', (string) $sid, $m)) {
                $urut = max($urut, (int) $m[1]);
            }
        }

        foreach ($items as $itemData) {
            $barangId = (string) $itemData['barang_id'];
            $nilai = [];
            foreach ([
                'status_item',
                'harga_tawaran_kg',
                'harga_deal_kg',
                'berat_sample_gram',
                'kode_harga_jual',
                'alasan_tolak',
                'catatan_nego',
                'tanggal_evaluasi',
                'sudah_dikirim_do',
            ] as $field) {
                if (array_key_exists($field, $itemData)) {
                    $nilai[$field] = $itemData[$field];
                }
            }
            if (array_key_exists('kode_harga_jual', $nilai) && $nilai['kode_harga_jual'] === '') {
                $nilai['kode_harga_jual'] = null;
            }
            if (
                empty($nilai['tanggal_evaluasi'])
                && !empty($nilai['status_item'])
                && in_array($nilai['status_item'], ['disetujui', 'ditolak', 'nego'], true)
            ) {
                $nilai['tanggal_evaluasi'] = date('Y-m-d');
            }

            $ada = $lama->get($barangId);
            if ($ada) {
                if (!empty($nilai)) {
                    $ada->update($nilai);
                }
                continue;
            }
            $urut++;
            SampleBatchItem::create(array_merge([
                'status_item' => 'sample',
                'berat_sample_gram' => 200,
                'sudah_dikirim_do' => false,
            ], array_filter($nilai, fn ($v) => $v !== null), [
                'sample_item_id' => sprintf('%s-%03d', $batch->batch_id, $urut),
                'batch_id' => $batch->batch_id,
                'barang_id' => $barangId,
            ]));
        }
    }

    public function storeBatch(Request $request)
    {
        $request->validate($this->aturanBatch(true));

        // Batch yang sudah dihapus tidak boleh dibuat ulang oleh simpanan lama di perangkat lain
        if (!empty($request->batch_id) && CatatanHapus::sudahDihapus('sample_batch', (string) $request->batch_id)) {
            return CatatanHapus::jawaban("Batch {$request->kode_batch} sudah dihapus. Simpanan lama untuk batch ini dibatalkan.");
        }

        return DB::transaction(function () use ($request) {
            $kodeBatch = trim((string) $request->kode_batch);
            $batchIdKiriman = trim((string) $request->batch_id);

            // Kirim ulang batch yang sama (jawaban sebelumnya hilang / antrean mengulang): perbarui, jangan menggandakan
            if ($batchIdKiriman !== '') {
                $sama = SampleBatch::where('batch_id', $batchIdKiriman)->lockForUpdate()->first();
                if ($sama && ($kodeBatch === '' || $sama->kode_batch === $kodeBatch)) {
                    return $this->simpanPerubahan($request, $sama, 200, 'Batch sample sudah ada; isinya disamakan');
                }
            }
            if ($kodeBatch !== '' && SampleBatch::where('kode_batch', $kodeBatch)->exists()) {
                return response()->json([
                    'status' => 'error',
                    'message' => "No. Surat Sample {$kodeBatch} sudah dipakai batch lain.",
                ], 422);
            }

            $this->periksaItem($request->items, null);

            $batchId = $batchIdKiriman;
            if ($batchId === '' || SampleBatch::where('batch_id', $batchId)->exists()) {
                $batchId = SequenceService::generateBatchSampleId();
            }

            $batch = SampleBatch::create(array_merge($this->fieldBatch($request), [
                'batch_id' => $batchId,
                'kode_batch' => $kodeBatch !== '' ? $kodeBatch : ('BATCH-' . date('Ymd') . '-' . substr(uniqid(), -6)),
                'status' => $request->status ?? 'sample',
                'sumber_gudang_id' => $request->sumber_gudang_id ?? 'PMK-01',
                'dikirim_oleh' => optional(auth('sanctum')->user())->user_id,
            ]));

            $this->sinkronkanItem($batch, $request->items);
            RelasiBatchSample::sesuaikan(collect($request->items)->pluck('barang_id'), false);

            return response()->json([
                'status' => 'success',
                'message' => 'Batch sample berhasil dibuat',
                'data' => $batch->fresh()->load(['items.barang.item', 'gudang']),
            ], 201);
        });
    }

    /**
     * Ubah batch: data batch, status (termasuk Draft -> final), dan isi bal. Daftar `items` bila dikirim
     * menggantikan seluruh isi batch.
     */
    public function updateBatch(Request $request, $id)
    {
        $batch = SampleBatch::where('batch_id', $id)->first();
        if (!$batch) {
            if (CatatanHapus::sudahDihapus('sample_batch', (string) $id)) {
                return CatatanHapus::jawaban("Batch {$request->kode_batch} sudah dihapus. Perubahan untuk batch ini dibatalkan.");
            }
            return response()->json(['status' => 'error', 'message' => "Batch {$id} tidak ditemukan"], 404);
        }
        $request->validate($this->aturanBatch(false));

        return DB::transaction(function () use ($request, $batch) {
            return $this->simpanPerubahan($request, $batch, 200, 'Batch sample berhasil diperbarui');
        });
    }

    private function simpanPerubahan(Request $request, SampleBatch $batch, int $kode, string $pesan)
    {
        // Simpanan dari versi lama (batch sudah diubah di komputer lain sejak dibuka) ditolak supaya tidak menimpa
        // perubahan itu. Tanpa `versi` (kirim ulang pembuatan / klien lama) tidak diperiksa.
        $versi = SampleBatch::where('batch_id', $batch->batch_id)->lockForUpdate()->value('versi');
        if ($request->filled('versi') && (int) $request->versi !== (int) $versi) {
            return response()->json([
                'status' => 'error',
                'message' => "Batch {$batch->kode_batch} sudah diubah di komputer lain sejak dibuka di sini. Buka lagi batch ini untuk memuat data terbaru, lalu ulangi perubahan",
            ], 409);
        }

        $field = $this->fieldBatch($request);
        if (isset($field['kode_batch']) && $field['kode_batch'] !== $batch->kode_batch
            && SampleBatch::where('kode_batch', $field['kode_batch'])->where('batch_id', '<>', $batch->batch_id)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => "No. Surat Sample {$field['kode_batch']} sudah dipakai batch lain.",
            ], 422);
        }

        if ($request->has('items')) {
            $this->periksaItem($request->items, $batch->batch_id);
        }
        if (!empty($field)) {
            $batch->update($field);
        }
        if ($request->has('items')) {
            $this->sinkronkanItem($batch, $request->items);
            RelasiBatchSample::sesuaikan(collect($request->items)->pluck('barang_id'), false);
        }

        return response()->json([
            'status' => 'success',
            'message' => $pesan,
            'data' => $batch->fresh()->load(['items.barang.item', 'gudang']),
        ], $kode);
    }

    /**
     * Hapus batch sample beserta isinya. Bal tidak berubah (Reclass tidak mengubah bal) dan kembali bisa
     * dipilih untuk batch lain; Surat Jalan yang merujuk batch ini tetap ada tanpa rujukan batch.
     */
    public function destroyBatch($id)
    {
        $batch = SampleBatch::where('batch_id', $id)->first();
        if (!$batch) {
            // Batch belum sampai ke server (simpanan pembuatnya mungkin masih di jalan): catat agar ditolak nanti
            if (!CatatanHapus::sudahDihapus('sample_batch', (string) $id)) {
                CatatanHapus::catat('sample_batch', (string) $id, ['belum_di_server' => true]);
            }
            return response()->json(['status' => 'error', 'message' => "Batch {$id} tidak ditemukan"], 404);
        }

        DB::transaction(function () use ($batch) {
            DB::table('pengiriman_barang')->where('batch_sample_id_ref', $batch->batch_id)->update(['batch_sample_id_ref' => null]);
            SampleBatchItem::where('batch_id', $batch->batch_id)->delete();
            CatatanHapus::catat('sample_batch', $batch->batch_id, ['kode_batch' => $batch->kode_batch]);
            $batch->delete();
        });

        return response()->json([
            'status' => 'success',
            'message' => "Batch {$batch->kode_batch} dihapus",
        ]);
    }
}

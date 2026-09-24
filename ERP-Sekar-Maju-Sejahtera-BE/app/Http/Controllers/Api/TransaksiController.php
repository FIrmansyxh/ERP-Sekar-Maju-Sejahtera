<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TransaksiPembelian;
use App\Models\TransaksiItemBal;
use App\Models\Barang;
use App\Services\SequenceService;
use App\Support\CatatanHapus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransaksiController extends Controller
{
    /**
     * Kupon untuk diubah. Kupon yang sudah dihapus dijawab 410 (bukan 404), supaya perangkat lain yang masih
     * menyimpan perubahan untuk kupon itu tidak membuatnya ulang lewat jalur "belum ada, buat baru".
     *
     * @return array{0: ?TransaksiPembelian, 1: mixed}
     */
    private function cariKupon(string $id): array
    {
        $transaksi = TransaksiPembelian::with('items')->where('transaksi_id', $id)->first();
        if ($transaksi) {
            return [$transaksi, null];
        }
        if (CatatanHapus::sudahDihapus('transaksi_pembelian', $id)) {
            return [null, CatatanHapus::jawaban("Kupon {$id} sudah dihapus. Perubahan untuk kupon ini dibatalkan.")];
        }
        return [null, response()->json(['status' => 'error', 'message' => "Kupon {$id} tidak ditemukan"], 404)];
    }

    /**
     * Sama seperti cariKupon, tetapi baris kupon DIKUNCI sampai transaksi database selesai. Semua perubahan per bal
     * memakai ini, sehingga dua komputer yang mengubah kupon yang sama diproses bergantian, tidak saling menimpa.
     * Harus dipanggil di dalam DB::transaction.
     *
     * @return array{0: ?TransaksiPembelian, 1: mixed}
     */
    private function kunciKupon(string $id): array
    {
        $transaksi = TransaksiPembelian::where('transaksi_id', $id)->lockForUpdate()->first();
        if ($transaksi) {
            return [$transaksi->load('items'), null];
        }
        return $this->cariKupon($id);
    }

    private function jawabKupon(TransaksiPembelian $transaksi, string $pesan, int $kode = 200)
    {
        return response()->json([
            'status' => 'success',
            'message' => $pesan,
            'data' => $transaksi->fresh()->load(['petani', 'items.grade']),
        ], $kode);
    }

    private function tolakBilaLunas(TransaksiPembelian $transaksi)
    {
        if ($transaksi->status_pembayaran === 'lunas') {
            return response()->json([
                'status' => 'error',
                'message' => "Kupon {$transaksi->no_kupon} sudah lunas; bal tidak dapat ditambah, diubah, atau dihapus.",
            ], 422);
        }
        return null;
    }

    /**
     * Tahap kupon mengikuti isi balnya: setelah sortir ditutup, kupon "lengkap" bila semua bal sudah ditimbang dan
     * kembali "menunggu timbang" bila ada bal susulan / bal dibuka kuncinya. Kupon yang masih Proses Sortir atau
     * sudah lunas tidak diubah tahapnya.
     */
    private function sesuaikanTahap(TransaksiPembelian $transaksi): void
    {
        $transaksi->refresh();
        if ($transaksi->status_pembayaran === 'lunas' || $transaksi->status_tahap === 'proses_sortir') {
            return;
        }
        $items = TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id)->get();
        $semua = $items->count() > 0 && $items->every(fn ($i) => (float) $i->berat_kg > 0);
        $transaksi->status_tahap = $semua ? 'lengkap' : 'menunggu_timbang';
        $transaksi->status_transaksi = $semua ? 'lengkap' : 'menunggu';
        try {
            $transaksi->save();
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            // Kupon lengkap dibuka lagi (bal susulan / buka kunci) padahal nomor kuponnya sudah dipakai kupon aktif lain
            throw \Illuminate\Validation\ValidationException::withMessages([
                'no_kupon' => ["No. kupon {$transaksi->no_kupon} sedang dipakai kupon lain yang belum selesai; kupon ini tidak bisa dibuka lagi."],
            ]);
        }
    }

    /** Bal di kupon ini menurut item_id (bila cocok) atau No. Bal (tanpa beda huruf besar/kecil). */
    private function cariBal(TransaksiPembelian $transaksi, ?string $itemId, string $noBal): ?TransaksiItemBal
    {
        $q = TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id);
        if ($itemId) {
            $item = (clone $q)->where('item_id', $itemId)->first();
            if ($item) {
                return $item;
            }
        }
        return $q->whereRaw('UPPER(no_bal) = ?', [mb_strtoupper(trim($noBal))])->first();
    }

    /** Cap waktu kiriman lebih baru dari yang tersimpan (atau salah satunya kosong): perubahan boleh ditulis. */
    private function capLebihBaru($kiriman, $tersimpan): bool
    {
        $cap = $this->capWaktu($kiriman);
        if ($cap === null || $tersimpan === null || $tersimpan === '') {
            return true;
        }
        return $cap > (int) $tersimpan;
    }

    /**
     * Tambah satu atau beberapa bal ke kupon yang sudah ada (Sortir, termasuk bal susulan). Aman dikirim ulang:
     * No. Bal yang sudah ada di kupon ini tidak digandakan.
     */
    public function tambahBal(Request $request, $id)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.no_bal' => 'required',
            'items.*.kode_grade' => 'required|string|max:5',
            'items.*.harga_per_kg' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request, $id) {
            [$transaksi, $tolak] = $this->kunciKupon((string) $id);
            if ($tolak) {
                return $tolak;
            }
            if ($tolak = $this->tolakBilaLunas($transaksi)) {
                return $tolak;
            }
            $this->cekNoBalBentrok($request->items, $transaksi->transaksi_id);
            $this->sinkronkanItemSortir($transaksi, $request->items, false);
            $this->sesuaikanTahap($transaksi);
            return $this->jawabKupon($transaksi, 'Bal ditambahkan ke kupon');
        });
    }

    /**
     * Ubah SATU bal: hanya kolom yang dikirim di `perubahan` yang ditulis, bal lain di kupon tidak tersentuh.
     * Ganti tikar dan hasil timbang hanya ditimpa oleh perubahan yang lebih baru (cap waktu), supaya perubahan yang
     * tertunda lama di komputer yang sempat offline tidak menimpa timbangan yang lebih baru dari komputer lain.
     */
    public function ubahBal(Request $request, $id, $noBal)
    {
        $request->validate([
            'item_id' => 'nullable|string',
            'perubahan' => 'required|array',
            'perubahan.no_bal' => 'sometimes|required|string|max:30',
            'perubahan.kode_grade' => 'sometimes|required|string|max:5',
            'perubahan.harga_per_kg' => 'sometimes|required|numeric|min:0',
            'perubahan.berat_bruto_kg' => 'sometimes|nullable|numeric|min:0',
            'perubahan.potongan_tara_kg' => 'sometimes|nullable|numeric|min:0',
            'perubahan.berat_kg' => 'sometimes|nullable|numeric|min:0',
            'perubahan.is_netto_manual' => 'sometimes|boolean',
            'perubahan.ganti_tikar' => 'sometimes|boolean',
            'perubahan.potongan_tikar' => 'sometimes|nullable|numeric|min:0',
            'perubahan.potongan_kuli' => 'sometimes|nullable|numeric|min:0',
            'perubahan.potongan_tali' => 'sometimes|nullable|numeric|min:0',
            'perubahan.kode_bal_pembeli' => 'sometimes|nullable|string|max:30',
            'perubahan.barcode' => 'sometimes|nullable|string|max:50',
            'perubahan.lokasi_simpan' => 'sometimes|nullable|string|max:40',
            'perubahan.catatan' => 'sometimes|nullable|string',
            'ganti_tikar_diubah_pada' => 'nullable|numeric',
            'timbang_diubah_pada' => 'nullable|numeric',
        ]);

        return DB::transaction(function () use ($request, $id, $noBal) {
            [$transaksi, $tolak] = $this->kunciKupon((string) $id);
            if ($tolak) {
                return $tolak;
            }
            if ($tolak = $this->tolakBilaLunas($transaksi)) {
                return $tolak;
            }
            $item = $this->cariBal($transaksi, $request->input('item_id'), (string) $noBal);
            if (!$item) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Bal {$noBal} tidak ada lagi di kupon {$transaksi->no_kupon} (sudah dihapus di komputer lain). Perubahan dibatalkan.",
                ], 404);
            }

            $p = (array) $request->input('perubahan', []);
            $baru = [];

            if (array_key_exists('no_bal', $p)) {
                $noBaru = strtoupper(trim((string) $p['no_bal']));
                if ($noBaru !== strtoupper((string) $item->no_bal)) {
                    $this->cekNoBalBentrok([['no_bal' => $noBaru, 'barcode' => $noBaru, 'kode_grade' => $p['kode_grade'] ?? $item->kode_grade]], $transaksi->transaksi_id);
                    $kembar = TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id)
                        ->where('item_id', '<>', $item->item_id)
                        ->whereRaw('UPPER(no_bal) = ?', [$noBaru])
                        ->exists();
                    if ($kembar) {
                        return response()->json(['status' => 'error', 'message' => "No. Bal {$noBaru} sudah ada di kupon ini."], 422);
                    }
                    // Barcode mengikuti No. Bal bila selama ini sama (di frontend barcode = No. Bal)
                    if (!$item->barcode || strtoupper((string) $item->barcode) === strtoupper((string) $item->no_bal)) {
                        $baru['barcode'] = $noBaru;
                    }
                    $baru['no_bal'] = $noBaru;
                }
            }
            if (array_key_exists('kode_grade', $p)) {
                $kode = strtoupper(trim((string) $p['kode_grade']));
                $this->pastikanGrade([['kode_grade' => $kode]]);
                $baru['kode_grade'] = $kode;
            }
            foreach (['harga_per_kg', 'kode_bal_pembeli', 'lokasi_simpan', 'catatan', 'potongan_kuli', 'potongan_tali'] as $kolom) {
                if (array_key_exists($kolom, $p) && ($p[$kolom] !== null || in_array($kolom, ['kode_bal_pembeli', 'lokasi_simpan', 'catatan'], true))) {
                    $baru[$kolom] = $p[$kolom];
                }
            }
            if (array_key_exists('barcode', $p) && !array_key_exists('barcode', $baru)) {
                $baru['barcode'] = ($p['barcode'] ?? null) ?: null;
            }

            if (array_key_exists('ganti_tikar', $p) && $this->capLebihBaru($request->input('ganti_tikar_diubah_pada'), $item->ganti_tikar_diubah_pada)) {
                $gt = (bool) $p['ganti_tikar'];
                $baru['ganti_tikar'] = $gt;
                $baru['potongan_tikar'] = $gt ? (float) (($p['potongan_tikar'] ?? 0) ?: 75000) : 0;
                $cap = $this->capWaktu($request->input('ganti_tikar_diubah_pada'));
                if ($cap !== null) {
                    $baru['ganti_tikar_diubah_pada'] = $cap;
                }
            }

            $ubahBerat = count(array_intersect(array_keys($p), ['berat_bruto_kg', 'potongan_tara_kg', 'berat_kg', 'is_netto_manual'])) > 0;
            if ($ubahBerat && $this->capLebihBaru($request->input('timbang_diubah_pada'), $item->timbang_diubah_pada)) {
                foreach (['berat_bruto_kg', 'potongan_tara_kg', 'berat_kg'] as $kolom) {
                    if (array_key_exists($kolom, $p)) {
                        $baru[$kolom] = (float) ($p[$kolom] ?? 0);
                    }
                }
                if (array_key_exists('is_netto_manual', $p)) {
                    $baru['is_netto_manual'] = (bool) $p['is_netto_manual'];
                }
                $berat = array_key_exists('berat_kg', $baru) ? (float) $baru['berat_kg'] : (float) $item->berat_kg;
                $baru['status_timbang'] = $berat > 0 ? 'selesai_timbang' : 'menunggu_timbang';
                $cap = $this->capWaktu($request->input('timbang_diubah_pada'));
                if ($cap !== null) {
                    $baru['timbang_diubah_pada'] = $cap;
                }
                if (array_key_exists('berat_kg', $baru) && $berat > 0) {
                    $transaksi->petugas_timbang_user_id = optional(auth('sanctum')->user())->user_id ?? $transaksi->petugas_timbang_user_id;
                    $transaksi->save();
                }
            }

            if (!empty($baru)) {
                $item->update($baru);
                if (isset($baru['no_bal']) || isset($baru['kode_grade'])) {
                    Barang::where('transaksi_item_id', $item->item_id)->update(array_filter([
                        'no_bal' => $baru['no_bal'] ?? null,
                        'kode_grade' => $baru['kode_grade'] ?? null,
                    ]));
                }
            }
            $this->sesuaikanTahap($transaksi);
            return $this->jawabKupon($transaksi, 'Bal diperbarui');
        });
    }

    /**
     * Hapus SATU bal dari kupon yang belum lunas. Bal yang memang sudah tidak ada dianggap berhasil (dikirim ulang /
     * sudah dihapus komputer lain), sehingga penghapusan tidak pernah "mental".
     */
    public function hapusBal(Request $request, $id, $noBal)
    {
        return DB::transaction(function () use ($request, $id, $noBal) {
            [$transaksi, $tolak] = $this->kunciKupon((string) $id);
            if ($tolak) {
                return $tolak;
            }
            if ($tolak = $this->tolakBilaLunas($transaksi)) {
                return $tolak;
            }
            $item = $this->cariBal($transaksi, $request->query('item_id'), (string) $noBal);
            if (!$item) {
                return $this->jawabKupon($transaksi, "Bal {$noBal} sudah tidak ada di kupon");
            }
            if (Barang::where('transaksi_item_id', $item->item_id)->exists()) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Bal {$item->no_bal} sudah menjadi stok gudang dan tidak dapat dihapus dari kupon.",
                ], 422);
            }
            $item->delete();
            $this->sesuaikanTahap($transaksi);
            return $this->jawabKupon($transaksi, "Bal {$item->no_bal} dihapus dari kupon");
        });
    }

    /** Ubah data kupon (tahap sortir, catatan). Tahap "menunggu timbang"/"lengkap" dihitung dari isi bal. */
    public function ubahKupon(Request $request, $id)
    {
        $request->validate([
            'status_tahap' => 'nullable|in:proses_sortir,menunggu_timbang,lengkap',
            'catatan' => 'nullable|string',
            'catatan_qc' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $id) {
            [$transaksi, $tolak] = $this->kunciKupon((string) $id);
            if ($tolak) {
                return $tolak;
            }
            if ($request->has('catatan')) {
                $transaksi->catatan = $request->catatan;
            }
            if ($request->has('catatan_qc')) {
                $transaksi->catatan_qc = $request->catatan_qc;
            }
            if ($request->filled('status_tahap') && $transaksi->status_pembayaran !== 'lunas') {
                if ($request->status_tahap === 'proses_sortir') {
                    $transaksi->status_tahap = 'proses_sortir';
                    $transaksi->status_transaksi = 'menunggu';
                } else {
                    // Sortir ditutup: tahap berikutnya ditentukan oleh bal yang sudah / belum ditimbang
                    $transaksi->status_tahap = 'menunggu_timbang';
                }
                $transaksi->petugas_sortir_user_id = optional(auth('sanctum')->user())->user_id ?? $transaksi->petugas_sortir_user_id;
            }
            $transaksi->save();
            $this->sesuaikanTahap($transaksi);
            return $this->jawabKupon($transaksi, 'Kupon diperbarui');
        });
    }

    /**
     * Cap waktu (milidetik, jam perangkat) dari kiriman. Cap waktu yang jauh di depan jam server (jam komputer
     * salah) dipotong ke jam server agar tidak "mengunci" perubahan dari perangkat lain.
     */
    private function capWaktu($nilai): ?int
    {
        if ($nilai === null || $nilai === '' || !is_numeric($nilai)) {
            return null;
        }
        $n = (int) $nilai;
        if ($n <= 0) {
            return null;
        }
        return min($n, (int) round(microtime(true) * 1000) + 5 * 60 * 1000);
    }

    /**
     * Ganti tikar (GT) hanya berubah oleh perubahan yang disengaja dan lebih baru. Frontend mengirim
     * `ganti_tikar_diubah_pada` (kapan GT terakhir dicentang/dilepas); kiriman tanpa cap waktu, atau dengan cap
     * waktu lebih lama dari yang tersimpan, TIDAK mengubah GT. Ini menutup kasus "GT tercentang lalu beberapa
     * lama kemudian tidak tercentang": salinan kupon yang basi di perangkat lain tidak bisa lagi menimpa GT.
     * Klien lama yang tidak mengirim field cap waktu sama sekali tetap bisa mengubah GT selama belum pernah ada
     * perubahan bertanda waktu.
     */
    private function fieldGantiTikar(?TransaksiItemBal $item, array $itemData): array
    {
        if (!array_key_exists('ganti_tikar', $itemData)) {
            return [];
        }
        $klienBaru = array_key_exists('ganti_tikar_diubah_pada', $itemData);
        $capKirim = $this->capWaktu($itemData['ganti_tikar_diubah_pada'] ?? null);
        if ($item) {
            $capServer = $item->ganti_tikar_diubah_pada ? (int) $item->ganti_tikar_diubah_pada : null;
            if ($klienBaru && $capKirim === null) {
                return [];
            }
            if ($capServer !== null && ($capKirim === null || $capKirim <= $capServer)) {
                return [];
            }
        }
        $gt = (bool) $itemData['ganti_tikar'];
        $hasil = [
            'ganti_tikar' => $gt,
            'potongan_tikar' => $gt ? (float) (($itemData['potongan_tikar'] ?? 0) ?: 75000) : 0,
        ];
        if ($capKirim !== null) {
            $hasil['ganti_tikar_diubah_pada'] = $capKirim;
        }
        return $hasil;
    }

    /**
     * Hasil timbang (bruto, tara, netto) hanya ditimpa oleh timbangan yang lebih baru. Frontend mengirim
     * `timbang_diubah_pada` untuk bal yang ditimbang / dibuka kuncinya di perangkat itu; bal lain di kupon yang
     * ikut terkirim tanpa cap waktu tidak mengubah berat yang sudah ada di server.
     */
    private function bolehTimpaBerat(TransaksiItemBal $item, array $itemData): bool
    {
        if (!array_key_exists('timbang_diubah_pada', $itemData)) {
            return true; // klien lama
        }
        $capKirim = $this->capWaktu($itemData['timbang_diubah_pada']);
        $capServer = $item->timbang_diubah_pada ? (int) $item->timbang_diubah_pada : null;
        if ($capKirim === null) {
            // Tanpa perubahan di perangkat itu: hanya mengisi berat yang memang belum ada di server
            return (float) $item->berat_kg <= 0 && (float) ($itemData['berat_kg'] ?? 0) > 0;
        }
        return $capServer === null || $capKirim > $capServer;
    }
    /**
     * Nomor urut bal dalam kupon untuk pembuatan barang_id, diambil dari akhiran item_id
     * (mis. "TRX-...-BAL-02" -> 2). Nomor ini sudah dijamin unik per kupon sejak dibuat di
     * storeSortir/updateSortirItems, jadi tidak boleh diganti dengan angka yang diketik bebas
     * di No Bal (dua No Bal seperti "12A" dan "12B" bisa mengandung angka yang sama).
     */
    private static function urutanDariItemId(?string $itemId, int $fallback = 1): int
    {
        if ($itemId && preg_match('/-BAL-(\d+)$/', $itemId, $m)) {
            return (int) $m[1];
        }
        return $fallback;
    }

    public function index(Request $request)
    {
        $query = TransaksiPembelian::with(['petani', 'items.grade']);

        if ($request->has('tahap')) {
            $query->where('status_tahap', $request->tahap);
        }

        if ($request->has('pembayaran')) {
            $query->where('status_pembayaran', $request->pembayaran);
        }

        if ($request->has('tanggal')) {
            $query->where('tanggal_transaksi', $request->tanggal);
        }

        $transaksi = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $transaksi
        ]);
    }

    public function show($id)
    {
        [$transaksi, $tolak] = $this->cariKupon((string) $id);
        if ($tolak) {
            return $tolak;
        }

        return response()->json([
            'status' => 'success',
            'data' => $transaksi->load(['petani', 'items.grade'])
        ]);
    }

    public function storeSortir(Request $request)
    {
        $request->validate([
            'petani_id' => 'required|string|exists:petani,petani_id',
            'no_kupon' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.kode_grade' => 'required|string|max:5',
            'items.*.harga_per_kg' => 'required|numeric|min:0',
            'items.*.no_bal' => 'required',
        ], [
            'petani_id.exists' => 'Petani :input belum ada di server. Tunggu data petani terkirim, lalu kupon dikirim ulang otomatis.',
        ]);

        // Kupon yang sudah dihapus tidak boleh dibuat ulang oleh perangkat yang masih menyimpan simpanan lamanya
        if (!empty($request->transaksi_id) && CatatanHapus::sudahDihapus('transaksi_pembelian', (string) $request->transaksi_id)) {
            return CatatanHapus::jawaban("Kupon {$request->no_kupon} sudah dihapus. Simpanan lama untuk kupon ini dibatalkan.");
        }

        return DB::transaction(function() use ($request) {
            $noKupon = trim((string) $request->no_kupon);

            // Kirim ulang kupon yang sama (jawaban sebelumnya hilang / antrean mengulang) tidak boleh membuat
            // kupon kembar atau galat: daftar bal disamakan ke kupon yang sudah ada lalu kupon itu dikembalikan.
            $sama = null;
            if (!empty($request->transaksi_id)) {
                $sama = TransaksiPembelian::where('transaksi_id', $request->transaksi_id)->lockForUpdate()->first();
                if ($sama && trim((string) $sama->no_kupon) !== $noKupon) {
                    $sama = null; // ID yang sama milik kupon lain (dibuat komputer lain): kupon ini diberi ID baru
                }
            }
            $kuponAktif = TransaksiPembelian::where('no_kupon', $noKupon)
                ->where('status_tahap', '<>', 'lengkap')
                ->lockForUpdate()
                ->first();
            if (!$sama && $kuponAktif) {
                if ($kuponAktif->petani_id !== $request->petani_id) {
                    $nama = optional($kuponAktif->petani)->nama_petani ?? $kuponAktif->petani_id;
                    return response()->json([
                        'status' => 'error',
                        'message' => "No. kupon {$noKupon} masih dipakai kupon aktif milik {$nama}. Gunakan nomor kupon lain.",
                    ], 422);
                }
                // Kupon yang sama sudah dibuka dari komputer lain untuk petani yang sama: bal digabung ke sana
                $sama = $kuponAktif;
            }

            if ($sama) {
                if ($sama->status_pembayaran === 'lunas') {
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Kupon sudah ada di server dan sudah lunas',
                        'data' => $sama->load(['petani', 'items.grade']),
                    ]);
                }
                $this->cekNoBalBentrok($request->items, $sama->transaksi_id);
                $this->sinkronkanItemSortir($sama->load('items'), $request->items, false);
                return response()->json([
                    'status' => 'success',
                    'message' => 'Kupon sudah ada di server; daftar bal disamakan',
                    'data' => $sama->fresh()->load(['petani', 'items.grade']),
                ]);
            }

            // ID dari frontend dipakai bila masih kosong. Batas 22 karakter: item_id "{ID}-BAL-nnn" dan barang_id
            // "BAL-{ID tanpa TRX-}-nn" harus muat di kolom VARCHAR(30).
            $transaksiId = trim((string) $request->transaksi_id);
            if ($transaksiId === '' || strlen($transaksiId) > 22 || TransaksiPembelian::where('transaksi_id', $transaksiId)->exists()) {
                $transaksiId = SequenceService::generateTransaksiId();
            }

            $this->cekNoBalBentrok($request->items, $transaksiId);

            $transaksi = TransaksiPembelian::create([
                'transaksi_id' => $transaksiId,
                'no_kupon' => $noKupon,
                'petani_id' => $request->petani_id,
                'tanggal_transaksi' => $request->tanggal_transaksi ?? date('Y-m-d'),
                'jenis_timbang' => $request->jenis_timbang ?? 'netto',
                'status_transaksi' => 'menunggu',
                'status_tahap' => 'proses_sortir',
                'status_pembayaran' => 'belum_lunas',
                'status_nota' => 'belum_cetak',
                'petugas_sortir_user_id' => optional(auth('sanctum')->user())->user_id,
                'catatan' => $request->catatan,
            ]);

            foreach (array_values($request->items) as $idx => $itemData) {
                TransaksiItemBal::create(array_merge($this->fieldBalBaru($itemData), [
                    'item_id' => sprintf('%s-BAL-%02d', $transaksiId, $idx + 1),
                    'transaksi_id' => $transaksiId,
                ]));
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Kupon sortir berhasil dibuat',
                'data' => $transaksi->load(['petani', 'items.grade'])
            ], 201);
        });
    }

    /**
     * Sinkronkan daftar bal sortir pada kupon yang sudah ada (tambah/ubah/hapus bal belum ditimbang).
     * Daftar kosong diterima: semua bal yang belum ditimbang dihapus (bal terakhir dihapus di Sortir).
     * `bal_dihapus` berisi No. bal yang sengaja dihapus operator: dihapus walau sudah ditimbang (kupon belum lunas).
     */
    public function updateSortirItems(Request $request, $id)
    {
        [$transaksi, $tolak] = $this->cariKupon((string) $id);
        if ($tolak) {
            return $tolak;
        }

        if ($transaksi->status_pembayaran === 'lunas') {
            return response()->json([
                'status' => 'error',
                'message' => 'Kupon sudah lunas; daftar bal tidak dapat diubah',
            ], 422);
        }

        $request->validate([
            'items' => 'present|array',
            'items.*.kode_grade' => 'required|string|max:5',
            'items.*.harga_per_kg' => 'required|numeric|min:0',
            'items.*.no_bal' => 'required',
            'bal_dihapus' => 'nullable|array',
            'catatan' => 'nullable|string',
            'status_tahap' => 'nullable|in:proses_sortir,menunggu_timbang,lengkap',
        ]);

        return DB::transaction(function () use ($request, $transaksi) {
            $this->cekNoBalBentrok($request->items, $transaksi->transaksi_id);
            $this->sinkronkanItemSortir($transaksi, $request->items, true, (array) $request->input('bal_dihapus', []));

            if ($request->filled('catatan')) {
                $transaksi->catatan = $request->catatan;
            }
            if ($request->filled('status_tahap')) {
                $transaksi->status_tahap = $request->status_tahap;
            }
            $transaksi->petugas_sortir_user_id = optional(auth('sanctum')->user())->user_id
                ?? $transaksi->petugas_sortir_user_id;
            $transaksi->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Daftar bal sortir berhasil disinkronkan',
                'data' => $transaksi->fresh()->load(['petani', 'items.grade']),
            ]);
        });
    }

    /** Field sortir satu bal dari kiriman frontend (tanpa ganti tikar dan berat; keduanya punya aturan sendiri). */
    private function fieldSortir(array $itemData): array
    {
        return [
            'no_bal' => (string) $itemData['no_bal'],
            'kode_grade' => strtoupper(trim((string) $itemData['kode_grade'])),
            'harga_per_kg' => $itemData['harga_per_kg'],
            'kode_bal_pembeli' => $itemData['kode_bal_pembeli'] ?? null,
            'barcode' => ($itemData['barcode'] ?? null) ?: null,
            'lokasi_simpan' => $itemData['lokasi_simpan'] ?? 'Blok A',
            'sample_label_code' => $itemData['sample_label_code'] ?? null,
            'potongan_kuli' => $itemData['potongan_kuli'] ?? 7000,
            'potongan_tali' => $itemData['potongan_tali'] ?? 3000,
        ];
    }

    /** Semua field bal yang baru pertama kali tersimpan di server (termasuk GT dan berat apa adanya). */
    private function fieldBalBaru(array $itemData): array
    {
        $beratKg = (float) ($itemData['berat_kg'] ?? 0);
        $gt = (bool) ($itemData['ganti_tikar'] ?? false);
        return array_merge($this->fieldSortir($itemData), [
            'ganti_tikar' => $gt,
            'potongan_tikar' => $gt ? (float) (($itemData['potongan_tikar'] ?? 0) ?: 75000) : 0,
            'ganti_tikar_diubah_pada' => $this->capWaktu($itemData['ganti_tikar_diubah_pada'] ?? null),
            'berat_bruto_kg' => $itemData['berat_bruto_kg'] ?? 0,
            'potongan_tara_kg' => $itemData['potongan_tara_kg'] ?? 0,
            'berat_kg' => $beratKg,
            'timbang_diubah_pada' => $this->capWaktu($itemData['timbang_diubah_pada'] ?? null),
            'status_timbang' => $beratKg > 0 ? 'selesai_timbang' : 'menunggu_timbang',
        ]);
    }

    /**
     * Kode grade bal harus terdaftar di grade_master (kunci asing). Kupon dan Master Harga Beli dikirim lewat
     * antrean yang berbeda, jadi kupon bisa tiba lebih dulu; kodenya didaftarkan di sini (sama seperti
     * MasterDataController::storeHarga) daripada ditolak galat 500.
     */
    private function pastikanGrade(array $items): void
    {
        $kode = collect($items)->pluck('kode_grade')->map(fn ($v) => strtoupper(trim((string) $v)))->filter()->unique();
        foreach ($kode as $k) {
            \App\Models\GradeMaster::firstOrCreate(['kode_grade' => $k], ['nama_grade' => 'Grade ' . $k, 'warna_badge' => 'zinc']);
        }
    }

    /**
     * No. bal (dan barcode, yang di frontend sama dengan No. bal) unik di seluruh gudang. Tolak dengan pesan
     * yang jelas bila sudah tercatat di kupon lain, daripada galat 500 dari database.
     */
    private function cekNoBalBentrok(array $items, string $transaksiId): void
    {
        $this->pastikanGrade($items);
        $barcode = collect($items)->map(fn ($it) => ($it['barcode'] ?? null) ?: null)->filter()->unique()->values();
        // No. Bal juga unik di seluruh gudang (di frontend barcode = No. Bal); dicek tanpa beda huruf besar/kecil
        $noBal = collect($items)->map(fn ($it) => strtoupper(trim((string) ($it['no_bal'] ?? ''))))->filter()->unique()->values();
        if ($barcode->isEmpty() && $noBal->isEmpty()) {
            return;
        }
        $bentrok = TransaksiItemBal::where('transaksi_id', '<>', $transaksiId)
            ->where(function ($q) use ($barcode, $noBal) {
                if ($barcode->isNotEmpty()) {
                    $q->whereIn('barcode', $barcode);
                }
                if ($noBal->isNotEmpty()) {
                    $q->orWhereIn(DB::raw('UPPER(no_bal)'), $noBal->all());
                }
            })
            ->with('transaksi:transaksi_id,no_kupon')
            ->get();
        if ($bentrok->isNotEmpty()) {
            $daftar = $bentrok->map(fn ($b) => "{$b->no_bal} (kupon " . (optional($b->transaksi)->no_kupon ?? $b->transaksi_id) . ')')->join(', ');
            throw \Illuminate\Validation\ValidationException::withMessages([
                'items' => ["No. bal sudah tercatat di kupon lain: {$daftar}"],
            ]);
        }
    }

    /**
     * Menyamakan daftar bal kupon dengan kiriman: bal baru ditambah, bal yang ada diperbarui field sortirnya.
     * Bila $hapusYangHilang, bal yang tidak ada lagi di kiriman dihapus selama belum ditimbang dan belum
     * menjadi stok gudang. Bal di $balDihapus (dihapus sengaja oleh operator) dihapus walau sudah ditimbang,
     * selama belum menjadi stok gudang (kupon belum lunas).
     */
    private function sinkronkanItemSortir(TransaksiPembelian $transaksi, array $items, bool $hapusYangHilang, array $balDihapus = []): void
    {
        $incomingNos = collect($items)->map(fn ($item) => strtoupper((string) $item['no_bal']))->unique()->values()->all();
        $incomingItemIds = collect($items)->pluck('item_id')->filter()->map(fn ($v) => (string) $v)->values()->all();
        $dihapusSengaja = collect($balDihapus)->map(fn ($v) => strtoupper(trim((string) $v)))->filter()->values()->all();

        if ($hapusYangHilang || !empty($dihapusSengaja)) {
            foreach ($transaksi->items as $existing) {
                $no = strtoupper((string) $existing->no_bal);
                $idMasih = !empty($existing->item_id) && in_array((string) $existing->item_id, $incomingItemIds, true);
                if (in_array($no, $incomingNos, true) || $idMasih) {
                    continue;
                }
                $punyaBarang = Barang::where('transaksi_item_id', $existing->item_id)->exists();
                if ($punyaBarang) {
                    continue;
                }
                $sudahDitimbang = $existing->status_timbang === 'selesai_timbang' || (float) $existing->berat_kg > 0;
                if (in_array($no, $dihapusSengaja, true) || ($hapusYangHilang && !$sudahDitimbang)) {
                    $existing->delete();
                }
            }
        }

        $maxSeq = 0;
        foreach (TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id)->get() as $row) {
            if (preg_match('/-BAL-(\d+)$/', (string) $row->item_id, $m)) {
                $maxSeq = max($maxSeq, (int) $m[1]);
            }
        }

        foreach ($items as $itemData) {
            $noBal = (string) $itemData['no_bal'];
            $item = null;
            if (!empty($itemData['item_id'])) {
                $item = TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id)
                    ->where('item_id', $itemData['item_id'])
                    ->first();
            }
            if (!$item) {
                $item = TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id)
                    ->where('no_bal', $noBal)
                    ->first();
            }

            if ($item) {
                $item->update(array_merge($this->fieldSortir($itemData), $this->fieldGantiTikar($item, $itemData)));
                Barang::where('transaksi_item_id', $item->item_id)->update([
                    'no_bal' => $noBal,
                    'kode_grade' => strtoupper(trim((string) $itemData['kode_grade'])),
                ]);
            } else {
                $maxSeq++;
                TransaksiItemBal::create(array_merge($this->fieldBalBaru($itemData), [
                    'item_id' => sprintf('%s-BAL-%02d', $transaksi->transaksi_id, $maxSeq),
                    'transaksi_id' => $transaksi->transaksi_id,
                ]));
            }
        }
    }

    /**
     * Menghapus kupon (dengan alasan untuk audit). Ditolak bila ada bal yang sudah masuk Surat Jalan.
     * Bal di batch sample ikut dikeluarkan dari batch, stok bal dihapus, lalu kupon & rincian balnya dihapus.
     * Penghapusan dicatat supaya kupon ini tidak bisa dibuat ulang oleh simpanan lama di perangkat lain; juga
     * dicatat bila kupon belum sampai ke server (simpanan pembuatnya yang masih di jalan akan ditolak).
     */
    public function destroy(Request $request, $id)
    {
        $alasan = $request->query('alasan', $request->input('alasan'));
        $transaksi = TransaksiPembelian::with('items')->where('transaksi_id', $id)->first();
        if (!$transaksi) {
            if (!CatatanHapus::sudahDihapus('transaksi_pembelian', (string) $id)) {
                CatatanHapus::catat('transaksi_pembelian', (string) $id, ['alasan' => $alasan, 'belum_di_server' => true]);
            }
            return response()->json(['status' => 'error', 'message' => "Kupon {$id} tidak ditemukan"], 404);
        }

        $idBarang = Barang::where('transaksi_id', $transaksi->transaksi_id)->pluck('barang_id');
        if ($idBarang->isNotEmpty()) {
            $diSuratJalan = DB::table('pengiriman_barang_item as pbi')
                ->join('pengiriman_barang as pb', 'pb.pengiriman_id', '=', 'pbi.pengiriman_id')
                ->join('barang as b', 'b.barang_id', '=', 'pbi.barang_id')
                ->whereIn('pbi.barang_id', $idBarang)
                ->select('b.no_bal', 'pb.no_surat_jalan')
                ->get();
            if ($diSuratJalan->isNotEmpty()) {
                $daftar = $diSuratJalan->map(fn ($r) => "{$r->no_bal} (SJ {$r->no_surat_jalan})")->join(', ');
                return response()->json([
                    'status' => 'error',
                    'message' => "Kupon {$transaksi->no_kupon} tidak dapat dihapus: bal sudah masuk Surat Jalan: {$daftar}",
                ], 422);
            }
        }

        DB::transaction(function () use ($transaksi, $idBarang, $alasan) {
            if ($idBarang->isNotEmpty()) {
                DB::table('sample_batch_item')->whereIn('barang_id', $idBarang)->delete();
                DB::table('stock_opname_item')->whereIn('barang_id', $idBarang)->delete();
                Barang::whereIn('barang_id', $idBarang)->delete();
            }
            CatatanHapus::catat('transaksi_pembelian', $transaksi->transaksi_id, [
                'no_kupon' => $transaksi->no_kupon,
                'petani_id' => $transaksi->petani_id,
                'status_pembayaran' => $transaksi->status_pembayaran,
                'jumlah_bal' => $transaksi->items->count(),
                'alasan' => $alasan,
            ]);
            $transaksi->delete(); // transaksi_item_bal ikut terhapus (ON DELETE CASCADE)
        });

        return response()->json([
            'status' => 'success',
            'message' => "Kupon {$transaksi->no_kupon} dihapus",
        ]);
    }

    public function updateTimbang(Request $request, $id)
    {
        [$transaksi, $tolak] = $this->cariKupon((string) $id);
        if ($tolak) {
            return $tolak;
        }

        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.berat_bruto_kg' => 'required|numeric|min:0',
            'items.*.potongan_tara_kg' => 'required|numeric|min:0',
            'items.*.berat_kg' => 'required|numeric|min:0',
            'status_tahap' => 'nullable|in:proses_sortir,menunggu_timbang,lengkap',
        ]);

        return DB::transaction(function() use ($request, $transaksi) {
            foreach ($request->items as $itemData) {
                $item = null;
                if (!empty($itemData['item_id'])) {
                    $item = TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id)->where('item_id', $itemData['item_id'])->first();
                }
                if (!$item && !empty($itemData['no_bal'])) {
                    $item = TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id)
                        ->where('no_bal', (string) $itemData['no_bal'])
                        ->first();
                }

                if ($item) {
                    // Ganti tikar punya aturan cap waktu sendiri; berlaku walau berat tidak berubah
                    $perubahan = $this->fieldGantiTikar($item, $itemData);

                    $beratKg = (float) $itemData['berat_kg'];
                    // Jangan tandai selesai_timbang untuk bal yang belum punya berat, dan jangan biarkan salinan
                    // kupon yang basi menimpa hasil timbang yang lebih baru dari perangkat lain
                    $adaBerat = $beratKg > 0 || (float) ($itemData['berat_bruto_kg'] ?? 0) > 0;
                    if ($adaBerat && $this->bolehTimpaBerat($item, $itemData)) {
                        $perubahan = array_merge($perubahan, [
                            'berat_bruto_kg' => $itemData['berat_bruto_kg'],
                            'potongan_tara_kg' => $itemData['potongan_tara_kg'],
                            'berat_kg' => $itemData['berat_kg'],
                            'is_netto_manual' => $itemData['is_netto_manual'] ?? false,
                            'status_timbang' => $beratKg > 0 ? 'selesai_timbang' : 'menunggu_timbang',
                            'lokasi_simpan' => $itemData['lokasi_simpan'] ?? $item->lokasi_simpan,
                            'potongan_kuli' => $itemData['potongan_kuli'] ?? $item->potongan_kuli,
                            'potongan_tali' => $itemData['potongan_tali'] ?? $item->potongan_tali,
                        ]);
                        $cap = $this->capWaktu($itemData['timbang_diubah_pada'] ?? null);
                        if ($cap !== null) {
                            $perubahan['timbang_diubah_pada'] = $cap;
                        }
                    }

                    if (!empty($perubahan)) {
                        $item->update($perubahan);
                    }
                }
            }

            $transaksi->refresh();
            $items = $transaksi->items()->get();
            $allWeighed = $items->count() > 0 && $items->every(
                fn ($i) => $i->status_timbang === 'selesai_timbang' || (float) $i->berat_kg > 0
            );

            if ($request->filled('status_tahap')) {
                $transaksi->status_tahap = $request->status_tahap;
            } elseif ($transaksi->status_tahap === 'proses_sortir') {
                // Biarkan paralel Sortir↔Timbang: jangan paksa keluar dari proses_sortir
            } else {
                $transaksi->status_tahap = $allWeighed ? 'lengkap' : 'menunggu_timbang';
            }

            $transaksi->petugas_timbang_user_id = optional(auth('sanctum')->user())->user_id;
            $transaksi->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Data timbangan berhasil diperbarui',
                'data' => $transaksi->load(['petani', 'items.grade'])
            ]);
        });
    }

    public function bayar(Request $request, $id)
    {
        $request->validate([
            'metode_pembayaran' => 'required|in:cash,kredit',
            'gudang_id' => 'nullable|string',
        ]);

        return DB::transaction(function() use ($request, $id) {
            [$transaksi, $tolak] = $this->kunciKupon((string) $id);
            if ($tolak) {
                return $tolak;
            }

            // Kirim ulang pelunasan yang sudah tercatat (jawaban sebelumnya hilang): bukan galat, tidak dicatat ulang
            if ($transaksi->status_pembayaran === 'lunas') {
                return $this->jawabKupon($transaksi, 'Kupon sudah lunas');
            }

            // Aturan yang sama dengan layar Kasir, dijaga juga di server supaya komputer mana pun tidak bisa
            // melunasi kupon yang sortirnya belum ditutup atau masih punya bal tanpa berat
            if ($transaksi->status_tahap === 'proses_sortir') {
                return response()->json([
                    'status' => 'error',
                    'message' => "Sortir kupon {$transaksi->no_kupon} belum ditutup. Tekan \"Selesai Sortir\" dulu sebelum dibayar.",
                ], 422);
            }
            $belum = $transaksi->items->filter(fn ($i) => (float) $i->berat_kg <= 0);
            if ($transaksi->items->isEmpty() || $belum->isNotEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => $transaksi->items->isEmpty()
                        ? "Kupon {$transaksi->no_kupon} belum memiliki bal."
                        : "Kupon {$transaksi->no_kupon} masih memiliki {$belum->count()} bal yang belum ditimbang: " . $belum->pluck('no_bal')->join(', '),
                ], 422);
            }

            $gudangId = $request->gudang_id ?? 'PMK-01';

            $transaksi->update([
                'status_pembayaran' => 'lunas',
                'status_tahap' => 'lengkap',
                'status_transaksi' => 'lengkap',
                'status_nota' => 'sudah_cetak',
                'metode_pembayaran' => $request->metode_pembayaran,
                'dibayar_pada' => now(),
                'dibayar_oleh' => optional(auth('sanctum')->user())->user_id,
                'catatan_kasir' => $request->catatan_kasir ?? null,
            ]);

            // Create inventory records for each bal
            foreach ($transaksi->items as $idx => $item) {
                // Nomor urut diambil dari item_id (...-BAL-01, -02, ...), BUKAN dari angka pada No Bal:
                // No Bal boleh diisi bebas oleh petugas (mis. "12A" dan "12B" sama-sama mengandung angka 12),
                // sehingga dua bal berbeda bisa mendapat barang_id yang sama dan pembayaran gagal (unique violation).
                $noBalInt = self::urutanDariItemId($item->item_id, $idx + 1);
                $balId = SequenceService::generateBalId($transaksi->transaksi_id, $noBalInt);

                Barang::updateOrCreate(
                    ['transaksi_item_id' => $item->item_id],
                    [
                        'barang_id' => $balId,
                        'transaksi_id' => $transaksi->transaksi_id,
                        'petani_id' => $transaksi->petani_id,
                        'kode_grade' => $item->kode_grade,
                        'no_bal' => $item->no_bal,
                        'status_stok' => 'di_gudang',
                        'gudang_id' => $gudangId,
                        'lokasi_blok' => $item->lokasi_simpan ?? 'Blok A',
                        'tanggal_masuk' => $transaksi->tanggal_transaksi,
                    ]
                );
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi berhasil dilunasi dan stok bal masuk ke gudang',
                'data' => $transaksi->load(['petani', 'items.grade'])
            ]);
        });
    }

    /**
     * Koreksi kasir: ubah petani, tanggal, status bayar, catatan, dan rincian bal.
     * Boleh untuk kupon lunas maupun belum (beda dari sortir-items).
     */
    public function koreksi(Request $request, $id)
    {
        $transaksi = TransaksiPembelian::with('items')->where('transaksi_id', $id)->firstOrFail();

        $request->validate([
            'petani_id' => 'required|string|exists:petani,petani_id',
            'tanggal_transaksi' => 'required|date',
            'status_pembayaran' => 'required|in:lunas,belum_lunas',
            'metode_pembayaran' => 'nullable|in:cash,kredit',
            'catatan' => 'nullable|string',
            'catatan_kasir' => 'nullable|string',
            'alasan_perubahan' => 'required|string|min:3',
            'items' => 'required|array|min:1',
            'items.*.no_bal' => 'required',
            'items.*.kode_grade' => 'required|string',
            'items.*.harga_per_kg' => 'required|numeric|min:0',
            'items.*.berat_kg' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request, $transaksi) {
            $wasLunas = $transaksi->status_pembayaran === 'lunas'
                || $transaksi->metode_pembayaran === 'cash';
            $willBeLunas = $request->status_pembayaran === 'lunas';

            $transaksi->petani_id = $request->petani_id;
            $transaksi->tanggal_transaksi = $request->tanggal_transaksi;
            $transaksi->status_pembayaran = $request->status_pembayaran;
            $transaksi->catatan = $request->catatan;
            $transaksi->catatan_kasir = $request->catatan_kasir;
            $transaksi->alasan_perubahan_terakhir = $request->alasan_perubahan;
            $transaksi->terakhir_diubah_oleh = optional(auth('sanctum')->user())->user_id
                ?? $request->input('terakhir_diubah_oleh');
            $transaksi->terakhir_diubah_pada = now();

            if ($willBeLunas) {
                $transaksi->metode_pembayaran = $request->metode_pembayaran ?: ($transaksi->metode_pembayaran ?: 'cash');
                if (!$wasLunas) {
                    $transaksi->dibayar_pada = now();
                    $transaksi->dibayar_oleh = optional(auth('sanctum')->user())->user_id;
                    $transaksi->status_tahap = 'lengkap';
                    $transaksi->status_transaksi = 'lengkap';
                }
            } else {
                $transaksi->metode_pembayaran = null;
                $transaksi->dibayar_pada = null;
                $transaksi->dibayar_oleh = null;
            }

            $incomingNos = collect($request->items)
                ->map(fn ($item) => (string) $item['no_bal'])
                ->unique()
                ->values()
                ->all();

            foreach ($transaksi->items as $existing) {
                if (in_array((string) $existing->no_bal, $incomingNos, true)) {
                    continue;
                }
                $barang = Barang::where('transaksi_item_id', $existing->item_id)->first();
                if ($barang && in_array($barang->status_stok, ['keluar', 'terkirim_sample'], true)) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => ["Bal {$existing->no_bal} sudah keluar gudang dan tidak dapat dihapus dari koreksi."],
                    ]);
                }
                if ($barang) {
                    $barang->delete();
                }
                $existing->delete();
            }

            $maxSeq = 0;
            foreach (TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id)->get() as $row) {
                if (preg_match('/-BAL-(\d+)$/', (string) $row->item_id, $m)) {
                    $maxSeq = max($maxSeq, (int) $m[1]);
                }
            }

            foreach ($request->items as $itemData) {
                $noBal = (string) $itemData['no_bal'];
                $item = TransaksiItemBal::where('transaksi_id', $transaksi->transaksi_id)
                    ->where('no_bal', $noBal)
                    ->first();

                $beratKg = (float) ($itemData['berat_kg'] ?? 0);
                $bruto = (float) ($itemData['berat_bruto_kg'] ?? ($beratKg + (float) ($itemData['potongan_tara_kg'] ?? 0)));
                $fields = [
                    'kode_grade' => $itemData['kode_grade'],
                    'harga_per_kg' => $itemData['harga_per_kg'],
                    'berat_bruto_kg' => $bruto,
                    'potongan_tara_kg' => $itemData['potongan_tara_kg'] ?? 0,
                    'berat_kg' => $beratKg,
                    'potongan_kuli' => $itemData['potongan_kuli'] ?? 7000,
                    'potongan_tali' => $itemData['potongan_tali'] ?? 3000,
                    'potongan_tikar' => $itemData['potongan_tikar'] ?? 0,
                    'status_timbang' => $beratKg > 0 ? 'selesai_timbang' : 'menunggu_timbang',
                    'barcode' => $itemData['barcode'] ?? $noBal,
                    'catatan' => $itemData['catatan'] ?? null,
                ];

                if ($item) {
                    $item->update($fields);
                } else {
                    $maxSeq++;
                    $itemId = sprintf('%s-BAL-%02d', $transaksi->transaksi_id, $maxSeq);
                    $item = TransaksiItemBal::create(array_merge($fields, [
                        'item_id' => $itemId,
                        'transaksi_id' => $transaksi->transaksi_id,
                        'no_bal' => $noBal,
                        'lokasi_simpan' => $itemData['lokasi_simpan'] ?? 'Blok A',
                    ]));
                }

                $barang = Barang::where('transaksi_item_id', $item->item_id)->first()
                    ?: Barang::where('transaksi_id', $transaksi->transaksi_id)->where('no_bal', $noBal)->first();

                if ($barang) {
                    $barang->update([
                        'petani_id' => $request->petani_id,
                        'kode_grade' => $item->kode_grade,
                        'no_bal' => $item->no_bal,
                        'tanggal_masuk' => $request->tanggal_transaksi,
                        'transaksi_id' => $transaksi->transaksi_id,
                        'transaksi_item_id' => $item->item_id,
                    ]);
                } elseif ($willBeLunas && $beratKg > 0) {
                    $noBalInt = self::urutanDariItemId($item->item_id);
                    $balId = SequenceService::generateBalId($transaksi->transaksi_id, $noBalInt);
                    Barang::create([
                        'barang_id' => $balId,
                        'transaksi_item_id' => $item->item_id,
                        'transaksi_id' => $transaksi->transaksi_id,
                        'petani_id' => $request->petani_id,
                        'kode_grade' => $item->kode_grade,
                        'no_bal' => $item->no_bal,
                        'status_stok' => 'di_gudang',
                        'gudang_id' => 'PMK-01',
                        'lokasi_blok' => $item->lokasi_simpan ?? 'Blok A',
                        'tanggal_masuk' => $request->tanggal_transaksi,
                    ]);
                }
            }

            // Jika dikoreksi jadi belum lunas: jangan hapus barang yang sudah keluar
            if (!$willBeLunas && $wasLunas) {
                Barang::where('transaksi_id', $transaksi->transaksi_id)
                    ->whereNotIn('status_stok', ['keluar', 'terkirim_sample'])
                    ->delete();
            }

            $transaksi->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Koreksi transaksi berhasil disimpan',
                'data' => $transaksi->fresh()->load(['petani', 'items.grade']),
            ]);
        });
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Petani;
use App\Services\SequenceService;
use App\Support\CatatanHapus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PetaniController extends Controller
{
    /**
     * ID kartu yang sudah diganti (lihat gantiId) dijawab 410 beserta ID penggantinya, supaya perubahan lama
     * yang masih memakai ID lama tidak membuat ulang petani dengan ID lama.
     */
    private function jawabanIdLama(string $id)
    {
        $info = CatatanHapus::cari('petani', $id);
        if ($info === null) {
            return null;
        }
        $baru = $info['petani_id_baru'] ?? null;
        return CatatanHapus::jawaban(
            $baru ? "ID kartu petani {$id} sudah diganti menjadi {$baru}." : "Petani {$id} sudah dihapus.",
            ['pengganti' => $baru]
        );
    }
    public function index(Request $request)
    {
        $query = Petani::query();

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama_petani', 'ILIKE', "%{$search}%")
                  ->orWhere('petani_id', 'ILIKE', "%{$search}%")
                  ->orWhere('no_hp', 'ILIKE', "%{$search}%")
                  ->orWhere('desa_kecamatan', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $status = filter_var($request->status, FILTER_VALIDATE_BOOLEAN);
            $query->where('status_aktif', $status);
        }

        $petani = $query->orderBy('nama_petani', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $petani
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_petani' => 'required|string|max:120',
            'alamat' => 'nullable|string',
            'no_hp' => 'nullable|string|max:20',
            'desa_kecamatan' => 'nullable|string|max:120',
            'catatan' => 'nullable|string',
            'petani_id' => 'nullable|string|max:20',
        ]);

        // ID dari frontend dipakai bila masih kosong, supaya petani yang dibuat saat offline (dan kupon yang
        // sudah merujuknya) tetap ber-ID sama. Kirim ulang petani yang sama (jawaban sebelumnya hilang)
        // mengembalikan data yang sudah ada; ID yang ternyata milik petani lain diganti ID baru dari server.
        $petaniId = trim((string) $request->input('petani_id', ''));
        if ($petaniId !== '' && !Petani::where('petani_id', $petaniId)->exists() && ($idLama = $this->jawabanIdLama($petaniId))) {
            return $idLama;
        }
        if ($petaniId !== '') {
            $sudahAda = Petani::where('petani_id', $petaniId)->first();
            if ($sudahAda) {
                if (mb_strtolower(trim($sudahAda->nama_petani)) === mb_strtolower(trim($request->nama_petani))) {
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Petani sudah terdaftar',
                        'data' => $sudahAda,
                    ]);
                }
                $petaniId = '';
            }
        }
        if ($petaniId === '') {
            $petaniId = SequenceService::generatePetaniId();
        }

        $petani = Petani::create([
            'petani_id' => $petaniId,
            'nama_petani' => $request->nama_petani,
            'alamat' => $request->alamat ?? '',
            'no_hp' => $request->no_hp,
            'desa_kecamatan' => $request->desa_kecamatan,
            'status_aktif' => true,
            'tanggal_daftar' => $request->tanggal_daftar ?? date('Y-m-d'),
            'catatan' => $request->catatan,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Petani berhasil didaftarkan',
            'data' => $petani
        ], 201);
    }

    public function show($id)
    {
        $petani = Petani::with(['transaksi', 'barang'])->where('petani_id', $id)->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $petani
        ]);
    }

    public function update(Request $request, $id)
    {
        $petani = Petani::where('petani_id', $id)->first();
        if (!$petani) {
            return $this->jawabanIdLama((string) $id)
                ?? response()->json(['status' => 'error', 'message' => "Petani {$id} tidak ditemukan"], 404);
        }

        $request->validate([
            'nama_petani' => 'sometimes|required|string|max:120',
            'alamat' => 'nullable|string',
            'no_hp' => 'nullable|string|max:20',
            'desa_kecamatan' => 'nullable|string|max:120',
            'status_aktif' => 'sometimes|boolean',
            'alasan_nonaktif' => 'nullable|string',
            'catatan' => 'nullable|string',
        ]);

        $petani->update($request->only([
            'nama_petani',
            'alamat',
            'no_hp',
            'desa_kecamatan',
            'status_aktif',
            'alasan_nonaktif',
            'catatan',
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Data petani berhasil diperbarui',
            'data' => $petani
        ]);
    }

    /**
     * Ganti ID kartu petani (kartu hilang / cetak ulang). Semua kupon dan bal milik petani ikut pindah ke ID baru.
     */
    public function gantiId(Request $request, $id)
    {
        $request->validate([
            'petani_id_baru' => 'required|string|max:20',
        ]);
        $idBaru = trim($request->petani_id_baru);

        $lama = Petani::where('petani_id', $id)->first();
        if (!$lama) {
            // Kirim ulang setelah penggantian sebelumnya berhasil tetapi jawabannya hilang
            $sudah = Petani::where('petani_id', $idBaru)->first();
            if ($sudah) {
                return response()->json(['status' => 'success', 'message' => 'ID kartu sudah diganti', 'data' => $sudah]);
            }
            return response()->json(['status' => 'error', 'message' => "Petani {$id} tidak ditemukan"], 404);
        }
        if ($idBaru === $id) {
            return response()->json(['status' => 'success', 'message' => 'ID kartu tidak berubah', 'data' => $lama]);
        }
        if (Petani::where('petani_id', $idBaru)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => "ID kartu {$idBaru} sudah dipakai petani lain",
            ], 422);
        }

        $baru = DB::transaction(function () use ($lama, $idBaru, $id) {
            // Kunci asing tidak ON UPDATE CASCADE: buat baris baru, pindahkan rujukan, lalu hapus baris lama
            $data = $lama->only($lama->getFillable());
            $data['petani_id'] = $idBaru;
            $baru = Petani::create($data);
            DB::table('transaksi_pembelian')->where('petani_id', $id)->update(['petani_id' => $idBaru]);
            DB::table('barang')->where('petani_id', $id)->update(['petani_id' => $idBaru]);
            $lama->delete();
            CatatanHapus::catat('petani', $id, ['petani_id_baru' => $idBaru, 'nama_petani' => $lama->nama_petani]);
            return $baru;
        });

        return response()->json([
            'status' => 'success',
            'message' => "ID kartu petani diganti menjadi {$idBaru}",
            'data' => $baru->fresh(),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $petani = Petani::where('petani_id', $id)->firstOrFail();
        $petani->status_aktif = false;
        $petani->alasan_nonaktif = $request->input('alasan_nonaktif', 'Dinonaktifkan oleh pengguna');
        $petani->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Petani berhasil dinonaktifkan',
            'data' => $petani
        ]);
    }
}

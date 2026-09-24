<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GradeMaster;
use App\Models\TabelHarga;
use App\Models\MasterHargaJual;
use App\Models\Gudang;
use App\Models\Role;
use App\Models\Module;
use App\Services\SequenceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MasterDataController extends Controller
{
    public function grades()
    {
        $grades = GradeMaster::orderBy('kode_grade', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $grades]);
    }

    public function tabelHarga()
    {
        $harga = TabelHarga::with('grade')->orderBy('kode_grade', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $harga]);
    }

    public function storeHarga(Request $request)
    {
        $request->validate([
            'kode_grade' => 'required|string',
            'harga_per_kg' => 'required|numeric|min:0',
            'rate_potongan_per_bal' => 'nullable|numeric|min:0',
        ]);

        $kodeGrade = strtoupper(trim($request->kode_grade));

        // Pastikan kode_grade ada di tabel grade_master untuk memenuhi foreign key constraint
        GradeMaster::firstOrCreate(
            ['kode_grade' => $kodeGrade],
            [
                'nama_grade' => 'Grade ' . $kodeGrade,
                'warna_badge' => 'zinc',
            ]
        );

        $hargaId = $request->harga_id;
        $isExisting = $hargaId && TabelHarga::where('harga_id', $hargaId)->exists();
        // Bila baru atau membawa ID sementara (HRG- / timestamp milidetik HB-17...), teruskan nomor ID terakhir
        if (!$isExisting || str_starts_with((string)$hargaId, 'HRG-') || (str_starts_with((string)$hargaId, 'HB-') && strlen((string)$hargaId) > 10)) {
            $hargaId = SequenceService::generateHargaBeliId();
        }

        $status = $request->status ?? 'aktif';

        if ($status === 'aktif') {
            // Nonaktifkan harga aktif sebelumnya untuk grade ini
            TabelHarga::where('kode_grade', $kodeGrade)
                ->where('harga_id', '!=', $hargaId)
                ->where('status', 'aktif')
                ->update(['status' => 'nonaktif']);
        }

        $harga = TabelHarga::updateOrCreate(
            ['harga_id' => $hargaId],
            [
                'kode_grade' => $kodeGrade,
                'harga_per_kg' => $request->harga_per_kg,
                'rate_potongan_per_bal' => $request->rate_potongan_per_bal ?? 0,
                'berat_standar_kg' => $request->berat_standar_kg ?? null,
                'tanggal_berlaku' => $request->tanggal_berlaku ?? date('Y-m-d'),
                'status' => $status,
                'dibuat_oleh' => optional(auth('sanctum')->user())->user_id ?? $request->dibuat_oleh ?? null,
                'deskripsi' => $request->deskripsi ?? 'Update tarif harga grade',
            ]
        );

        $harga->load('grade');

        return response()->json([
            'status' => 'success',
            'message' => 'Tarif harga beli berhasil disimpan',
            'data' => $harga
        ], 201);
    }

    public function hargaJual()
    {
        $hargaJual = MasterHargaJual::orderBy('kode', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $hargaJual]);
    }

    public function storeHargaJual(Request $request)
    {
        $request->validate([
            'kode' => 'required|string',
            'harga_jual' => 'required|numeric|min:0',
        ]);

        $kode = strtoupper(trim($request->kode));
        $nilai = [
            'kode' => $kode,
            'harga_jual' => $request->harga_jual,
            'tanggal_berlaku' => $request->tanggal_berlaku ?? date('Y-m-d'),
            'status_aktif' => $request->has('status_aktif') ? filter_var($request->status_aktif, FILTER_VALIDATE_BOOLEAN) : true,
        ];

        $hj = DB::transaction(function () use ($request, $kode, $nilai) {
            $milikKode = MasterHargaJual::whereRaw('UPPER(kode) = ?', [$kode])->lockForUpdate()->first();
            $milikId = $request->harga_jual_id
                ? MasterHargaJual::where('harga_jual_id', $request->harga_jual_id)->lockForUpdate()->first()
                : null;

            // Kode sudah ada di server (mis. dibuat dari komputer lain dengan ID berbeda): perbarui baris itu
            if ($milikKode && (!$milikId || $milikId->harga_jual_id === $milikKode->harga_jual_id)) {
                $milikKode->update($nilai);
                return $milikKode;
            }
            if ($milikKode && $milikId) {
                throw ValidationException::withMessages([
                    'kode' => ["Kode harga jual {$kode} sudah dipakai harga jual lain"],
                ]);
            }

            if ($milikId) {
                $kodeLama = $milikId->kode;
                if ($kodeLama === $kode) {
                    $milikId->update($nilai);
                    return $milikId;
                }
                // Ganti kode: batch sample & Surat Jalan merujuk kode (bukan ID) tanpa ON UPDATE CASCADE.
                // Buat baris kode baru, pindahkan rujukan, hapus baris lama, lalu kembalikan ID aslinya.
                $idAsli = $milikId->harga_jual_id;
                $idSementara = 'HJT-' . substr(uniqid(), -8);
                MasterHargaJual::create(array_merge($nilai, ['harga_jual_id' => $idSementara]));
                DB::table('sample_batch_item')->where('kode_harga_jual', $kodeLama)->update(['kode_harga_jual' => $kode]);
                DB::table('pengiriman_barang_item')->where('kode_harga_jual', $kodeLama)->update(['kode_harga_jual' => $kode]);
                $milikId->delete();
                MasterHargaJual::where('harga_jual_id', $idSementara)->update(['harga_jual_id' => $idAsli]);
                return MasterHargaJual::where('harga_jual_id', $idAsli)->first();
            }

            $id = $request->harga_jual_id ?: ('HJ-' . substr(uniqid(), -8));
            return MasterHargaJual::create(array_merge($nilai, ['harga_jual_id' => $id]));
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Harga jual berhasil disimpan',
            'data' => $hj
        ], 201);
    }

    public function gudang()
    {
        $gudang = Gudang::orderBy('kode_gudang', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $gudang]);
    }

    public function roles()
    {
        $roles = Role::with(['capabilities', 'modules'])->get();
        return response()->json(['status' => 'success', 'data' => $roles]);
    }

    public function modules()
    {
        $modules = Module::orderBy('sort_order', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $modules]);
    }
}

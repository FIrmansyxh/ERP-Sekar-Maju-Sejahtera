<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use Illuminate\Http\Request;

class BarangController extends Controller
{
    public function index(Request $request)
    {
        $query = Barang::with(['item', 'petani', 'gudang', 'grade']);

        if ($request->has('status_stok')) {
            $query->where('status_stok', $request->status_stok);
        }

        if ($request->has('gudang_id')) {
            $query->where('gudang_id', $request->gudang_id);
        }

        if ($request->has('kode_grade')) {
            $query->where('kode_grade', $request->kode_grade);
        }

        $barang = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $barang
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $barang = Barang::where('barang_id', $id)->firstOrFail();

        $request->validate([
            'status_stok' => 'sometimes|required|in:di_gudang,siap_kirim,keluar,terkirim_sample',
            'lokasi_blok' => 'nullable|string|max:50',
            'gudang_id' => 'nullable|string|max:20',
            'catatan' => 'nullable|string',
        ]);

        if ($request->has('status_stok')) {
            $barang->status_stok = $request->status_stok;
        }
        if ($request->has('lokasi_blok')) {
            $barang->lokasi_blok = $request->lokasi_blok;
        }
        if ($request->has('gudang_id')) {
            $barang->gudang_id = $request->gudang_id;
        }
        if ($request->has('catatan')) {
            $barang->catatan = $request->catatan;
        }
        $barang->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Data barang/bal inventaris berhasil diperbarui',
            'data' => $barang
        ]);
    }
}

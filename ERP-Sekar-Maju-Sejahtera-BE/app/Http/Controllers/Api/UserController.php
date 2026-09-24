<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SequenceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama_lengkap', 'ILIKE', "%{$search}%")
                  ->orWhere('username', 'ILIKE', "%{$search}%")
                  ->orWhere('user_id', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%")
                  ->orWhere('no_hp', 'ILIKE', "%{$search}%")
                  ->orWhere('unit_penugasan', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->has('role') && $request->role != 'all') {
            $query->where('role_code', $request->role);
        }

        if ($request->has('status')) {
            $status = filter_var($request->status, FILTER_VALIDATE_BOOLEAN);
            $query->where('status_aktif', $status);
        }

        $users = $query->orderBy('user_id', 'asc')->get()->map(function($user) {
            $userArr = $user->toArray();
            $userArr['role'] = $user->role_code;
            return $userArr;
        });

        return response()->json([
            'status' => 'success',
            'data' => $users
        ]);
    }

    public function store(Request $request)
    {
        $roleCode = $request->input('role') ?? $request->input('role_code');
        $request->merge(['role_code' => $roleCode]);

        $request->validate([
            'username' => 'required|string|max:50|unique:users,username',
            'nama_lengkap' => 'required|string|max:120',
            'password' => 'required|string|min:6',
            'role_code' => 'required|string',
            'email' => 'nullable|email|max:120',
            'no_hp' => 'nullable|string|max:20',
            'unit_penugasan' => 'nullable|string|max:120',
        ]);

        $userId = $request->user_id;
        if (!$userId || User::where('user_id', $userId)->exists()) {
            $userId = SequenceService::generateUserId();
        }

        $user = User::create([
            'user_id' => $userId,
            'username' => trim($request->username),
            'password_hash' => Hash::make($request->password),
            'nama_lengkap' => trim($request->nama_lengkap),
            'role_code' => $roleCode,
            'email' => $request->email,
            'no_hp' => $request->no_hp,
            'unit_penugasan' => $request->unit_penugasan ?? 'Gudang Pusat Induk - Pamekasan',
            'status_aktif' => true,
            'dibuat_pada' => now(),
        ]);

        $userArr = $user->toArray();
        $userArr['role'] = $user->role_code;

        return response()->json([
            'status' => 'success',
            'message' => 'Pengguna berhasil didaftarkan ke sistem',
            'data' => $userArr
        ], 201);
    }

    public function show($id)
    {
        $user = User::where('user_id', $id)->firstOrFail();
        $userArr = $user->toArray();
        $userArr['role'] = $user->role_code;

        return response()->json([
            'status' => 'success',
            'data' => $userArr
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = User::where('user_id', $id)->firstOrFail();

        $roleCode = $request->input('role') ?? $request->input('role_code');
        if ($roleCode) {
            $request->merge(['role_code' => $roleCode]);
        }

        $request->validate([
            'username' => 'sometimes|required|string|max:50|unique:users,username,' . $id . ',user_id',
            'nama_lengkap' => 'sometimes|required|string|max:120',
            'role_code' => 'sometimes|required|string',
            'email' => 'nullable|email|max:120',
            'no_hp' => 'nullable|string|max:20',
            'unit_penugasan' => 'nullable|string|max:120',
            'status_aktif' => 'sometimes|boolean',
            'password' => 'nullable|string|min:6',
        ]);

        if ($request->has('username')) {
            $user->username = trim($request->username);
        }
        if ($request->has('nama_lengkap')) {
            $user->nama_lengkap = trim($request->nama_lengkap);
        }
        if ($roleCode) {
            $user->role_code = $roleCode;
        }
        if ($request->has('email')) {
            $user->email = $request->email;
        }
        if ($request->has('no_hp')) {
            $user->no_hp = $request->no_hp;
        }
        if ($request->has('unit_penugasan')) {
            $user->unit_penugasan = $request->unit_penugasan;
        }
        if ($request->has('status_aktif')) {
            $user->status_aktif = $request->status_aktif;
        }
        if ($request->filled('password')) {
            $user->password_hash = Hash::make($request->password);
        }

        $user->save();
        if (!$user->status_aktif) {
            $user->tokens()->delete();
        }

        $userArr = $user->toArray();
        $userArr['role'] = $user->role_code;

        return response()->json([
            'status' => 'success',
            'message' => 'Data pengguna berhasil diperbarui',
            'data' => $userArr
        ]);
    }

    public function toggleStatus(Request $request, $id)
    {
        $user = User::where('user_id', $id)->firstOrFail();

        if ($request->user() && $request->user()->user_id === $id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak dapat mengubah status akun yang sedang aktif digunakan.'
            ], 422);
        }

        if ($request->has('status_aktif')) {
            $user->status_aktif = filter_var($request->status_aktif, FILTER_VALIDATE_BOOLEAN);
        } else {
            $user->status_aktif = !$user->status_aktif;
        }

        $user->save();
        // Akun yang dinonaktifkan keluar dari semua komputer: token lamanya tidak bisa dipakai menyimpan data lagi
        if (!$user->status_aktif) {
            $user->tokens()->delete();
        }

        $userArr = $user->toArray();
        $userArr['role'] = $user->role_code;

        return response()->json([
            'status' => 'success',
            'message' => 'Status akun pengguna berhasil diperbarui',
            'data' => $userArr
        ]);
    }

    public function resetPassword(Request $request, $id)
    {
        $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $user = User::where('user_id', $id)->firstOrFail();
        $user->password_hash = Hash::make($request->password);
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Kata sandi pengguna berhasil direset'
        ]);
    }
}

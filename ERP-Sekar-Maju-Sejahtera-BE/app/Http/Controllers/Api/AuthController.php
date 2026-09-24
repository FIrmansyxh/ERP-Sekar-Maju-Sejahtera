<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::with(['role.capabilities', 'role.modules'])
            ->where('username', $request->username)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Username atau password tidak sesuai.'
            ], 401);
        }

        if (!$user->status_aktif) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akun pengguna ini nonaktif. Hubungi Super Admin.'
            ], 403);
        }

        $user->terakhir_login = now();
        $user->save();

        $token = $user->createToken('erp-auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil',
            'data' => [
                'token' => $token,
                'user' => [
                    'user_id' => $user->user_id,
                    'username' => $user->username,
                    'nama_lengkap' => $user->nama_lengkap,
                    'role' => $user->role_code,
                    'email' => $user->email,
                    'no_hp' => $user->no_hp,
                    'unit_penugasan' => $user->unit_penugasan,
                    'status_aktif' => $user->status_aktif,
                    'terakhir_login' => $user->terakhir_login,
                    'dibuat_pada' => $user->dibuat_pada,
                    'capabilities' => $user->role->capabilities ?? null,
                    'modules' => $user->role->modules->pluck('module_id') ?? [],
                ]
            ]
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['role.capabilities', 'role.modules']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'user_id' => $user->user_id,
                'username' => $user->username,
                'nama_lengkap' => $user->nama_lengkap,
                'role' => $user->role_code,
                'email' => $user->email,
                'no_hp' => $user->no_hp,
                'unit_penugasan' => $user->unit_penugasan,
                'status_aktif' => $user->status_aktif,
                'terakhir_login' => $user->terakhir_login,
                'dibuat_pada' => $user->dibuat_pada,
                'capabilities' => $user->role->capabilities ?? null,
                'modules' => $user->role->modules->pluck('module_id') ?? [],
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Berhasil logout'
        ]);
    }
}

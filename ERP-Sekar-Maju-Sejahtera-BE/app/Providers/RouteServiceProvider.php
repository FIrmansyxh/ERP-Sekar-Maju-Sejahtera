<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        // Dulu 60 permintaan/menit per IP: tabel users tidak punya kolom `id` dan guard bawaan bukan Sanctum,
        // jadi semua komputer gudang di balik satu IP kantor berbagi 60 permintaan/menit. Penyegaran data antar
        // perangkat (Timbangan, Pengiriman, Kasir) dan antrean simpanan cepat melampauinya lalu ditolak 429.
        // Sekarang dihitung per akun (token Sanctum) dengan batas yang wajar untuk beberapa layar sekaligus.
        RateLimiter::for('api', function (Request $request) {
            $akun = $request->user('sanctum');
            return $akun
                ? Limit::perMinute(1200)->by('akun:' . $akun->user_id)
                : Limit::perMinute(300)->by('ip:' . $request->ip());
        });

        // Login dibatasi terpisah per IP + username agar tebakan sandi tidak bisa dicoba berulang-ulang
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(10)->by('login:' . $request->ip() . '|' . mb_strtolower((string) $request->input('username')));
        });
    }
}

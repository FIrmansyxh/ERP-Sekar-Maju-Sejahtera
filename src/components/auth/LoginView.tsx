import React, { useState } from 'react';
import { 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  Monitor
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { authenticateUser, loadUserData } from '../../utils/storage';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  availableUsers?: User[];
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  availableUsers,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const usersList = availableUsers || loadUserData();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Masukkan username atau email Anda.');
      return;
    }
    if (!password.trim()) {
      setError('Masukkan kata sandi Anda.');
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const result = authenticateUser(username, password);
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message || 'Login gagal. Periksa kembali username dan password.');
      }
    }, 200);
  };

  const handleFastRoleLogin = (role: UserRole) => {
    setError(null);
    const targetUser = usersList.find((u) => u.role === role && u.status_aktif) || usersList.find((u) => u.role === role);
    if (!targetUser) {
      setError(`Tidak ditemukan akun untuk role ${role}.`);
      return;
    }

    setUsername(targetUser.username);
    setPassword(targetUser.password || 'admin123');
    setIsLoading(true);

    setTimeout(() => {
      const result = authenticateUser(targetUser.username, targetUser.password || 'admin123');
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message);
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-[#eaedf1] flex flex-col justify-between font-sans text-gray-800">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-xs bg-[#b81d24] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
            SMS
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-gray-900 tracking-tight">PR. SEKAR MAJU SEJAHTERA</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">Sistem Data Gudang Tembakau</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-xs text-[11px] text-gray-600">
          <Monitor className="w-3 h-3 text-gray-400" />
          <span>Desktop Standalone v2.4</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-[840px] bg-white rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.08)] border border-gray-200 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Panel (Red Brand Area) */}
          <div className="md:col-span-5 bg-[#a3151b] p-7 text-white flex flex-col justify-between relative bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px]">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-black/20 border border-white/20 rounded-xs text-[11px] font-medium text-white/95 mb-6">
                <Building2 className="w-3.5 h-3.5 text-white/80" />
                <span>Pusat Pergudangan Tembakau</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-black tracking-tight text-white mb-2">
                PR. SEKAR MAJU SEJAHTERA
              </h1>
              <p className="text-xs text-red-100/90 leading-relaxed mb-6 font-normal">
                Sistem Enterprise Resource Planning (ERP) Manajemen Data Petani, Stok Bal, Intake Timbangan, & Logistik.
              </p>

              {/* Feature Points */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center space-x-2 text-white/90">
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Otorisasi Berjenjang (RBAC 7 Roles)</span>
                </div>
                <div className="flex items-center space-x-2 text-white/90">
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Penyimpanan Aman & Terisolasi Offline</span>
                </div>
                <div className="flex items-center space-x-2 text-white/90">
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Audit Trail & Kupon Timbang Terintegrasi</span>
                </div>
              </div>
            </div>

            {/* Bottom Left Info */}
            <div className="pt-6 mt-6 border-t border-white/15 text-[10px] text-red-200/80 leading-relaxed font-sans">
              <div>Pamekasan, Madura - Jawa Timur</div>
              <div className="font-mono text-red-200/60 mt-0.5">Build: 2026-08-REV3</div>
            </div>
          </div>

          {/* Right Panel (Form Area) */}
          <div className="md:col-span-7 p-7 flex flex-col justify-between bg-white">
            <div>
              {/* Form Header */}
              <div className="mb-5">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Masuk ke Sistem Gudang
                </h2>
                
              </div>

              {/* Error Box */}
              {error && (
                <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xs text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-[#b81d24] shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{error}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
                {/* Username */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1 text-xs">
                    Username atau Email
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError(null);
                      }}
                      placeholder="misal: admin atau operator"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xs focus:outline-none focus:border-[#b81d24] text-xs text-gray-900"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1 text-xs">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Masukkan kata sandi..."
                      className="w-full pl-9 pr-10 py-2 bg-white border border-gray-300 rounded-xs focus:outline-none focus:border-[#b81d24] text-xs text-gray-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <label className="flex items-center space-x-1.5 text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded-xs border-gray-300 text-[#b81d24] focus:ring-[#b81d24]"
                    />
                    <span className="text-[11px] font-medium">Ingat Sesi di Komputer Ini</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Default pass: <span className="font-bold text-gray-700">admin123</span>
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#b81d24] hover:bg-[#a0181e] text-white font-bold text-xs rounded-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 mt-2 shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Sistem ERP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Role Tester (Neutral & Clean Monochrome Style) */}
              <div className="mt-5 pt-3.5 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                    <KeyRound className="w-3 h-3 text-[#b81d24]" />
                    <span>AKSES CEPAT PENGUJIAN ROLE (1-KLIK):</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">6 Role</span>
                </div>

                {/* 6 RBAC Roles Quick Login Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFastRoleLogin('superadmin')}
                    className="p-2 text-left bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xs transition cursor-pointer group shadow-2xs"
                  >
                    <div className="font-bold text-gray-800 text-[11px] group-hover:text-[#b81d24]">Super Admin</div>
                    <div className="text-[10px] text-gray-500 font-mono">@superadmin</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFastRoleLogin('admin_sortir')}
                    className="p-2 text-left bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xs transition cursor-pointer group shadow-2xs"
                  >
                    <div className="font-bold text-gray-800 text-[11px] group-hover:text-[#b81d24]">Admin Sortir</div>
                    <div className="text-[10px] text-gray-500 font-mono">@adminsortir</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFastRoleLogin('admin_timbang')}
                    className="p-2 text-left bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xs transition cursor-pointer group shadow-2xs"
                  >
                    <div className="font-bold text-gray-800 text-[11px] group-hover:text-[#b81d24]">Admin Timbang</div>
                    <div className="text-[10px] text-gray-500 font-mono">@admintimbang</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFastRoleLogin('admin_kasir')}
                    className="p-2 text-left bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xs transition cursor-pointer group shadow-2xs"
                  >
                    <div className="font-bold text-gray-800 text-[11px] group-hover:text-[#b81d24]">Admin Kasir</div>
                    <div className="text-[10px] text-gray-500 font-mono">@adminkasir</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFastRoleLogin('admin_pengiriman')}
                    className="p-2 text-left bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xs transition cursor-pointer group shadow-2xs"
                  >
                    <div className="font-bold text-gray-800 text-[11px] group-hover:text-[#b81d24]">Admin Pengiriman</div>
                    <div className="text-[10px] text-gray-500 font-mono">@adminpengiriman</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFastRoleLogin('kepala_gudang')}
                    className="p-2 text-left bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xs transition cursor-pointer group shadow-2xs"
                  >
                    <div className="font-bold text-gray-800 text-[11px] group-hover:text-[#b81d24]">Kepala Gudang</div>
                    <div className="text-[10px] text-gray-500 font-mono">@kepalagudang</div>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="py-2.5 px-6 text-center text-[11px] text-gray-500">
        Hak Cipta © 2026 PR. SEKAR MAJU SEJAHTERA Pamekasan. Seluruh hak cipta dilindungi undang-undang.
      </footer>

    </div>
  );
};

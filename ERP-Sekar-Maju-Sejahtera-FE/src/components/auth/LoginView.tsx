import React, { useState } from 'react';
import { Lock, User as UserIcon, Eye, EyeOff, ArrowRight, AlertCircle, Monitor, Check } from 'lucide-react';
import { User } from '../../types';
import { ErpApiService } from '../../services/erpApi';
import { APP_BUILD, APP_EDITION, APP_VERSION } from '../../config/appInfo';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

    const result = await ErpApiService.login(username, password);
    setIsLoading(false);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setError(result.message || 'Login gagal. Periksa kembali username dan password.');
    }
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
            <span className="font-bold text-gray-900 tracking-tight">PT. SEKAR MAJU SEJAHTERA</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">Sistem Data Gudang Tembakau</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-xs text-[11px] text-gray-600">
          <Monitor className="w-3 h-3 text-gray-400" />
          <span>{APP_EDITION} v{APP_VERSION}</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-[840px] bg-white rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.08)] border border-gray-200 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Panel (Red Brand Area) */}
          <div className="md:col-span-5 bg-[#b81d24] p-7 text-white flex flex-col justify-between relative bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px]">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-3 leading-tight">
                PT. SEKAR MAJU SEJAHTERA
              </h1>
              <p className="text-sm text-red-100/90 font-medium">Sistem Data Gudang Tembakau</p>
            </div>

            <ul className="space-y-2.5 text-xs text-red-50/90 font-medium">
              {['Sortir, Timbang, Kasir, dan Pengiriman dalam satu alur', 'Data petani, harga, dan bal tembakau', 'Laporan dan analitik real-time'].map((poin) => (
                <li key={poin} className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-red-200 shrink-0 mt-0.5" />
                  <span>{poin}</span>
                </li>
              ))}
            </ul>

            <div className="pt-6 mt-8 border-t border-white/15 text-[11px] text-red-200/90 leading-relaxed font-sans">
              <div>Pamekasan, Madura - Jawa Timur</div>
              <div className="font-mono text-red-200/70 mt-1">Build {APP_BUILD}</div>
            </div>
          </div>

          {/* Right Panel (Form Area) */}
          <div className="md:col-span-7 p-7 flex flex-col justify-between bg-white">
            <div>
              {/* Form Header */}
              <div className="mb-5">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Masuk</h2>
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
                      placeholder="Username"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xs focus:outline-none focus:border-[#b81d24] text-xs text-gray-900"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1 text-xs">
                    Kata Sandi
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
                      placeholder="Kata sandi"
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
                      <span>Masuk</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

            </div>
          </div>

        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="py-2.5 px-6 text-center text-[11px] text-gray-500">
        © 2026 PT. SEKAR MAJU SEJAHTERA
      </footer>

    </div>
  );
};

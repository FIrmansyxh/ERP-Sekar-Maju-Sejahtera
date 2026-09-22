import React, { useState } from 'react';
import { X, KeyRound, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { User } from '../../types';

interface UserResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirmReset: (userId: string, newPassword: string) => void;
}

export const UserResetPasswordModal: React.FC<UserResetPasswordModalProps> = ({
  isOpen,
  onClose,
  user,
  onConfirmReset,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleQuickDefault = () => {
    const defaultPass = `${user.username}123`;
    setNewPassword(defaultPass);
    setConfirmPassword(defaultPass);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setError('Kata sandi baru tidak boleh kosong.');
      return;
    }
    if (newPassword.length < 5) {
      setError('Kata sandi minimal 5 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    onConfirmReset(user.user_id, newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-[#b81d24]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                Reset Kata Sandi
              </h2>
              <p className="text-[11px] text-gray-500 font-medium truncate">
                Akun: <span className="font-semibold text-gray-800">{user.nama_lengkap}</span> ({user.username})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-sm transition cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-gray-800">
          
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm space-y-1.5">
            <div className="flex justify-between items-center text-[11px] text-gray-600">
              <span>Rekomendasi Default Password:</span>
              <button
                type="button"
                onClick={handleQuickDefault}
                className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-[#b81d24] border border-red-200 font-bold rounded-xs cursor-pointer transition"
              >
                Gunakan "{user.username}123"
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Kata Sandi Baru <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Kata sandi baru"
                className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-sm focus:ring-1 focus:ring-[#b81d24] focus:border-[#b81d24] text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Konfirmasi Kata Sandi Baru <span className="text-red-500">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              placeholder="Ulangi kata sandi baru"
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-[#b81d24] focus:border-[#b81d24] text-xs"
              required
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-gray-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-sm transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#b81d24] hover:bg-[#a0181e] text-white font-bold rounded-sm shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Simpan Kata Sandi</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, Shield, Building2, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { User, UserRole, Gudang } from '../../types';
import { ALL_ROLES, ROLE_DEFINITIONS } from '../../utils/rbac';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  editingUser?: User | null;
  existingUsers: User[];
  gudangList: Gudang[];
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingUser,
  existingUsers,
  gudangList,
}) => {
  const isEdit = Boolean(editingUser);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [namaLengkap, setNamaLengkap] = useState('');
  const [role, setRole] = useState<UserRole>('admin_sortir');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [unitPenugasan, setUnitPenugasan] = useState('');
  const [statusAktif, setStatusAktif] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingUser) {
      setUsername(editingUser.username);
      setPassword('');
      setNamaLengkap(editingUser.nama_lengkap);
      setRole(editingUser.role);
      setEmail(editingUser.email || '');
      setNoHp(editingUser.no_hp || '');
      setUnitPenugasan(editingUser.unit_penugasan || '');
      setStatusAktif(editingUser.status_aktif);
      setError(null);
    } else {
      // Auto-generate next user ID
      const nextNum = existingUsers.length + 1;
      setUsername(`staf_${nextNum}`);
      setPassword('password123');
      setNamaLengkap('');
      setRole('admin_sortir');
      setEmail('');
      setNoHp('');
      setUnitPenugasan(gudangList.length > 0 ? gudangList[0].nama_gudang : 'Gudang Utama A - Wringin Anom');
      setStatusAktif(true);
      setError(null);
    }
  }, [editingUser, isOpen, existingUsers, gudangList]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Username wajib diisi.');
      return;
    }
    if (!namaLengkap.trim()) {
      setError('Nama lengkap pengguna wajib diisi.');
      return;
    }

    // Check username uniqueness
    const duplicate = existingUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.user_id !== editingUser?.user_id
    );
    if (duplicate) {
      setError(`Username "${cleanUsername}" sudah digunakan oleh pengguna lain.`);
      return;
    }

    if (!isEdit && !password.trim()) {
      setError('Kata sandi awal wajib diisi untuk pengguna baru.');
      return;
    }

    const userData: User = {
      user_id: editingUser ? editingUser.user_id : `USR-${String(Date.now()).slice(-6)}`,
      username: cleanUsername,
      password: password.trim() ? password.trim() : (editingUser?.password || 'admin123'),
      nama_lengkap: namaLengkap.trim(),
      role,
      email: email.trim() || undefined,
      no_hp: noHp.trim() || undefined,
      unit_penugasan: unitPenugasan.trim() || 'Gudang Utama A - Wringin Anom',
      status_aktif: statusAktif,
      dibuat_pada: editingUser?.dibuat_pada || new Date().toISOString(),
      terakhir_login: editingUser?.terakhir_login,
    };

    onSave(userData);
    onClose();
  };

  const selectedRoleInfo = ROLE_DEFINITIONS[role];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-md shadow-2xl border border-gray-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-[#b81d24] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-white/20 rounded-sm">
              {isEdit ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isEdit ? 'Perbarui Data Pengguna' : 'Tambah Pengguna Baru (RBAC)'}
              </h2>
              <p className="text-xs text-red-100">
                {isEdit ? `ID: ${editingUser?.user_id}` : 'Registrasi akun staf & wewenang operasional'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-sm transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs text-gray-800 flex-1">
          
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Username */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Username Login <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="misal: sitirahayu"
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 text-xs font-mono lowercase"
                required
              />
              <p className="text-[10px] text-gray-500 mt-0.5">Digunakan untuk login (huruf kecil tanpa spasi)</p>
            </div>

            {/* Password */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {isEdit ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi Awal *'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 5 karakter'}
                  className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 text-xs"
                  required={!isEdit}
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

            {/* Nama Lengkap */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Nama Lengkap & Gelar <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={namaLengkap}
                onChange={(e) => {
                  setNamaLengkap(e.target.value);
                  setError(null);
                }}
                placeholder="misal: Siti Rahayu, S.E."
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 text-xs"
                required
              />
            </div>

            {/* Role RBAC Selector */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Role & Hak Akses (RBAC) <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 text-xs bg-white font-semibold text-gray-900"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_DEFINITIONS[r].label}
                  </option>
                ))}
              </select>

              {/* Role description preview box */}
              {selectedRoleInfo && (
                <div className={`mt-2 p-2.5 border rounded-sm text-[11px] ${selectedRoleInfo.badgeBg} ${selectedRoleInfo.badgeBorder}`}>
                  <div className="flex items-center space-x-1.5 font-bold mb-1 text-[#b81d24]">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Cakupan Wewenang: {selectedRoleInfo.label}</span>
                  </div>
                  <p className="text-gray-700 leading-normal">
                    {selectedRoleInfo.deskripsi}
                  </p>
                </div>
              )}
            </div>

            {/* Unit Penugasan / Gudang */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Unit Fasilitas / Penugasan Gudang <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  list="gudang-options"
                  value={unitPenugasan}
                  onChange={(e) => setUnitPenugasan(e.target.value)}
                  placeholder="Pilih atau ketik unit gudang/posisi..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 text-xs"
                  required
                />
                <datalist id="gudang-options">
                  <option value="Pusat Manajemen Pamekasan (Semua Unit)" />
                  {gudangList.map((g) => (
                    <option key={g.gudang_id} value={g.nama_gudang} />
                  ))}
                  <option value="Laboratorium Uji Mutu & QC Temanggung" />
                  <option value="Armada & Distribusi Pabrik Sekar Maju Sejahtera" />
                </datalist>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Alamat Email (Opsional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@sekarmajusejahtera.co.id"
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 text-xs"
              />
            </div>

            {/* No HP */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Nomor WhatsApp / HP (Opsional)
              </label>
              <input
                type="tel"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 text-xs"
              />
            </div>

            {/* Status Aktif Switch */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900 block">Status Keaktifan Akun</span>
                <span className="text-[11px] text-gray-500">Akun nonaktif tidak akan dapat login ke sistem.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusAktif}
                  onChange={(e) => setStatusAktif(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200 flex justify-end space-x-2">
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
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isEdit ? 'Simpan Perubahan' : 'Daftarkan Pengguna'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

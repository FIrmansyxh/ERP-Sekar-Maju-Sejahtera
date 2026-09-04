import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  KeyRound, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  X, 
  Ban, 
  CheckCircle,
  Plus
} from 'lucide-react';
import { User, UserRole, Gudang } from '../../types';
import { ALL_ROLES, ROLE_DEFINITIONS, getRoleInfo } from '../../utils/rbac';
import { formatDateTimeIndo } from '../../utils/formatters';
import { UserFormModal } from './UserFormModal';
import { UserResetPasswordModal } from './UserResetPasswordModal';
import { RoleMatrixModal } from './RoleMatrixModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { Pagination } from '../common/Pagination';

interface UserManagementProps {
  userList: User[];
  currentUser: User | null;
  gudangList: Gudang[];
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onToggleStatus: (userId: string) => void;
  onResetPassword: (userId: string, newPass: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  userList,
  currentUser,
  gudangList,
  onSaveUser,
  onDeleteUser,
  onToggleStatus,
  onResetPassword,
}) => {
  // Filter & Pagination states
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aktif' | 'nonaktif'>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  // Extract unique units for filter
  const uniqueUnits = useMemo(() => {
    const set = new Set<string>();
    userList.forEach((u) => {
      if (u.unit_penugasan) {
        set.add(u.unit_penugasan.trim());
      }
    });
    return Array.from(set);
  }, [userList]);

  // Filtered List
  const filteredUsers = useMemo(() => {
    return userList.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (statusFilter === 'aktif' && !user.status_aktif) return false;
      if (statusFilter === 'nonaktif' && user.status_aktif) return false;
      if (unitFilter !== 'all' && user.unit_penugasan !== unitFilter) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchName = user.nama_lengkap.toLowerCase().includes(q);
        const matchUsername = user.username.toLowerCase().includes(q);
        const matchId = user.user_id.toLowerCase().includes(q);
        const matchEmail = (user.email || '').toLowerCase().includes(q);
        const matchUnit = (user.unit_penugasan || '').toLowerCase().includes(q);
        const matchPhone = (user.no_hp || '').includes(q);
        return matchName || matchUsername || matchId || matchEmail || matchUnit || matchPhone;
      }
      return true;
    });
  }, [userList, searchQuery, roleFilter, statusFilter, unitFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const targetDeleteUser = userList.find((u) => u.user_id === deletingUserId);

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* 1. Collapsible Filter Section (matching Transaksi & Petani style) */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-gray-800 bg-white hover:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <span className="text-[#b81d24] font-black">▼</span>
            <span className="font-bold tracking-wide uppercase text-xs">Filter</span>
          </div>
          {isFilterOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isFilterOpen && (
          <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-gray-600 font-semibold mb-1">Role / Wewenang</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Role Pengguna</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_DEFINITIONS[r].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-600 font-semibold mb-1">Status Akun</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Status (Aktif & Nonaktif)</option>
                <option value="aktif">Aktif Saja</option>
                <option value="nonaktif">Nonaktif Saja</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-600 font-semibold mb-1">Unit Penugasan</label>
              <select
                value={unitFilter}
                onChange={(e) => {
                  setUnitFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              >
                <option value="all">Semua Unit Penugasan</option>
                {uniqueUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setUnitFilter('all');
                  setCurrentPage(1);
                }}
                className="px-3.5 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-sm transition cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Table Card (matching Transaksi & Petani style) */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        
        {/* Card Header matching Transaksi */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">
            Daftar Pengguna & Otorisasi RBAC
          </h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMatrixOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Buka tabel perbandingan hak akses semua role"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#b81d24]" />
              <span>Matriks Wewenang</span>
            </button>

            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
                setUnitFilter('all');
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#545b62] hover:bg-[#464c52] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>

            <button
              onClick={() => {
                setEditingUser(null);
                setIsFormOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pengguna</span>
            </button>
          </div>
        </div>

        {/* Table Controls (Tampil X Data Per Halaman & Pencarian) */}
        <div className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Tampil</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-sm px-2 py-1 bg-white text-xs text-gray-800 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-gray-600">Data Per Halaman</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-600 font-medium">Pencarian:</span>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-sm px-2.5 py-1 text-xs text-gray-800 w-48 sm:w-64 focus:outline-none focus:border-[#b81d24]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-gray-200 text-xs font-bold text-gray-700">
                <th className="py-2.5 px-3 text-center border-r border-gray-200 w-12">No</th>
                <th className="py-2.5 px-3 border-r border-gray-200">User ID</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Username</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Nama Lengkap</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Role & Wewenang</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Unit Penugasan</th>
                <th className="py-2.5 px-3 border-r border-gray-200">No. Telepon / HP</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Email</th>
                <th className="py-2.5 px-3 border-r border-gray-200 text-center">Status</th>
                <th className="py-2.5 px-3 border-r border-gray-200">Terakhir Login</th>
                <th className="py-2.5 px-3 text-center w-36">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 text-xs">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-500">
                    Tidak ada data pengguna yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => {
                  const itemNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  const roleInfo = getRoleInfo(user.role);
                  const isCurrent = currentUser?.user_id === user.user_id;

                  return (
                    <tr 
                      key={user.user_id}
                      className="hover:bg-[#f8f9fa] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-gray-600">
                        {itemNumber}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-medium text-gray-900">
                        {user.user_id}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-semibold text-gray-900">
                        @{user.username}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-medium text-gray-900">
                        {user.nama_lengkap}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 text-gray-800 font-medium">
                        {roleInfo.label}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 text-gray-700">
                        {user.unit_penugasan || '-'}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-gray-700 text-[11px]">
                        {user.no_hp || '-'}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 text-gray-700 text-[11px]">
                        {user.email || '-'}
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (isCurrent) {
                              alert('Anda tidak dapat menonaktifkan akun yang sedang aktif digunakan.');
                              return;
                            }
                            onToggleStatus(user.user_id);
                          }}
                          className={`cursor-pointer transition hover:underline ${
                            user.status_aktif
                              ? 'text-gray-900 font-semibold'
                              : 'text-gray-400'
                          }`}
                          title="Klik untuk mengubah status aktif/nonaktif"
                        >
                          {user.status_aktif ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 border-r border-gray-200 font-mono text-gray-600 text-[11px]">
                        {user.terakhir_login ? (
                          formatDateTimeIndo(user.terakhir_login)
                        ) : (
                          <span className="text-gray-400 italic">Belum pernah</span>
                        )}
                      </td>

                      {/* Action Buttons matching Transaksi */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Edit User (Dark Slate Circle) */}
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setIsFormOpen(true);
                            }}
                            className="w-6 h-6 rounded-full bg-[#545b62] hover:bg-[#464c52] text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                            title="Edit Data Pengguna"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password (Teal Circle) */}
                          <button
                            onClick={() => setResettingUser(user)}
                            className="w-6 h-6 rounded-full bg-[#17a2b8] hover:bg-[#138496] text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                            title="Reset Kata Sandi"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Status Toggle (Green/Red Circle) */}
                          <button
                            onClick={() => {
                              if (isCurrent) {
                                alert('Anda tidak dapat mengubah status akun yang sedang aktif digunakan.');
                                return;
                              }
                              onToggleStatus(user.user_id);
                            }}
                            disabled={isCurrent}
                            className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs ${
                              isCurrent 
                                ? 'bg-gray-300 cursor-not-allowed' 
                                : user.status_aktif 
                                  ? 'bg-[#c82333] hover:bg-[#bd2130]' 
                                  : 'bg-[#28a745] hover:bg-[#218838]'
                            }`}
                            title={isCurrent ? 'Akun Anda aktif' : user.status_aktif ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
                          >
                            {user.status_aktif ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          </button>

                          {/* Delete User (Red Circle) */}
                          <button
                            onClick={() => {
                              if (isCurrent) {
                                alert('Anda tidak dapat menghapus akun Anda sendiri saat sedang login.');
                                return;
                              }
                              setDeletingUserId(user.user_id);
                            }}
                            disabled={isCurrent}
                            className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs ${
                              isCurrent 
                                ? 'bg-gray-300 cursor-not-allowed' 
                                : 'bg-[#b81d24] hover:bg-[#96141a]'
                            }`}
                            title={isCurrent ? 'Tidak bisa menghapus akun sendiri' : 'Hapus Pengguna'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="p-3 bg-white border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
          />
        </div>

      </div>

      {/* Form Modal */}
      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
        }}
        onSave={onSaveUser}
        editingUser={editingUser}
        existingUsers={userList}
        gudangList={gudangList}
      />

      {/* Reset Password Modal */}
      <UserResetPasswordModal
        isOpen={Boolean(resettingUser)}
        onClose={() => setResettingUser(null)}
        user={resettingUser}
        onConfirmReset={onResetPassword}
      />

      {/* Role Matrix Modal */}
      <RoleMatrixModal
        isOpen={isMatrixOpen}
        onClose={() => setIsMatrixOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingUserId)}
        onClose={() => setDeletingUserId(null)}
        onConfirm={() => {
          if (deletingUserId) {
            onDeleteUser(deletingUserId);
            setDeletingUserId(null);
          }
        }}
        title="Hapus Akun Pengguna"
        message={`Apakah Anda yakin ingin menghapus akun pengguna "${targetDeleteUser?.nama_lengkap}" (@${targetDeleteUser?.username})? Tindakan ini bersifat permanen.`}
        confirmText="Hapus Pengguna"
        type="danger"
      />

    </div>
  );
};

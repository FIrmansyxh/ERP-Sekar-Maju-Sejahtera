import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  User as UserIcon,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Users,
  Building2,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { User, UserRole } from '../types';
import { getRoleInfo, canUserPerform } from '../utils/rbac';

interface HeaderProps {
  totalPetani: number;
  totalAktif: number;
  totalNonaktif: number;
  onResetData: () => void;
  onOpenRoadmap: () => void;
  pageTitle?: string;
  pageBreadcrumb?: string;
  onToggleSidebar?: () => void;
  onMouseEnterToggle?: () => void;
  onMouseLeaveToggle?: () => void;
  isSidebarHidden?: boolean;
  currentUser?: User | null;
  onLogout?: () => void;
  onOpenUsers?: () => void;
  onSwitchUser?: (user: User) => void;
  allUsers?: User[];
}

export const Header: React.FC<HeaderProps> = ({
  totalPetani,
  totalAktif,
  totalNonaktif,
  onResetData,
  onOpenRoadmap,
  pageTitle = 'Sistem Data Gudang',
  pageBreadcrumb = 'PR. SEKAR MAJU SEJAHTERA / Sistem Data Gudang',
  onToggleSidebar,
  onMouseEnterToggle,
  onMouseLeaveToggle,
  isSidebarHidden = false,
  currentUser,
  onLogout,
  onOpenUsers,
  onSwitchUser,
  allUsers = [],
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
        setIsSwitchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleInfo = currentUser ? getRoleInfo(currentUser.role) : null;
  const canManageUsers = currentUser ? canUserPerform(currentUser.role, 'canManageUsers') : false;

  return (
    <header className="bg-white border-b border-gray-200 text-gray-800 sticky top-0 z-30 select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          
          {/* Left: Hamburger / Sidebar Toggle & App Branding */}
          <div className="flex items-center space-x-2.5">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                onMouseEnter={onMouseEnterToggle}
                onMouseLeave={onMouseLeaveToggle}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 rounded-md transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gray-200"
                title={isSidebarHidden ? "Buka Menu (Sidebar)" : "Sembunyikan Menu (Sidebar)"}
                aria-label={isSidebarHidden ? "Buka Menu Navigasi" : "Sembunyikan Menu Navigasi"}
              >
                {isSidebarHidden ? (
                  <PanelLeftOpen className="w-5 h-5 text-gray-600" />
                ) : (
                  <PanelLeftClose className="w-5 h-5 text-gray-600" />
                )}
              </button>
            )}

            <div className="flex items-center">
              <span className="font-bold text-base sm:text-lg tracking-tight text-gray-900">
                Sistem Data Gudang
              </span>
            </div>
          </div>

          {/* Right Tools & Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* User Profile & Role Dropdown (RBAC) */}
            {currentUser && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(!isProfileOpen);
                    setIsSwitchOpen(false);
                  }}
                  className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-100 border border-gray-200 rounded-sm text-xs cursor-pointer transition select-none"
                  title="Informasi Akun Staf & Hak Akses"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                    {currentUser.nama_lengkap.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>

                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="font-bold text-gray-900 text-xs truncate max-w-[130px]">
                      {currentUser.nama_lengkap}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {roleInfo?.label.split('(')[0].trim()}
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-sm shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                    
                    {/* User Info Header */}
                    <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                      <div className="font-bold text-gray-900">{currentUser.nama_lengkap}</div>
                      <div className="text-[11px] font-mono text-gray-500">@{currentUser.username}</div>
                      
                      {roleInfo && (
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-xs border text-[10px] font-bold ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                            <ShieldCheck className="w-3 h-3" />
                            <span>{roleInfo.label}</span>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-1 mt-1 text-[10px] text-gray-600">
                        <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{currentUser.unit_penugasan}</span>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="py-1">
                      {canManageUsers && onOpenUsers && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onOpenUsers();
                          }}
                          className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 flex items-center space-x-2 cursor-pointer font-medium"
                        >
                          <Users className="w-4 h-4 text-slate-700" />
                          <span>Kelola Pengguna (RBAC)</span>
                        </button>
                      )}

                      {/* Quick Switch User toggle */}
                      {onSwitchUser && allUsers.length > 1 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setIsSwitchOpen(!isSwitchOpen)}
                            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 flex items-center justify-between cursor-pointer font-medium"
                          >
                            <div className="flex items-center space-x-2">
                              <UserIcon className="w-4 h-4 text-slate-700" />
                              <span>Ganti Akun Cepat</span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSwitchOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isSwitchOpen && (
                            <div className="bg-slate-50 border-y border-slate-200 py-1 px-2 space-y-1 max-h-48 overflow-y-auto">
                              {allUsers.map((u) => {
                                const uRole = getRoleInfo(u.role);
                                const isCurrent = u.user_id === currentUser.user_id;
                                return (
                                  <button
                                    key={u.user_id}
                                    type="button"
                                    onClick={() => {
                                      setIsProfileOpen(false);
                                      setIsSwitchOpen(false);
                                      onSwitchUser(u);
                                    }}
                                    className={`w-full text-left p-1.5 rounded-xs flex items-center justify-between text-[11px] transition cursor-pointer ${
                                      isCurrent
                                        ? 'bg-slate-900 text-white font-medium'
                                        : 'text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    <div className="truncate">
                                      <div>{u.nama_lengkap}</div>
                                      <div className={`text-[10px] font-mono ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>@{u.username} • {uRole.label.split('(')[0]}</div>
                                    </div>
                                    {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Logout Option */}
                    {onLogout && (
                      <div className="pt-1 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 flex items-center space-x-2 cursor-pointer font-medium"
                        >
                          <LogOut className="w-4 h-4 text-slate-500" />
                          <span>Keluar (Logout)</span>
                        </button>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};

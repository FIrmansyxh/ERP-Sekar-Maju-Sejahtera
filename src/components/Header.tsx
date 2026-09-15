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
  allUsers = [],
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleInfo = currentUser ? getRoleInfo(currentUser.role) : null;
  const canManageUsers = currentUser ? canUserPerform(currentUser.role, 'canManageUsers') : false;

  return (
    <header className="bg-white border-b border-slate-200/80 text-slate-800 select-none z-30">
      <div className="w-full px-5 sm:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Sidebar Toggle & App Title / Breadcrumb */}
          <div className="flex items-center space-x-3.5 min-w-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                onMouseEnter={onMouseEnterToggle}
                onMouseLeave={onMouseLeaveToggle}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer flex items-center justify-center focus:outline-none shrink-0"
                title={isSidebarHidden ? "Buka Menu (Sidebar)" : "Sembunyikan Menu (Sidebar)"}
                aria-label={isSidebarHidden ? "Buka Menu Navigasi" : "Sembunyikan Menu Navigasi"}
              >
                {isSidebarHidden ? (
                  <PanelLeftOpen className="w-5 h-5 text-slate-600" />
                ) : (
                  <PanelLeftClose className="w-5 h-5 text-slate-600" />
                )}
              </button>
            )}

            <div className="flex items-center space-x-2.5 min-w-0">
              <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                PR. Sekar Maju Sejahtera
              </span>
              <span className="text-slate-300 hidden sm:inline-block font-light">/</span>
              <h1 className="font-semibold text-sm sm:text-base text-slate-900 tracking-tight truncate max-w-[220px] sm:max-w-[360px] md:max-w-[500px]" title={pageTitle}>
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Right Tools & User Account Controls */}
          <div className="flex items-center space-x-3">
            
            {/* User Profile & Role Dropdown (RBAC) */}
            {currentUser && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(!isProfileOpen);
                  }}
                  className="flex items-center space-x-2.5 py-1.5 px-2.5 hover:bg-slate-50 border border-slate-200 rounded-md text-xs cursor-pointer transition-colors select-none group"
                  title="Informasi Akun Staf & Hak Akses"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-[11px] shrink-0 group-hover:bg-slate-200 transition-colors">
                    {currentUser.nama_lengkap.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>

                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="font-semibold text-slate-800 text-xs truncate max-w-[140px]">
                      {currentUser.nama_lengkap}
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {roleInfo?.label.split('(')[0].trim()}
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-md shadow-lg shadow-slate-900/5 z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                    
                    {/* User Info Header */}
                    <div className="px-3.5 py-3 bg-slate-50/80 border-b border-slate-100">
                      <div className="font-semibold text-slate-900">{currentUser.nama_lengkap}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">@{currentUser.username}</div>
                      
                      {roleInfo && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                            <ShieldCheck className="w-3 h-3" />
                            <span>{roleInfo.label}</span>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-slate-600">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                          className="w-full text-left px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer font-medium transition-colors"
                        >
                          <Users className="w-4 h-4 text-slate-500" />
                          <span>Kelola Pengguna (RBAC)</span>
                        </button>
                      )}

                    </div>

                    {/* Logout Option */}
                    {onLogout && (
                      <div className="pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50/60 flex items-center space-x-2.5 cursor-pointer font-medium transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
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

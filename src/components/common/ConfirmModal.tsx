import React from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  isDanger?: boolean;
  onConfirm: () => void;
  onClose?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  detail,
  confirmText,
  cancelText,
  confirmLabel,
  cancelLabel,
  variant = 'warning',
  isDanger = false,
  onConfirm,
  onClose,
  onCancel,
  isLoading = false,
}) => {
  const resolvedConfirmText = confirmText || confirmLabel || 'Ya, Lanjutkan';
  const resolvedCancelText = cancelText || cancelLabel || 'Batal';
  const resolvedVariant = isDanger ? 'danger' : variant;

  const handleClose = () => {
    if (isLoading) return;
    if (onClose) onClose();
    if (onCancel) onCancel();
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (resolvedVariant) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-600" />,
          iconBg: 'bg-red-100 border border-red-200',
          btnClass: 'bg-red-600 hover:bg-red-700 text-white',
          badgeText: 'Tindakan Kritis / Hapus',
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-100 border border-amber-200',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          badgeText: 'Perubahan Status / Data',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-100 border border-emerald-200',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          badgeText: 'Aktivasi / Konfirmasi',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'primary':
      default:
        return {
          icon: <HelpCircle className="w-6 h-6 text-[#b81d24]" />,
          iconBg: 'bg-red-50 border border-red-100',
          btnClass: 'bg-[#b81d24] hover:bg-[#a0181e] text-white',
          badgeText: 'Simpan Perubahan',
          badgeClass: 'bg-red-50 text-[#b81d24] border-red-200',
        };
    }
  };

  const currentStyle = getVariantStyles();

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white border border-gray-300 w-full max-w-md rounded-none shadow-2xl flex flex-col text-xs text-gray-800 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${currentStyle.iconBg}`}>
              {currentStyle.icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight leading-tight">
                {title}
              </h3>
              <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-xs border mt-0.5 ${currentStyle.badgeClass}`}>
                {currentStyle.badgeText}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 p-1 transition cursor-pointer"
            title="Tutup / Batal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 bg-[#fcfcfc] space-y-3">
          <p className="text-xs text-gray-700 leading-relaxed font-medium">
            {message}
          </p>

          {detail && (
            <div className="p-2.5 bg-gray-100 border border-gray-200 rounded-none text-[11px] font-mono text-gray-800 space-y-1">
              <span className="font-sans font-bold text-gray-600 block text-[10px] uppercase">Rincian Data:</span>
              <p className="break-all">{detail}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {resolvedCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50 ${currentStyle.btnClass}`}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>{resolvedConfirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

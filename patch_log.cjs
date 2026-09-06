const fs = require('fs');
const file = 'src/components/log/LogAktivitasManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add onClearLogs to props
code = code.replace(
  'onRefreshLogs?: () => void;',
  'onRefreshLogs?: () => void;\n  onClearLogs?: () => void;'
);
code = code.replace(
  'onRefreshLogs,\n}) => {',
  'onRefreshLogs,\n  onClearLogs,\n}) => {'
);

// 2. Add state for clear confirm modal
code = code.replace(
  'const [selectedDetailLog, setSelectedDetailLog] = useState<LogAktivitas | null>(null);',
  'const [selectedDetailLog, setSelectedDetailLog] = useState<LogAktivitas | null>(null);\n  const [showClearConfirm, setShowClearConfirm] = useState(false);'
);

// 3. Add Hapus Semua Log button
const headerButtons = `          {onRefreshLogs && (
            <button
              onClick={onRefreshLogs}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xs text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
              title="Perbarui Data Log"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}`;
const clearButton = `          {isSuperAdmin && onClearLogs && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xs text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hapus Semua Log</span>
            </button>
          )}`;
code = code.replace(headerButtons, headerButtons + '\n' + clearButton);

// 4. Add Modal UI at the bottom
const detailModal = `{/* Modal Detail Log */}`;
const confirmModal = `      {/* Modal Konfirmasi Hapus Log */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-sm shadow-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center space-x-2 bg-rose-50">
              <ShieldAlert className="w-4 h-4 text-rose-700" />
              <h2 className="text-sm font-bold text-rose-900">Konfirmasi Hapus Log</h2>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-700 mb-2">
                Apakah Anda yakin ingin menghapus <strong>seluruh riwayat log aktivitas</strong>?
              </p>
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-xs border border-rose-200">
                Perhatian: Aksi ini tidak dapat dibatalkan. Menghapus log dapat mempengaruhi jejak audit sistem.
              </p>
            </div>
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xs text-xs font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (onClearLogs) onClearLogs();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xs text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}`;
code = code.replace(detailModal, confirmModal + '\n\n      ' + detailModal);

fs.writeFileSync(file, code);

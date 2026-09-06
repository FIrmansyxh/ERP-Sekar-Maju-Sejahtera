const fs = require('fs');
const file = 'src/components/petani/PetaniImportExportModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add state for export confirmation
const targetState = "const [successCount, setSuccessCount] = useState<number | null>(null);";
const newState = "const [successCount, setSuccessCount] = useState<number | null>(null);\n  const [showExportConfirm, setShowExportConfirm] = useState(false);";
code = code.replace(targetState, newState);

// 2. Wrap handleExportCSV inside the actual export button with confirmation check
const exportBtn = `<button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File CSV Master Petani</span>
                </button>`;

const newExportBtn = `<button
                  type="button"
                  onClick={() => setShowExportConfirm(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File CSV Master Petani</span>
                </button>`;
code = code.replace(exportBtn, newExportBtn);

// 3. Add the confirmation modal UI
const bodyClose = `      </div>
    </div>
  );
};`;
const confirmModalUi = `        {/* Modal Konfirmasi Ekspor */}
        {showExportConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-gray-300 w-full max-w-sm rounded-none shadow-xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center space-x-2 bg-yellow-50">
                <AlertTriangle className="w-4 h-4 text-yellow-700" />
                <h2 className="text-sm font-bold text-yellow-900 tracking-tight">Konfirmasi Ekspor Data</h2>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-700 leading-relaxed">
                  Apakah Anda yakin ingin mengekspor seluruh data master petani?
                </p>
                <p className="text-[11px] font-medium text-yellow-800 bg-yellow-100/50 p-2 border border-yellow-200">
                  Data yang diekspor berisi informasi yang mungkin bersifat sensitif (Nomor HP, Alamat, dll). Pastikan Anda menjaga kerahasiaan file unduhan.
                </p>
              </div>
              <div className="bg-[#f8f9fa] px-4 py-3 border-t border-gray-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExportConfirm(false)}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-sm text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportCSV();
                    setShowExportConfirm(false);
                  }}
                  className="px-3 py-1.5 bg-[#b81d24] hover:bg-[#a0181e] text-white rounded-sm text-xs font-bold transition cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ya, Ekspor Data</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};`;
code = code.replace(bodyClose, confirmModalUi);

// We need to make sure AlertTriangle is imported in PetaniImportExportModal.tsx
code = code.replace(
  `import { FileSpreadsheet, Download, Upload, ArrowLeft, Check } from 'lucide-react';`,
  `import { FileSpreadsheet, Download, Upload, ArrowLeft, Check, AlertTriangle } from 'lucide-react';`
);

fs.writeFileSync(file, code);

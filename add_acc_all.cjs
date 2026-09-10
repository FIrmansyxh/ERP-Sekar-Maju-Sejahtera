const fs = require('fs');
let file = 'src/components/pengiriman/StatusBatchPengirimanManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add state
const statePattern = /const \[scanSortirInput, setScanSortirInput\] = useState\(''\);/;
code = code.replace(statePattern, `const [scanSortirInput, setScanSortirInput] = useState('');
  const [isAccAllConfirmOpen, setIsAccAllConfirmOpen] = useState(false);`);

// Add handleAccAll function
const handleSaveSortirChangesPattern = /const handleSaveSortirChanges = \(\) => \{/;
const handleAccAllCode = `
  const handleAccAllItems = () => {
    setDraftBatchItems(prev => prev.map(item => ({
      ...item,
      status_item: 'disetujui',
      alasan_tolak: '',
      catatan_nego: ''
    })));
    setScanSortirFeedback({
      type: 'success',
      message: 'Semua bal dalam batch ini telah di-ACC. Silakan simpan hasil sortir.'
    });
    setHasUnsavedSortir(true);
    setIsAccAllConfirmOpen(false);
  };

  const handleSaveSortirChanges = () => {`;
code = code.replace(handleSaveSortirChangesPattern, handleAccAllCode);

// Add ACC Semua button
const saveButtonPattern = /\{hasUnsavedSortir && \(\s*<button\s*type="button"\s*onClick=\{handleSaveSortirChanges\}\s*className="px-4 py-1\.5 bg-\[\#b81d24\] hover:bg-\[\#991b1b\] text-white text-xs font-bold rounded-xs flex items-center space-x-1\.5 shadow-xs transition cursor-pointer animate-pulse"\s*>\s*<Save className="w-3\.5 h-3\.5" \/>\s*<span>Simpan Hasil Sortir Buyer<\/span>\s*<\/button>\s*\)\}/;

const accAllAndSaveButtons = `
                {draftBatchItems.length > 0 && draftBatchItems.some(i => i.status_item !== 'disetujui') && (
                  <button
                    type="button"
                    onClick={() => setIsAccAllConfirmOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ACC Semua</span>
                  </button>
                )}
                {hasUnsavedSortir && (
                  <button
                    type="button"
                    onClick={handleSaveSortirChanges}
                    className="px-4 py-1.5 bg-[#b81d24] hover:bg-[#991b1b] text-white text-xs font-bold rounded-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer animate-pulse"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Hasil Sortir Buyer</span>
                  </button>
                )}`;

code = code.replace(saveButtonPattern, accAllAndSaveButtons);

// Add the ConfirmModal to the bottom of the component
const modalPattern = /<ConfirmModal\s*isOpen=\{isTolakModalOpen\}\s*title="Tolak Bal Sample"\s*message=\{`Anda yakin ingin MENOLAK bal #\$\{itemToTolak\?\.no_bal\}\?`\}\s*confirmLabel="Ya, Tolak Bal"\s*cancelLabel="Batal"\s*onConfirm=\{handleConfirmTolak\}\s*onClose=\{\(\) => setIsTolakModalOpen\(false\)\}\s*type="danger"\s*\/>/;

const accAllModalCode = `<ConfirmModal
        isOpen={isTolakModalOpen}
        title="Tolak Bal Sample"
        message={\`Anda yakin ingin MENOLAK bal #\${itemToTolak?.no_bal}?\`}
        confirmLabel="Ya, Tolak Bal"
        cancelLabel="Batal"
        onConfirm={handleConfirmTolak}
        onClose={() => setIsTolakModalOpen(false)}
        type="danger"
      />
      <ConfirmModal
        isOpen={isAccAllConfirmOpen}
        title="ACC Semua Bal"
        message="Anda yakin ingin MENYETUJUI (ACC) semua bal yang ada di batch ini sekaligus? Semua bal akan diubah statusnya menjadi 'Diterima / ACC'."
        confirmLabel="Ya, ACC Semua"
        cancelLabel="Batal"
        onConfirm={handleAccAllItems}
        onClose={() => setIsAccAllConfirmOpen(false)}
        type="success"
      />`;

code = code.replace(modalPattern, accAllModalCode);

fs.writeFileSync(file, code);
console.log('Added ACC Semua button and logic');

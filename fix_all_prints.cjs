const fs = require('fs');

function fixPrintModal(file) {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');

    // Modals wrapper
    code = code.replace(
        /className="fixed inset-0 z-50 bg-black\/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150"/,
        'className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150 print:bg-white print:backdrop-blur-none print:p-0 print:block print:overflow-visible print:relative print:inset-auto"'
    );
    code = code.replace(
        /className="fixed inset-0 z-50 bg-slate-900\/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150"/,
        'className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150 print:bg-white print:backdrop-blur-none print:p-0 print:block print:overflow-visible print:relative print:inset-auto"'
    );

    // Inner containers
    code = code.replace(
        /className="bg-white w-full max-w-4xl rounded-sm shadow-2xl flex flex-col max-h-\[92vh\] text-xs text-gray-800 relative"/g,
        'className="bg-white w-full max-w-4xl rounded-sm shadow-2xl flex flex-col max-h-[92vh] text-xs text-gray-800 relative print:max-h-none print:border-none print:shadow-none print:w-full print:max-w-full print:block print:overflow-visible"'
    );
    code = code.replace(
        /className="bg-white w-full max-w-3xl rounded-sm shadow-2xl flex flex-col max-h-\[92vh\] text-xs text-gray-800 relative"/g,
        'className="bg-white w-full max-w-3xl rounded-sm shadow-2xl flex flex-col max-h-[92vh] text-xs text-gray-800 relative print:max-h-none print:border-none print:shadow-none print:w-full print:max-w-full print:block print:overflow-visible"'
    );
    code = code.replace(
        /className="bg-white w-full max-w-xl rounded-sm shadow-2xl flex flex-col max-h-\[92vh\] text-xs text-slate-800 relative"/g,
        'className="bg-white w-full max-w-xl rounded-sm shadow-2xl flex flex-col max-h-[92vh] text-xs text-slate-800 relative print:max-h-none print:border-none print:shadow-none print:w-full print:max-w-full print:block print:overflow-visible"'
    );

    // Headers
    code = code.replace(
        /className="px-5 py-3\.5 border-b border-gray-200 bg-gray-900 text-white flex items-center justify-between shrink-0"/g,
        'className="px-5 py-3.5 border-b border-gray-200 bg-gray-900 text-white flex items-center justify-between shrink-0 print:hidden"'
    );
    code = code.replace(
        /className="px-5 py-3\.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0"/g,
        'className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden"'
    );
    
    // Print container
    code = code.replace(
        /className="p-8 overflow-y-auto"/g,
        'className="p-8 overflow-y-auto print:overflow-visible print:p-0"'
    );
    code = code.replace(
        /className="p-5 sm:p-8 overflow-y-auto bg-slate-100 flex items-center justify-center"/g,
        'className="p-5 sm:p-8 overflow-y-auto bg-slate-100 flex items-center justify-center print:overflow-visible print:p-0 print:bg-white"'
    );

    fs.writeFileSync(file, code);
    console.log('Fixed ' + file);
}

fixPrintModal('src/components/transaksi/TransaksiDetailModal.tsx');
fixPrintModal('src/components/petani/PetaniCardPrintModal.tsx');
fixPrintModal('src/components/produksi/BonProduksiPrintModal.tsx');


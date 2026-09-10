const fs = require('fs');

function fixPrintModal(file) {
    let code = fs.readFileSync(file, 'utf8');

    // 1. Modal wrapper: hide backdrop on print, and let it take up full page.
    code = code.replace(
        /className="fixed inset-0 z-50 bg-black\/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150"/,
        'className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150 print:bg-white print:backdrop-blur-none print:p-0 print:block print:overflow-visible print:relative print:inset-auto"'
    );
    // If different variant:
    code = code.replace(
        /className="fixed inset-0 z-50 bg-slate-900\/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150"/,
        'className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150 print:bg-white print:backdrop-blur-none print:p-0 print:block print:overflow-visible print:relative print:inset-auto"'
    );

    // 2. Inner container: remove max heights, borders, shadows for print
    code = code.replace(
        /className="bg-white border border-gray-300 w-full max-w-4xl rounded-none shadow-2xl flex flex-col max-h-\[92vh\] text-xs text-gray-800"/,
        'className="bg-white border border-gray-300 w-full max-w-4xl rounded-none shadow-2xl flex flex-col max-h-[92vh] text-xs text-gray-800 print:max-h-none print:border-none print:shadow-none print:w-full print:max-w-full print:block print:overflow-visible"'
    );
    // SuratJalanPrintModal inner container:
    code = code.replace(
        /className="bg-white border border-slate-300 w-full max-w-4xl rounded-sm shadow-2xl flex flex-col max-h-\[92vh\] text-xs text-slate-800 relative"/,
        'className="bg-white border border-slate-300 w-full max-w-4xl rounded-sm shadow-2xl flex flex-col max-h-[92vh] text-xs text-slate-800 relative print:max-h-none print:border-none print:shadow-none print:w-full print:max-w-full print:block print:overflow-visible"'
    );

    // 3. Header bar: hide completely on print
    code = code.replace(
        /className="px-5 py-3\.5 border-b border-gray-200 bg-gray-900 text-white flex items-center justify-between shrink-0"/,
        'className="px-5 py-3.5 border-b border-gray-200 bg-gray-900 text-white flex items-center justify-between shrink-0 print:hidden"'
    );
    code = code.replace(
        /className="px-5 py-3\.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0"/,
        'className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden"'
    );
    
    // 4. Also hide printRef scroll inside print area
    code = code.replace(
        /className="p-8 overflow-y-auto"/,
        'className="p-8 overflow-y-auto print:overflow-visible print:p-0"'
    );

    fs.writeFileSync(file, code);
    console.log('Fixed ' + file);
}

fixPrintModal('src/components/sample/BatchSamplePrintModal.tsx');
fixPrintModal('src/components/pengiriman/SuratJalanPrintModal.tsx');


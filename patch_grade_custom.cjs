const fs = require('fs');

function addAllowCustom(file) {
  let code = fs.readFileSync(file, 'utf8');
  // Match SearchableSelects that have "Grade" in their placeholder or options
  // Just blind replace to add allowCustom={true} where placeholder="Grade..." or similar
  
  // This is a bit tricky with regex, let's just do it directly.
  
  if (file.includes('MasterBarangFormModal.tsx')) {
    code = code.replace(/<SearchableSelect\s+value=\{kodeGrade\}/g, `<SearchableSelect allowCustom={true} value={kodeGrade}`);
  }
  if (file.includes('TransaksiFormModal.tsx')) {
    code = code.replace(/<SearchableSelect\s+value=\{item.kodeGrade\}/g, `<SearchableSelect allowCustom={true} value={item.kodeGrade}`);
  }
  if (file.includes('TransaksiEditModal.tsx')) {
    code = code.replace(/<SearchableSelect\s+value=\{row.kode_grade\}/g, `<SearchableSelect allowCustom={true} value={row.kode_grade}`);
  }
  if (file.includes('BarangManagement.tsx') || file.includes('MasterBarangManagement.tsx')) {
    // Actually for filters we might NOT want allowCustom? Or maybe we do. We can leave filters as standard select or allow custom search.
  }
  
  fs.writeFileSync(file, code);
}

addAllowCustom('src/components/barang/MasterBarangFormModal.tsx');
addAllowCustom('src/components/transaksi/TransaksiFormModal.tsx');
addAllowCustom('src/components/transaksi/TransaksiEditModal.tsx');

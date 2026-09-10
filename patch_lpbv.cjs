const fs = require('fs');
const file = 'src/components/laporan/LaporanPembelianBarangView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Search logic
code = code.replace(
  "if (!item.no_bal?.toLowerCase().includes(query)) return false;",
  "const hasItemMatch = (item.items || []).some(i => i.no_bal?.toLowerCase().includes(query) || i.barcode?.toLowerCase().includes(query) || i.sample_label_code?.toLowerCase().includes(query));\n        if (!item.no_bal?.toLowerCase().includes(query) && !hasItemMatch) return false;"
);

// 2. CSV Rendering
code = code.replace(
  "row.no_bal || '-', // Index 4 in rows push",
  "(row.items && row.items.length > 0) ? row.items.map(it => it.no_bal || it.barcode || it.sample_label_code).filter(Boolean).join(', ') : (row.no_bal || '-'),"
);

// wait, the CSV export row push is:
// row.nama_petani || '-',
// row.no_bal || '-',
// gradeStr,
// Let's replace specifically this part:
code = code.replace(
  "row.nama_petani || '-',\n        row.no_bal || '-',",
  "row.nama_petani || '-',\n        (row.items && row.items.length > 0) ? row.items.map(it => it.no_bal || it.barcode || it.sample_label_code).filter(Boolean).join(', ') : (row.no_bal || '-'),"
);

// 3. Table rendering (around line 1252)
code = code.replace(
  "<div className=\"break-words whitespace-normal leading-tight\">{row.no_bal}</div>",
  "<div className=\"break-words whitespace-normal leading-tight\">{(row.items && row.items.length > 0) ? row.items.map(it => it.no_bal || it.barcode || it.sample_label_code).filter(Boolean).join(', ') : (row.no_bal || '-')}</div>"
);

// 4. Print rendering (around line 1477)
code = code.replace(
  "<td className=\"p-1 border border-gray-300 text-center font-mono max-w-[150px] break-words whitespace-normal\">{row.no_bal}</td>",
  "<td className=\"p-1 border border-gray-300 text-center font-mono max-w-[150px] break-words whitespace-normal\">{(row.items && row.items.length > 0) ? row.items.map(it => it.no_bal || it.barcode || it.sample_label_code).filter(Boolean).join(', ') : (row.no_bal || '-')}</td>"
);

fs.writeFileSync(file, code);

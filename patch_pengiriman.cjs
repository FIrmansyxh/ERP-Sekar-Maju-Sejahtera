const fs = require('fs');
let file = 'src/components/pengiriman/PengirimanManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import { SearchableSelect }")) {
  code = code.replace(/import \{ X, Plus, Trash2, Printer, Search, Truck, Check, AlertTriangle, User, Calendar, MapPin \} from 'lucide-react';/, "import { X, Plus, Trash2, Printer, Search, Truck, Check, AlertTriangle, User, Calendar, MapPin } from 'lucide-react';\nimport { SearchableSelect } from '../common/SearchableSelect';");
}

const hargaJualSelect1 = /<select\s+value=\{currentKode\}\s+onChange=\{\(e\) => handleUpdateBalKodeHarga\(it\.barang_id, e\.target\.value\)\}\s+className="w-full px-2 py-1 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-\[#b81d24\] font-medium text-gray-900"\s+>\s+<option value="">-- Pilih Kode --<\/option>\s+\{activeHargaJualList\.map\(\(h\) => \(\s+<option key=\{h\.harga_jual_id\} value=\{h\.kode\}>\s+\{h\.kode\} \(\{formatRupiah\(h\.harga_jual\)\}\/kg\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;

code = code.replace(hargaJualSelect1, `<SearchableSelect
                                  value={currentKode}
                                  onChange={(v) => handleUpdateBalKodeHarga(it.barang_id, v)}
                                  options={activeHargaJualList.map(h => ({ value: h.kode, label: \`\${h.kode} (\${formatRupiah(h.harga_jual)}/kg)\` }))}
                                  placeholder="-- Pilih Kode --"
                                />`);
                                
const hargaJualSelect2 = /<select\s+value=\{currentKode\}\s+onChange=\{\(e\) => handleUpdateBalKodeHarga\(bal\.barang_id, e\.target\.value\)\}\s+className="w-full px-2 py-1 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-\[#b81d24\] font-medium text-gray-900"\s+>\s+<option value="">-- Pilih Kode --<\/option>\s+\{activeHargaJualList\.map\(\(h\) => \(\s+<option key=\{h\.harga_jual_id\} value=\{h\.kode\}>\s+\{h\.kode\} \(\{formatRupiah\(h\.harga_jual\)\}\/kg\)\s+<\/option>\s+\)\)\}\s+<\/select>/g;

code = code.replace(hargaJualSelect2, `<SearchableSelect
                                  value={currentKode}
                                  onChange={(v) => handleUpdateBalKodeHarga(bal.barang_id, v)}
                                  options={activeHargaJualList.map(h => ({ value: h.kode, label: \`\${h.kode} (\${formatRupiah(h.harga_jual)}/kg)\` }))}
                                  placeholder="-- Pilih Kode --"
                                />`);

fs.writeFileSync(file, code);
console.log('Patched PengirimanManagement.tsx');

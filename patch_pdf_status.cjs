const fs = require('fs');
let file = 'src/components/sample/BatchSamplePrintModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Remove header
code = code.replace(/<th className="border border-gray-900 p-2 text-right w-28">Status Sortir<\/th>/, '');

// Remove body cell
const statusCell = /<td className="border border-gray-300 p-2 text-right font-semibold">\s*\{isAcc \? \(\s*<span className="text-emerald-700 font-bold">ACC \(Deal\)<\/span>\s*\) : isReject \? \(\s*<span className="text-red-700 font-bold">Ditolak<\/span>\s*\) : isNego \? \(\s*<span className="text-amber-700 font-bold">Nego Harga<\/span>\s*\) : \(\s*<span className="text-blue-700">Dikirim<\/span>\s*\)\}\s*<\/td>/;
code = code.replace(statusCell, '');

// The footer colspan is fine, it was previously 2 for the left side and 2 for the right side
// Currently the columns are: No, Kode Bal, Berat Bal, Harga Tawaran
// Total columns = 4.
// Left colspan=2 (No, Kode Bal), then Berat Bal (1), then Harga Tawaran (colspan 1?) wait.

const tfootPattern = /<tr className="bg-gray-100 font-bold border-t-2 border-gray-900">\s*<td colSpan=\{2\} className="border border-gray-900 p-2 text-right uppercase text-\[11px\]">\s*Total \(\{totalBal\} Bal Sample\)\s*<\/td>\s*<td className="border border-gray-900 p-2 text-right font-mono">\s*\{formatNumber\(totalBeratBal, 1\)\} Kg\s*<\/td>\s*<td colSpan=\{2\} className="border border-gray-900 p-2 text-right font-mono text-sm text-gray-900">\s*Est\. Total Penawaran: \{formatRupiah\(totalNilaiTawaran\)\}\s*<\/td>\s*<\/tr>/;

const newTfoot = `<tr className="bg-gray-100 font-bold border-t-2 border-gray-900">
                    <td colSpan={2} className="border border-gray-900 p-2 text-right uppercase text-[11px]">
                      Total ({totalBal} Bal Sample)
                    </td>
                    <td className="border border-gray-900 p-2 text-right font-mono">
                      {formatNumber(totalBeratBal, 1)} Kg
                    </td>
                    <td className="border border-gray-900 p-2 text-right font-mono text-sm text-gray-900">
                      Est. Total Penawaran: {formatRupiah(totalNilaiTawaran)}
                    </td>
                  </tr>`;

code = code.replace(tfootPattern, newTfoot);

const dealRow = /<tr className="bg-emerald-50 font-bold border-b border-gray-900 text-emerald-900">\s*<td colSpan=\{3\} className="border border-gray-900 p-2 text-right uppercase text-\[11px\]">\s*Total Nilai Disetujui \(Deal Final\):\s*<\/td>\s*<td colSpan=\{2\} className="border border-gray-900 p-2 text-right font-mono text-sm">\s*\{formatRupiah\(totalNilaiDeal\)\}\s*<\/td>\s*<\/tr>/;

const newDealRow = `<tr className="bg-emerald-50 font-bold border-b border-gray-900 text-emerald-900">
                      <td colSpan={3} className="border border-gray-900 p-2 text-right uppercase text-[11px]">
                        Total Nilai Disetujui (Deal Final):
                      </td>
                      <td className="border border-gray-900 p-2 text-right font-mono text-sm">
                        {formatRupiah(totalNilaiDeal)}
                      </td>
                    </tr>`;
code = code.replace(dealRow, newDealRow);

fs.writeFileSync(file, code);
console.log('Patched print modal again');

const fs = require('fs');
let file = 'src/components/sample/BatchSamplePrintModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Remove headers
code = code.replace(/<th className="border border-gray-900 p-2 text-center w-16">Grade<\/th>/, '');
code = code.replace(/<th className="border border-gray-900 p-2 text-right w-20">Sample \(g\)<\/th>/, '');
code = code.replace(/<th className="border border-gray-900 p-2 text-left">Catatan \/ Alasan<\/th>/, '');

// Remove body cells
const gradeCell = /<td className="border border-gray-300 p-2 text-center font-bold text-sm bg-yellow-50\/50">\s*\{it\.kode_grade\}\s*<\/td>/;
code = code.replace(gradeCell, '');

const sampleGramCell = /<td className="border border-gray-300 p-2 text-right font-mono text-gray-600">\s*\{it\.berat_sample_gram\}\s*<\/td>/;
code = code.replace(sampleGramCell, '');

const catatanCell = /<td className="border border-gray-300 p-2 text-\[10px\] text-gray-600">\s*\{isReject \? it\.alasan_tolak : isNego \? it\.catatan_nego : it\.catatan_nego \|\| '-'\}\s*<\/td>/;
code = code.replace(catatanCell, '');

// Update footers
const tfootPattern = /<tr className="bg-gray-100 font-bold border-t-2 border-gray-900">[\s\S]*?<td colSpan=\{3\} className="border border-gray-900 p-2 text-right uppercase text-\[11px\]">[\s\S]*?Total \(\{totalBal\} Bal Sample\)[\s\S]*?<\/td>[\s\S]*?<td className="border border-gray-900 p-2 text-right font-mono">[\s\S]*?\{formatNumber\(totalBeratBal, 1\)\} Kg[\s\S]*?<\/td>[\s\S]*?<td className="border border-gray-900 p-2 text-right font-mono text-gray-600">[\s\S]*?\{totalSampleGram\} g[\s\S]*?<\/td>[\s\S]*?<td colSpan=\{3\} className="border border-gray-900 p-2 text-right font-mono text-sm text-gray-900">[\s\S]*?Est\. Total Penawaran: \{formatRupiah\(totalNilaiTawaran\)\}[\s\S]*?<\/td>[\s\S]*?<\/tr>/;

const newTfoot = `<tr className="bg-gray-100 font-bold border-t-2 border-gray-900">
                    <td colSpan={2} className="border border-gray-900 p-2 text-right uppercase text-[11px]">
                      Total ({totalBal} Bal Sample)
                    </td>
                    <td className="border border-gray-900 p-2 text-right font-mono">
                      {formatNumber(totalBeratBal, 1)} Kg
                    </td>
                    <td colSpan={2} className="border border-gray-900 p-2 text-right font-mono text-sm text-gray-900">
                      Est. Total Penawaran: {formatRupiah(totalNilaiTawaran)}
                    </td>
                  </tr>`;

code = code.replace(tfootPattern, newTfoot);

const dealRow = /<tr className="bg-emerald-50 font-bold border-b border-gray-900 text-emerald-900">[\s\S]*?<td colSpan=\{5\} className="border border-gray-900 p-2 text-right uppercase text-\[11px\]">[\s\S]*?Total Nilai Disetujui \(Deal Final\):[\s\S]*?<\/td>[\s\S]*?<td colSpan=\{3\} className="border border-gray-900 p-2 text-right font-mono text-sm">[\s\S]*?\{formatRupiah\(totalNilaiDeal\)\}[\s\S]*?<\/td>[\s\S]*?<\/tr>/;

const newDealRow = `<tr className="bg-emerald-50 font-bold border-b border-gray-900 text-emerald-900">
                      <td colSpan={3} className="border border-gray-900 p-2 text-right uppercase text-[11px]">
                        Total Nilai Disetujui (Deal Final):
                      </td>
                      <td colSpan={2} className="border border-gray-900 p-2 text-right font-mono text-sm">
                        {formatRupiah(totalNilaiDeal)}
                      </td>
                    </tr>`;

code = code.replace(dealRow, newDealRow);

fs.writeFileSync(file, code);
console.log('Patched BatchSamplePrintModal.tsx');

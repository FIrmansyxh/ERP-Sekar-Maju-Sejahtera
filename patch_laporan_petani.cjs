const fs = require('fs');
const file = 'src/components/laporan/LaporanPetaniView.tsx';
let code = fs.readFileSync(file, 'utf8');

const tableHeaderOriginal = `<th className="py-2 px-2.5">No Bal / Grade</th>`;
const tableHeaderNew = `<th className="py-2 px-2.5">No Bal</th>
                        <th className="py-2 px-2.5">Grade</th>`;
code = code.replace(tableHeaderOriginal, tableHeaderNew);

const tableCellOriginal = `<td className="py-2 px-2.5">
                              <span className="font-semibold text-gray-900">{t.no_bal}</span>
                              <span className="ml-1.5 px-1.5 py-0.2 bg-zinc-900 text-white text-[10px] font-bold">
                                {t.kode_grade}
                              </span>
                            </td>`;
const tableCellNew = `<td className="py-2 px-2.5">
                              <span className="font-semibold text-gray-900">{t.no_bal}</span>
                            </td>
                            <td className="py-2 px-2.5 max-w-[150px]">
                              <div className="flex flex-wrap gap-1">
                                {String(t.kode_grade).split(',').map((g, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-zinc-900 text-white text-[10px] font-bold rounded-xs whitespace-nowrap">
                                    {g.trim()}
                                  </span>
                                ))}
                              </div>
                            </td>`;
code = code.replace(tableCellOriginal, tableCellNew);

fs.writeFileSync(file, code);

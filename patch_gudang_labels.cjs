const fs = require('fs');
let file = 'src/components/laporan/LaporanGudangView.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /\{\(b\.status_stok === 'keluar' \|\| b\.status_stok === 'terkirim_sample'\) && \([\s\S]*?<\/span>[\s\S]*?\)\}/g;

const replacement = `{(() => {
                          let label = '';
                          let color = '';
                          
                          if (b.status_stok === 'terkirim_sample') {
                             label = 'Diuji Lab (Sample)';
                             color = 'bg-purple-50 text-purple-800 border-purple-300';
                          } else if (b.status_stok === 'keluar') {
                             const doId = b.pengiriman_id;
                             const isActive = doId ? activePengirimanIds.has(doId) : false;
                             if (isActive) {
                               label = 'Dimuat di Truk';
                               color = 'bg-orange-50 text-orange-800 border-orange-300';
                             } else {
                               label = 'Terjual / Diterima Pabrik';
                               color = 'bg-blue-50 text-blue-800 border-blue-300';
                             }
                          }
                          
                          if (label) {
                            return (
                              <span className={\`px-2 py-0.5 text-[10px] font-bold rounded-xs border \${color}\`}>
                                {label}
                              </span>
                            );
                          }
                          return null;
                        })()}`;

code = code.replace(regex, replacement);
fs.writeFileSync(file, code);
console.log('Patched LaporanGudangView labels!');

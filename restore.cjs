const fs = require('fs');
let code = fs.readFileSync('src/components/transaksi/TimbanganPageView.tsx', 'utf8');

// I will remove the wrongly inserted form and restore the original workingItems mapping.
const wrongFormRegex = /\{\/\* List of Bals in Selected Kupon \*\/\}\s*<div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-xs mt-4">[\s\S]*?\{\/\* Footer Actions \*\/\}/;

const restoredLeftPanel = `{/* List of Bals in Selected Kupon */}
          <div className="bg-white border border-slate-200 shadow-2xs rounded-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Bal ({workingItems.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {workingItems.map((item, index) => {
                const isActive = activeBalItemId === item.item_id;
                const isWeighed = (item.berat_kg || 0) > 0;
                return (
                  <button
                    key={item.item_id}
                    type="button"
                    onClick={() => setActiveBalItemId(item.item_id)}
                    className={\`w-full text-left px-4 py-3 transition cursor-pointer flex items-center justify-between \${
                      isActive
                        ? 'bg-slate-100 border-l-4 border-slate-900 font-semibold'
                        : isWeighed
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-white hover:bg-slate-50'
                    }\`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-slate-400 text-[10px] w-4">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-semibold text-slate-900">
                            {item.no_bal}
                          </span>
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium rounded-xs">
                            Grade {item.kode_grade}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {formatRupiah(item.harga_per_kg)}/kg {item.ganti_tikar && '• Ganti Tikar'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {isWeighed ? (
                        <div>
                          <span className="font-mono font-semibold text-slate-900 text-xs">
                            {item.berat_kg} Kg Netto
                          </span>
                          <p className="text-[9px] text-emerald-600 font-medium">
                            ✓ Terekam
                          </p>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xs text-[10px] font-medium">
                          Belum Timbang
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>`;

code = code.replace(wrongFormRegex, restoredLeftPanel);
fs.writeFileSync('src/components/transaksi/TimbanganPageView.tsx', code);

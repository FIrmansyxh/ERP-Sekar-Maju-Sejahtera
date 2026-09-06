const fs = require('fs');
const file = 'src/components/petani/PetaniDetailDrawer.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update tab title to use realTransactions.length (Kupon count) instead of totalBalComputed
const tabTitleOld = `            Riwayat Setoran ({totalBalComputed} Bal)
          </button>`;
const tabTitleNew = `            Riwayat Setoran ({realTransactions.length} Kupon)
          </button>`;
code = code.replace(tabTitleOld, tabTitleNew);

// Remove the label "Kupon:" and formatting logic inside map
const txRenderOld = `                      <div>
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <span className="font-mono font-bold text-gray-900">Kupon: {tx.no_kupon || '-'}</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-semibold text-gray-700">{items.length} Bal</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Tgl: {formatDateIndo(tx.tanggal_transaksi)} • Grade: {tx.kode_grade}
                        </div>
                      </div>`;

const txRenderNew = `                      <div>
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <span className="font-mono font-bold text-gray-900">{tx.no_kupon || '-'}</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-semibold text-gray-700">{items.length} Bal</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Tgl: {formatDateIndo(tx.tanggal_transaksi)}
                        </div>
                      </div>`;
code = code.replace(txRenderOld, txRenderNew);

// Remove weight from the right side
const txRightOld = `                      <div className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="font-mono font-bold text-blue-800">{tx.berat_kg} kg</span>
                          <span className="font-mono font-bold text-[#b81d24]">Rp {jmlBayar.toLocaleString('id-ID')}</span>
                        </div>
                        <span className={\`text-[10px] font-semibold mt-0.5 inline-block px-1.5 py-0.5 rounded-xs \${isLunas ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}\`}>
                          {isLunas ? '✓ Sudah Dibayar' : '⏳ Belum Dibayar'}
                        </span>
                      </div>`;

const txRightNew = `                      <div className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="font-mono font-bold text-[#b81d24]">Rp {jmlBayar.toLocaleString('id-ID')}</span>
                        </div>
                        <span className={\`text-[10px] font-semibold mt-0.5 inline-block px-1.5 py-0.5 rounded-xs \${isLunas ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}\`}>
                          {isLunas ? '✓ Sudah Dibayar' : '⏳ Belum Dibayar'}
                        </span>
                      </div>`;
code = code.replace(txRightOld, txRightNew);

// Change text on the tab from "Daftar transaksi timbangan bal tembakau yang telah disetor oleh petani:"
const descTextOld = `                Daftar transaksi timbangan bal tembakau yang telah disetor oleh petani:
              </div>`;
const descTextNew = `                Daftar transaksi setoran yang telah disetor oleh petani:
              </div>`;
code = code.replace(descTextOld, descTextNew);

fs.writeFileSync(file, code);

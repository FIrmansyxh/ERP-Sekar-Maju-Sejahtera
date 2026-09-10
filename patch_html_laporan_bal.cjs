const fs = require('fs');
const file = 'src/components/laporan/LaporanBalView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace Table Headers (Interactive Table)
const targetHeadersHTML = `                {/* 2. No Bal (Alphanumeric Natural Sort) */}
                <th
                  onClick={() => handleHeaderSort('no_bal')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none bg-slate-100/50"
                  title="Klik untuk urutkan No Bal dari alfabet lalu angka"
                >
                  <div className="flex items-center justify-between space-x-1.5">
                    <span className="text-gray-950 font-black">No. Bal</span>
                    {renderSortIndicator('no_bal')}
                  </div>
                </th>

                {/* 3. Tanggal Masuk */}
                <th
                  onClick={() => handleHeaderSort('tanggal_masuk')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Tanggal Masuk"
                >
                  <div className="flex items-center space-x-1">
                    <span>Tanggal Masuk</span>
                    {renderSortIndicator('tanggal_masuk')}
                  </div>
                </th>

                {/* 4. Kode Grade */}
                <th
                  onClick={() => handleHeaderSort('kode_grade')}
                  className="py-2.5 px-3 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Kode Grade"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Grade</span>
                    {renderSortIndicator('kode_grade')}
                  </div>
                </th>

                {/* 5. Nama Petani */}
                <th
                  onClick={() => handleHeaderSort('nama_petani')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Nama Petani"
                >
                  <div className="flex items-center space-x-1">
                    <span>Petani / Supplier</span>
                    {renderSortIndicator('nama_petani')}
                  </div>
                </th>

                {/* 6. Lokasi Gudang */}
                <th
                  onClick={() => handleHeaderSort('lokasi_gudang')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none hidden md:table-cell"
                  title="Klik untuk urutkan Lokasi Gudang"
                >
                  <div className="flex items-center space-x-1">
                    <span>Lokasi Gudang</span>
                    {renderSortIndicator('lokasi_gudang')}
                  </div>
                </th>

                {/* 7. Bruto (kg) */}
                <th
                  onClick={() => handleHeaderSort('berat_bruto_kg')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Berat Bruto"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Bruto (kg)</span>
                    {renderSortIndicator('berat_bruto_kg')}
                  </div>
                </th>

                {/* 8. Netto (kg) [PRIMARY SORT TARGET] */}
                <th
                  onClick={() => handleHeaderSort('berat_kg')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition group select-none bg-blue-50/70"
                  title="Klik untuk urutkan Berat Netto"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-blue-950 font-black">Netto (kg)</span>
                    {renderSortIndicator('berat_kg')}
                  </div>
                </th>

                {/* 9. Divider */}
                <th className="py-2.5 px-2.5 text-right border-r border-gray-200 text-gray-600">
                  <SlidersHorizontal className="w-4 h-4 inline-block opacity-30" />
                </th>

                {/* 10. Harga Beli / kg (Rp) [PRIMARY SORT TARGET] */}
                <th
                  onClick={() => handleHeaderSort('harga_per_kg')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-emerald-100 transition group select-none bg-emerald-50/70"
                  title="Klik untuk urutkan Harga Terendah ke Tertinggi"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-emerald-950 font-black">Harga/kg (Rp)</span>
                    {renderSortIndicator('harga_per_kg')}
                  </div>
                </th>

                {/* 11. Total Harga Beli (Rp) [PRIMARY SORT TARGET] */}
                <th
                  onClick={() => handleHeaderSort('total_harga')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-red-100 transition group select-none bg-red-50/70"
                  title="Klik untuk urutkan Total Harga Beli"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-[#b81d24] font-black">Total Harga (Rp)</span>
                    {renderSortIndicator('total_harga')}
                  </div>
                </th>

                {/* 12. Status Bal */}
                <th
                  onClick={() => handleHeaderSort('status_stok')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Status Bal"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    {renderSortIndicator('status_stok')}
                  </div>
                </th>`;
const newHeadersHTML = `                <th className="py-2.5 px-3 border-r border-gray-200 bg-slate-100/50">TANGGAL</th>
                <th className="py-2.5 px-3 border-r border-gray-200 bg-slate-100/50">NO BAL</th>
                <th className="py-2.5 px-3 border-r border-gray-200">PETANI</th>
                <th className="py-2.5 px-3 text-right border-r border-gray-200">BERAT</th>
                <th className="py-2.5 px-3 text-right border-r border-gray-200">HARGA</th>
                <th className="py-2.5 px-3 text-center border-r border-gray-200">STATUS</th>
                <th className="py-2.5 px-3 text-right border-r border-gray-200">POTONGAN</th>
                <th className="py-2.5 px-3 text-center">STATUS (DIGUDANG/TERKIRIM)</th>`;
code = code.replace(targetHeadersHTML, newHeadersHTML);

// Replace Table Rows (Interactive Table)
const targetRowsHTML = `                      {/* 2. No Bal */}
                      <td className="py-2 px-3 font-mono font-bold text-gray-900 border-r border-gray-100 whitespace-nowrap bg-slate-50/30">
                        {bal.no_bal}
                      </td>

                      {/* 3. Tanggal Masuk */}
                      <td className="py-2 px-3 font-mono text-gray-500 border-r border-gray-100 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* 4. Grade */}
                      <td className="py-2 px-3 text-center border-r border-gray-100">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {bal.kode_grade}
                        </span>
                      </td>

                      {/* 5. Nama Petani */}
                      <td className="py-2 px-3 border-r border-gray-100 font-medium text-gray-800">
                        <div className="truncate max-w-[150px]" title={bal.nama_petani}>
                          {bal.nama_petani}
                        </div>
                      </td>

                      {/* 6. Lokasi Gudang */}
                      <td className="py-2 px-3 border-r border-gray-100 text-gray-500 hidden md:table-cell">
                        <div className="truncate max-w-[120px]" title={bal.lokasi_gudang}>
                          {bal.lokasi_gudang}
                        </div>
                      </td>

                      {/* 7. Bruto */}
                      <td className="py-2 px-3 text-right font-mono text-gray-500 border-r border-gray-100">
                        {(bal.berat_bruto_kg || 0).toFixed(1)}
                      </td>

                      {/* 8. Netto */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 border-r border-gray-100 bg-blue-50/20">
                        {(bal.berat_kg || 0).toFixed(1)}
                      </td>

                      {/* 9. Divider */}
                      <td className="py-2 px-2.5 text-right border-r border-gray-100"></td>

                      {/* 10. Harga / kg */}
                      <td className="py-2 px-3 text-right font-mono text-emerald-700 border-r border-gray-100 bg-emerald-50/20">
                        {formatRupiah(bal.harga_per_kg || 0)}
                      </td>

                      {/* 11. Total Harga Beli */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#b81d24] border-r border-gray-100 bg-red-50/20">
                        {formatRupiah(bal.total_harga || 0)}
                      </td>

                      {/* 12. Status Stok */}
                      <td className="py-2 px-3 text-center">
                        {bal.status_stok === 'di_gudang' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Di Gudang
                          </span>
                        ) : bal.status_stok === 'siap_kirim' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            Siap Kirim
                          </span>
                        ) : bal.status_stok === 'keluar' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200">
                            Terkirim (Keluar)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {bal.status_stok.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </td>`;
const newRowsHTML = `                      <td className="py-2 px-3 font-mono text-gray-500 border-r border-gray-100 bg-slate-50/30 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-gray-900 border-r border-gray-100 bg-slate-50/30 whitespace-nowrap">
                        {bal.no_bal}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-100 font-medium text-gray-800">
                        <div className="truncate max-w-[150px]" title={bal.nama_petani}>{bal.nama_petani}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 border-r border-gray-100">
                        {(bal.berat_kg || 0).toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#b81d24] font-bold border-r border-gray-100">
                        {formatRupiah(bal.total_harga || 0)}
                      </td>
                      <td className="py-2 px-3 text-center border-r border-gray-100">
                        {bal.status_pembayaran === 'lunas' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-800">LUNAS</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 text-amber-800">KASBON</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600 border-r border-gray-100">
                        {formatRupiah(bal.potongan || 0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {bal.status_stok === 'di_gudang' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">DIGUDANG</span>
                        ) : bal.status_stok === 'keluar' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-xs text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">TERKIRIM</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-xs text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">{(bal.status_stok || '').toUpperCase()}</span>
                        )}
                      </td>`;
code = code.replace(targetRowsHTML, newRowsHTML);

// Replace Print Headers
const printHeadersTarget = `                <th className="p-1 border border-gray-300 text-center">No</th>
                <th className="p-1 border border-gray-300">No Bal</th>
                <th className="p-1 border border-gray-300">Tanggal</th>
                <th className="p-1 border border-gray-300 text-center">Grade</th>
                <th className="p-1 border border-gray-300">Petani / Supplier</th>
                <th className="p-1 border border-gray-300">Lokasi Gudang</th>
                <th className="p-1 border border-gray-300 text-right">Bruto (kg)</th>
                <th className="p-1 border border-gray-300 text-right">Netto (kg)</th>
                <th className="p-1 border border-gray-300 text-right">Harga/kg</th>
                <th className="p-1 border border-gray-300 text-right font-bold">Total Harga</th>
                <th className="p-1 border border-gray-300 text-center">Status</th>`;
const printHeadersNew = `                <th className="p-1 border border-gray-300 text-center">NO</th>
                <th className="p-1 border border-gray-300">TANGGAL</th>
                <th className="p-1 border border-gray-300">NO BAL</th>
                <th className="p-1 border border-gray-300">PETANI</th>
                <th className="p-1 border border-gray-300 text-right">BERAT</th>
                <th className="p-1 border border-gray-300 text-right">HARGA</th>
                <th className="p-1 border border-gray-300 text-center">STATUS</th>
                <th className="p-1 border border-gray-300 text-right">POTONGAN</th>
                <th className="p-1 border border-gray-300 text-center">STATUS (DIGUDANG/TERKIRIM)</th>`;
code = code.replace(printHeadersTarget, printHeadersNew);

// Replace Print Rows
const printRowsTarget = `                  <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                  <td className="p-1 border border-gray-300 font-mono font-bold">{b.no_bal}</td>
                  <td className="p-1 border border-gray-300 font-mono">{b.tanggal_masuk?.split('T')[0] || '-'}</td>
                  <td className="p-1 border border-gray-300 text-center font-bold">Grade {b.kode_grade}</td>
                  <td className="p-1 border border-gray-300">{b.nama_petani}</td>
                  <td className="p-1 border border-gray-300">{b.lokasi_gudang}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono">{(b.berat_bruto_kg || 0).toFixed(1)}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono font-bold">{(b.berat_kg || 0).toFixed(1)}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono">Rp {Math.round(b.harga_per_kg || 0).toLocaleString('id-ID')}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono font-bold">Rp {Math.round(b.total_harga || 0).toLocaleString('id-ID')}</td>
                  <td className="p-1 border border-gray-300 text-center uppercase text-[9px]">{b.status_stok}</td>`;
const printRowsNew = `                  <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                  <td className="p-1 border border-gray-300 font-mono">{b.tanggal_masuk?.split('T')[0] || '-'}</td>
                  <td className="p-1 border border-gray-300 font-mono font-bold">{b.no_bal}</td>
                  <td className="p-1 border border-gray-300">{b.nama_petani}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono font-bold">{(b.berat_kg || 0).toFixed(1)}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono font-bold">Rp {Math.round(b.total_harga || 0).toLocaleString('id-ID')}</td>
                  <td className="p-1 border border-gray-300 text-center uppercase text-[9px]">{b.status_pembayaran === 'lunas' ? 'LUNAS' : 'KASBON'}</td>
                  <td className="p-1 border border-gray-300 text-right font-mono">Rp {Math.round(b.potongan || 0).toLocaleString('id-ID')}</td>
                  <td className="p-1 border border-gray-300 text-center uppercase text-[9px]">{b.status_stok === 'di_gudang' ? 'DIGUDANG' : b.status_stok === 'keluar' ? 'TERKIRIM' : b.status_stok}</td>`;
code = code.replace(printRowsTarget, printRowsNew);

fs.writeFileSync(file, code);

const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

const regexToFindButtons = /<button\s*type="button"\s*title="Cetak Surat Dokumen Sample"[\s\S]*?<\/button>/;

const buttonsHTML = `<button
                                type="button"
                                title="Cetak Surat Dokumen Sample"
                                onClick={() => setPrintingBatch(batch)}
                                className="px-2 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xs transition cursor-pointer flex items-center space-x-1"
                              >
                                <Printer className="w-3 h-3 text-gray-600" />
                                <span>Cetak</span>
                              </button>
                              <button
                                type="button"
                                title="Hapus Batch"
                                onClick={() => {
                                  if (window.confirm('Yakin ingin menghapus batch sample ini?')) {
                                    if (onDeleteBatchSample) {
                                      onDeleteBatchSample(batch.batch_id);
                                    }
                                  }
                                }}
                                className="px-2 py-1 text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xs transition cursor-pointer flex items-center space-x-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>`;

code = code.replace(regexToFindButtons, buttonsHTML);

fs.writeFileSync(file, code);
console.log('Added Delete button to SampleManagement.tsx');

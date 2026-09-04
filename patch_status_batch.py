import re

with open('src/components/pengiriman/StatusBatchPengirimanManagement.tsx', 'r') as f:
    content = f.read()

view_2_start = """            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: STATUS BATCH PENGIRIMAN BARANG (AKAN, SEDANG, SUDAH)              */}"""

view_2_replacement = """            </div>
          </div>
          </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-sm p-12 flex flex-col items-center justify-center text-gray-500">
               <Layers className="w-12 h-12 text-gray-300 mb-3" />
               <h3 className="text-sm font-bold text-gray-700">Belum Ada Batch Terpilih</h3>
               <p className="text-xs text-gray-500 mt-1">Silakan cari dan pilih kode batch pengiriman sample di atas untuk melihat detail hasil sortir pembeli.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: STATUS BATCH PENGIRIMAN BARANG (AKAN, SEDANG, SUDAH)              */}"""

if view_2_start in content:
    content = content.replace(view_2_start, view_2_replacement)
    with open('src/components/pengiriman/StatusBatchPengirimanManagement.tsx', 'w') as f:
        f.write(content)
    print("Patched view 2")
else:
    print("Could not find view_2_start")


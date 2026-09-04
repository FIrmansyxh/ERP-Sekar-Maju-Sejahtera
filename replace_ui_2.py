import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

start_marker = "{/* Input Box with Dropdown Autocomplete */}"
end_marker = "{/* Alert Feedback */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + """{/* 3-Step Scan Form */}
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">LANGKAH 1: Bal Gudang</label>
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-8" />
                    <input
                      ref={inputGudangRef}
                      type="text"
                      placeholder="Scan / ketik No. Bal Gudang"
                      value={scanGudang}
                      onChange={(e) => setScanGudang(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanGudangSubmit();
                        }
                      }}
                      className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">LANGKAH 2: Bal Pembeli</label>
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-8" />
                    <input
                      ref={inputPembeliRef}
                      type="text"
                      disabled={!pendingScanBal}
                      placeholder={pendingScanBal ? "Scan Bal Pembeli (atau ulang gudang)" : "Tunggu Langkah 1"}
                      value={scanPembeli}
                      onChange={(e) => setScanPembeli(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanPembeliSubmit();
                        }
                      }}
                      className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">LANGKAH 3: Grade</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          ref={inputGradeRef}
                          type="text"
                          disabled={!pendingScanBal}
                          placeholder={pendingScanBal ? "Scan Grade & Enter" : "Tunggu Langkah 2"}
                          value={scanGrade}
                          onChange={(e) => setScanGrade(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleScanGradeSubmit();
                            }
                          }}
                          className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!pendingScanBal || !scanGrade.trim()}
                        onClick={handleScanGradeSubmit}
                        className="px-3 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:bg-gray-400 rounded-xs cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Simpan ↵
                      </button>
                    </div>
                  </div>
                </div>
              </div>\n\n              """ + content[end_idx:]
    with open('src/components/sample/SampleManagement.tsx', 'w') as f:
        f.write(new_content)
    print("replaced")
else:
    print("markers not found")

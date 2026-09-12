import sys

file_path = "src/components/laporan/LaporanGradeView.tsx"
with open(file_path, "r") as f:
    content = f.read()

target = """                  <td className="py-2 px-2 border-r border-gray-300 text-center font-semibold">{m.persenStokKg.toFixed(1)}%</td>"""

replacement = """                  <td className="py-2 px-2 border-r border-gray-300 text-center">
                    <div className="inline-flex items-center space-x-1.5 justify-center w-full">
                      <span className="font-semibold text-[#b81d24]">{m.persenStokKg.toFixed(1)}%</span>
                      <div className="w-10 bg-gray-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-zinc-800"
                          style={{ width: `${Math.min(100, m.persenStokKg * 2.5)}%` }}
                        />
                      </div>
                    </div>
                  </td>"""

content = content.replace(target, replacement)

with open(file_path, "w") as f:
    f.write(content)

print("Replacement 2 done.")

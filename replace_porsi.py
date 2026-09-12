import sys

file_path = "src/components/laporan/LaporanGradeView.tsx"
with open(file_path, "r") as f:
    content = f.read()

target = """                    {/* % Porsi */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold ${item.color.lightBg}`}>
                        {item.persenStokKg.toFixed(1)}%
                      </span>
                    </td>"""

replacement = """                    {/* % Porsi */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center space-x-1.5">
                        <span className="font-bold text-[#b81d24]">{item.persenStokKg.toFixed(1)}%</span>
                        <div className="w-12 bg-gray-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-zinc-800"
                            style={{ width: `${Math.min(100, item.persenStokKg * 2.5)}%` }}
                          />
                        </div>
                      </div>
                    </td>"""

# Replace all occurrences
content = content.replace(target, replacement)

# Wait, there's another table that might have a different structure.
# Let's check lines 1141 and 1785. They had `% Porsi`.

with open(file_path, "w") as f:
    f.write(content)

print("Replacement done.")

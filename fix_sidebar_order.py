import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

# Current sidebar order:
# modul-5-pengiriman
# modul-4-sample
# modul-status-batch

# We need to extract these blocks and reorder them.
block_5 = """                {checkAccess('modul-5-pengiriman') && (
                  <button
                    onClick={() => onSelectModule('modul-5-pengiriman')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-5-pengiriman'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Pengiriman Reguler (DO)</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {pengirimanCount}
                    </span>
                  </button>
                )}"""

block_4 = """                {checkAccess('modul-4-sample') && (
                  <button
                    onClick={() => onSelectModule('modul-4-sample')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-4-sample'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Pengiriman Sample QC</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {sampleCount}
                    </span>
                  </button>
                )}"""

block_status = """                {checkAccess('modul-status-batch') && (
                  <button
                    onClick={() => onSelectModule('modul-status-batch')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-status-batch'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Status & Detail Batch</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-xs border border-amber-200">
                      Sortir & DO
                    </span>
                  </button>
                )}"""

# Replace all of them with a combined block in the correct order.
# Wait, let's just find the section and replace it.

search_pattern = re.compile(r"\{\s*checkAccess\('modul-5-pengiriman'\)[\s\S]*?Sortir & DO\s*</span>\s*</button>\s*}\s*", re.MULTILINE)

new_block = f"""{block_4}

{block_5}

{block_status}
"""

if search_pattern.search(content):
    content = search_pattern.sub(new_block, content)
    with open('src/components/Sidebar.tsx', 'w') as f:
        f.write(content)
    print("Reordered sidebar menu!")
else:
    print("Could not find the block to replace.")

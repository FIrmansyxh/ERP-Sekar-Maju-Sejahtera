import re

with open('src/components/transaksi/TimbanganPageView.tsx', 'r') as f:
    content = f.read()

# 1. Remove Bal Overview Strip
overview_pattern = r"(                \{/\* Bal Overview Strip \*/\}[\s\S]*?</div>\s*</div>\s*</div>)"
content = re.sub(overview_pattern, "", content)

# 2. Reduce paddings to prevent scrolling
content = content.replace('className="p-5 space-y-5"', 'className="p-4 space-y-3.5"')
content = content.replace('className="space-y-4 font-sans pb-10"', 'className="space-y-3 font-sans pb-4"')
content = content.replace('className="grid grid-cols-1 lg:grid-cols-12 gap-4"', 'className="grid grid-cols-1 lg:grid-cols-12 gap-3"')
content = content.replace('className="lg:col-span-4 space-y-4"', 'className="lg:col-span-4 space-y-3"')
content = content.replace('className="lg:col-span-8 space-y-4"', 'className="lg:col-span-8 space-y-3"')

# Reduce the height of the left list so it fits well
content = content.replace('className="overflow-y-auto max-h-[400px] divide-y divide-slate-100"', 'className="overflow-y-auto max-h-[300px] divide-y divide-slate-100"')
content = content.replace('className="overflow-y-auto max-h-[350px] divide-y divide-slate-100"', 'className="overflow-y-auto max-h-[300px] divide-y divide-slate-100"')
content = content.replace('className="w-full bg-white border border-slate-300 rounded-sm px-4 py-2.5 text-2xl font-mono font-semibold text-slate-900', 'className="w-full bg-white border border-slate-300 rounded-sm px-4 py-2 text-xl font-mono font-semibold text-slate-900')


# Make the Netto text slightly smaller
content = content.replace('className="text-2xl font-mono font-bold text-slate-100 tabular-nums"', 'className="text-xl font-mono font-bold text-slate-100 tabular-nums"')
content = content.replace('className="text-lg font-mono font-semibold text-slate-100 tabular-nums"', 'className="text-base font-mono font-semibold text-slate-100 tabular-nums"')
content = content.replace('className="text-lg font-mono font-semibold text-slate-300 tabular-nums"', 'className="text-base font-mono font-semibold text-slate-300 tabular-nums"')
content = content.replace('className="p-4 bg-slate-900 text-white rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-4 text-center border border-slate-800"', 'className="p-2.5 bg-slate-900 text-white rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-center border border-slate-800"')

with open('src/components/transaksi/TimbanganPageView.tsx', 'w') as f:
    f.write(content)

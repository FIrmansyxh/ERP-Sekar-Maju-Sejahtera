with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace("id: 'modul-6-laporan-grade',\n    label: 'Laporan Mutu Grade'", "id: 'modul-6-laporan-grade',\n    label: 'Laporan Harga Beli & Stok'")

sidebar_add = """  {
    id: 'modul-6-laporan-harga-jual',
    label: 'Laporan Harga Jual',
    icon: FileText,
  },"""

if "modul-6-laporan-harga-jual" not in content:
    content = content.replace("id: 'modul-6-laporan-grade',\n    label: 'Laporan Harga Beli & Stok',\n    icon: Award,\n  },", "id: 'modul-6-laporan-grade',\n    label: 'Laporan Harga Beli & Stok',\n    icon: Award,\n  },\n" + sidebar_add)
    
access_orig = "const canSeeReport = checkAccess('modul-6-dashboard-analytic') || checkAccess('modul-6-laporan-grade') || checkAccess('modul-6-laporan-pembelian') || checkAccess('modul-6-laporan-gudang') || checkAccess('modul-6-laporan-petani') || checkAccess('modul-6-laporan-pengiriman');"
access_new = "const canSeeReport = checkAccess('modul-6-dashboard-analytic') || checkAccess('modul-6-laporan-grade') || checkAccess('modul-6-laporan-harga-jual') || checkAccess('modul-6-laporan-pembelian') || checkAccess('modul-6-laporan-gudang') || checkAccess('modul-6-laporan-petani') || checkAccess('modul-6-laporan-pengiriman');"

content = content.replace(access_orig, access_new)

content = content.replace("'modul-6-dashboard-analytic',\n    'modul-6-laporan-grade',", "'modul-6-dashboard-analytic',\n    'modul-6-laporan-grade',\n    'modul-6-laporan-harga-jual',")

menu_item = """                {checkAccess('modul-6-laporan-harga-jual') && (
                  <button
                    onClick={() => onSelectModule('modul-6-laporan-harga-jual')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-sm transition text-xs font-semibold ${
                      activeModuleId === 'modul-6-laporan-harga-jual'
                        ? 'bg-slate-800 text-slate-100 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></div>
                    <span>Laporan Harga Jual</span>
                  </button>
                )}"""
if "Laporan Harga Jual</span>" not in content:
    content = content.replace("{checkAccess('modul-6-laporan-pembelian') && (", menu_item + "\n                {checkAccess('modul-6-laporan-pembelian') && (")


with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)

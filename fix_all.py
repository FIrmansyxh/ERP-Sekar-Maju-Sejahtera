import re

# Fix App.tsx
with open('src/App.tsx', 'r') as f:
    app_content = f.read()
app_content = app_content.replace('userRole={user.role}', 'userRole={currentRole}')
with open('src/App.tsx', 'w') as f:
    f.write(app_content)

# Fix Sidebar.tsx
with open('src/components/Sidebar.tsx', 'r') as f:
    sidebar_content = f.read()
sidebar_content = sidebar_content.replace('import {\n  Home,\n  Database,\n  Tag,\n  ShoppingCart,\n  Package,\n  ChevronRight,\n  ChevronDown,\n  Users,\n  FlaskConical,\n  Truck,\n  BarChart3,\n  Scale,\n  Warehouse,\n  UserCheck,\n  FileSpreadsheet,\n  ShieldCheck\n} from \'lucide-react\';', 'import {\n  Home,\n  Database,\n  Tag,\n  ShoppingCart,\n  Package,\n  ChevronRight,\n  ChevronDown,\n  Users,\n  FlaskConical,\n  Truck,\n  BarChart3,\n  Scale,\n  Warehouse,\n  UserCheck,\n  FileSpreadsheet,\n  ShieldCheck,\n  FileText\n} from \'lucide-react\';')
with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(sidebar_content)

# Fix LaporanHargaJualView.tsx
with open('src/components/laporan/LaporanHargaJualView.tsx', 'r') as f:
    hj_content = f.read()
    
csv_replacement = """  const handleExportCSV = () => {
    const filename = `Laporan_Master_Harga_Jual_${new Date().toISOString().split('T')[0]}.csv`;
    const headers = ['Kode', 'Harga Jual (Rp)', 'Tanggal Berlaku', 'Status', 'Keterangan'];
    const rows = filteredList.map(h => [
      h.kode,
      h.harga_jual,
      h.tanggal_berlaku,
      h.status_aktif ? 'Aktif' : 'Non-Aktif',
      h.keterangan || '-',
    ]);
    downloadCsvFile(filename, headers, rows);
  };"""

# I need to match the handleExportCSV precisely
old_csv = """  const handleExportCSV = () => {
    const data = filteredList.map(h => ({
      'Kode': h.kode,
      'Harga Jual (Rp)': h.harga_jual,
      'Tanggal Berlaku': h.tanggal_berlaku,
      'Status': h.status_aktif ? 'Aktif' : 'Non-Aktif',
      'Keterangan': h.keterangan || '-',
    }));
    downloadCsvFile(data, `Laporan_Master_Harga_Jual_${new Date().toISOString().split('T')[0]}.csv`);
  };"""

hj_content = hj_content.replace(old_csv, csv_replacement)

with open('src/components/laporan/LaporanHargaJualView.tsx', 'w') as f:
    f.write(hj_content)


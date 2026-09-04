with open('src/App.tsx', 'r') as f:
    content = f.read()

import_jual = "import { LaporanHargaJualView } from './components/laporan/LaporanHargaJualView';\n"
if "LaporanHargaJualView" not in content:
    content = content.replace("import { LaporanGradeView } from './components/laporan/LaporanGradeView';", import_jual + "import { LaporanGradeView } from './components/laporan/LaporanGradeView';")

jsx_to_add = """            {activeModuleId === 'modul-6-laporan-harga-jual' && (
              <LaporanHargaJualView
                hargaJualList={hargaJualList}
                userRole={user.role}
              />
            )}"""

if "modul-6-laporan-harga-jual" not in content:
    content = content.replace("            {activeModuleId === 'modul-6-laporan-grade' && (", jsx_to_add + "\n            {activeModuleId === 'modul-6-laporan-grade' && (")

with open('src/App.tsx', 'w') as f:
    f.write(content)

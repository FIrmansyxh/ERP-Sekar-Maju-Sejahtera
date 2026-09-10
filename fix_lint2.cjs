const fs = require('fs');

// 1. PetaniImportExportModal.tsx
let petaniModal = fs.readFileSync('src/components/petani/PetaniImportExportModal.tsx', 'utf8');
if (!petaniModal.includes('AlertTriangle')) {
  petaniModal = petaniModal.replace(/import\s+\{([^}]+)\}\s+from\s+'lucide-react';/, "import { $1, AlertTriangle } from 'lucide-react';");
} else {
  // It has AlertTriangle but maybe not in import?
  if (!petaniModal.includes('AlertTriangle } from \'lucide-react\'')) {
     petaniModal = petaniModal.replace(/import\s+\{([^}]+)\}\s+from\s+'lucide-react';/, "import { $1, AlertTriangle } from 'lucide-react';");
  }
}
fs.writeFileSync('src/components/petani/PetaniImportExportModal.tsx', petaniModal);

// 2. LaporanGudangView.tsx (use new Set())
let laporanGudang = fs.readFileSync('src/components/laporan/LaporanGudangView.tsx', 'utf8');
laporanGudang = laporanGudang.replace(/\[\]/g, 'new Set()');
fs.writeFileSync('src/components/laporan/LaporanGudangView.tsx', laporanGudang);

console.log('Fixed lint2');

#!/bin/bash

# 1. Update imports
sed -i "s/import { ChevronDown/import { CheckCircle2, XCircle, ChevronDown/g" src/components/harga/HargaManagement.tsx

# 2. Add formStatusAktif state
sed -i "/const \[formKeterangan, setFormKeterangan\] = useState('');/a \  const [formStatusAktif, setFormStatusAktif] = useState(true);" src/components/harga/HargaManagement.tsx

# 3. Update handleOpenAddModal
sed -i "/setFormKeterangan('');/a \    setFormStatusAktif(true);" src/components/harga/HargaManagement.tsx

# 4. Update handleOpenEditModal
sed -i "/setFormKeterangan(item.ketentuan || '');/a \    setFormStatusAktif(item.status === 'aktif');" src/components/harga/HargaManagement.tsx

# 5. Update newItem status
sed -i "s/status: editingItem?.status || 'aktif',/status: formStatusAktif ? 'aktif' : 'nonaktif',/g" src/components/harga/HargaManagement.tsx


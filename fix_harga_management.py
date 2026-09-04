import re

with open('src/components/harga/HargaManagement.tsx', 'r') as f:
    content = f.read()

content = content.replace("berat_standar_kg: editingItem?.berat_standar_kg || 50,", "berat_standar_kg: editingItem?.berat_standar_kg || 50,\n      status: editingItem?.status || 'aktif',\n      dibuat_oleh: editingItem?.dibuat_oleh || 'System',")

with open('src/components/harga/HargaManagement.tsx', 'w') as f:
    f.write(content)
print("fixed")

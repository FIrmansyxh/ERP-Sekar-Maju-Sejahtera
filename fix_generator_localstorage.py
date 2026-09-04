import re

with open('src/data/maduraDatasetGenerator.ts', 'r') as f:
    content = f.read()

# Replace: const petaniList: Petani[] = INITIAL_PETANI_DATA;
# With: 
#   let petaniList: Petani[] = INITIAL_PETANI_DATA;
#   try {
#     const savedPetani = localStorage.getItem('erp_tembakau_petani_v8');
#     if (savedPetani) {
#       const parsed = JSON.parse(savedPetani);
#       if (Array.isArray(parsed) && parsed.length > 0) petaniList = parsed;
#     }
#   } catch (e) {}

replacement_petani = """  let petaniList: Petani[] = INITIAL_PETANI_DATA;
  try {
    const savedPetani = localStorage.getItem('erp_tembakau_petani_v8');
    if (savedPetani) {
      const parsed = JSON.parse(savedPetani);
      if (Array.isArray(parsed) && parsed.length > 0) {
        petaniList = parsed;
      }
    }
  } catch (e) {}
"""

content = content.replace("const petaniList: Petani[] = INITIAL_PETANI_DATA;", replacement_petani)

# Do the same for Harga Data
# Replace: INITIAL_HARGA_DATA.forEach(h => {
# With logic to read from local storage first

replacement_harga_1 = """  let hargaData = INITIAL_HARGA_DATA;
  try {
    const savedHarga = localStorage.getItem('erp_tembakau_harga_v8');
    if (savedHarga) {
      const parsed = JSON.parse(savedHarga);
      if (Array.isArray(parsed) && parsed.length > 0) {
        hargaData = parsed;
      }
    }
  } catch (e) {}

  hargaData.forEach(h => {"""

content = content.replace("INITIAL_HARGA_DATA.forEach(h => {", replacement_harga_1)

with open('src/data/maduraDatasetGenerator.ts', 'w') as f:
    f.write(content)
print("Added localStorage support to generator")

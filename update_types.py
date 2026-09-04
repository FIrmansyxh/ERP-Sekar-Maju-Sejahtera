with open('src/types/index.ts', 'r') as f:
    content = f.read()

content = content.replace("  harga_per_kg: number; // e.g. 140000", "  harga_per_kg: number; // e.g. 140000\n  harga_jual_per_kg?: number;")

with open('src/types/index.ts', 'w') as f:
    f.write(content)

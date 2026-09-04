import os

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
                if "TransaksiManagement" in content and path != "src/components/transaksi/TransaksiManagement.tsx":
                    print(f"Found in {path}")

with open('src/components/transaksi/KasirPageView.tsx', 'r') as f:
    content = f.read()

content = content.replace("    // Sort by Kupon\\n    return filtered.sort((a, b) => {", "    // Sort by Kupon\\n    return transaksiList.filter(tx => {\\n      // we already did the filter above, we need to capture it.\\n      // let's just fix it by replacing the whole block.\\n    })")

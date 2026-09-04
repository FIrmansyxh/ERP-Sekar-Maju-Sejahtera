import re

with open('src/components/pengiriman/PengirimanManagement.tsx', 'r') as f:
    content = f.read()

def replace_price_column_2(match):
    return """
                              {/* Display Harga (Rp/Kg) */}
                              <td className="p-2 text-right font-mono font-bold text-emerald-800">
                                {formatRupiah(currentPrice)}
                              </td>
"""
content = re.sub(r'\{/\* Editable Harga \(Rp/Kg\) \*/\}.*?</td\>', replace_price_column_2, content, flags=re.DOTALL)

with open('src/components/pengiriman/PengirimanManagement.tsx', 'w') as f:
    f.write(content)

print("done")

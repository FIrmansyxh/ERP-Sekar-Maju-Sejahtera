with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

open_divs = content.count("<div")
close_divs = content.count("</div")

print(f"Open: {open_divs}, Close: {close_divs}")

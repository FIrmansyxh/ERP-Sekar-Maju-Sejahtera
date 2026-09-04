with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

content = content.replace("      </div>\n      </div>\n    </div>\n  );\n};", "      </div>\n    </div>\n  );\n};")
if "      </div>\n      </div>\n    </div>\n  );\n};" not in content:
    # Just remove the last </div> before );
    lines = content.split('\n')
    for i in range(len(lines)-1, -1, -1):
        if "</div>" in lines[i]:
            lines.pop(i)
            break
    content = '\n'.join(lines)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)

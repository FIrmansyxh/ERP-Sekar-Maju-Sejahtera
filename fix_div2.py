import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Add a missing </div> right before the final `</form>` or at the end of the return
# Wait, let's just append it before `    </div>\n  );\n}`
content = content.replace("    </div>\n  );\n};", "      </div>\n    </div>\n  );\n};")

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)
print("Added </div> to the end")

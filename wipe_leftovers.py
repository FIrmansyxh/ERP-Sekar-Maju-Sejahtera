import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

# Remove the useEffect for handleClickOutside
content = re.sub(r'useEffect\(\(\) => \{\n\s*const handleClickOutside.*?\}, \[\]\);\n', '', content, flags=re.DOTALL)

# Remove the handleSelectSuggestedBal completely
content = re.sub(r'// Select a bal from autocomplete dropdown directly.*?setTimeout\(\(\) => inputGudangRef\.current\?\.focus\(\), 100\);\n\s*\}\n\s*\};\n', '', content, flags=re.DOTALL)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

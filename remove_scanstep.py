import re

with open('src/components/sample/SampleManagement.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'const \[scanStep, setScanStep\] = useState<1 \| 2 \| 3>\(1\);\n', '', content)
content = re.sub(r'<span>Mode Scan 3 Langkah: \{scanStep === 1 \? \'1\. Scan Gudang\' : scanStep === 2 \? \'2\. Scan Pembeli\' : \'3\. Scan Grade\'\}</span>', '<span>Mode Scan 3 Langkah Berurutan</span>', content)

with open('src/components/sample/SampleManagement.tsx', 'w') as f:
    f.write(content)

print("done")

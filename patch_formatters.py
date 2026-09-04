import re

with open('src/utils/formatters.ts', 'r') as f:
    content = f.read()

repl = """export function generateBatchSampleId(sequenceNumber: number = 1, _date?: Date | string | null): string {
  const num = Math.max(1, Math.min(9999, Math.floor(sequenceNumber)));
  const paddedNum = String(num).padStart(4, '0');
  return `SPL${paddedNum}`;
}"""

content = re.sub(r'export function generateBatchSampleId\(sequenceNumber: number = 1, _date\?: Date \| string \| null\): string \{\n  const num = Math\.max\(1, Math\.min\(9999, Math\.floor\(sequenceNumber\)\)\);\n  return String\(num\);\n\}', repl, content)

with open('src/utils/formatters.ts', 'w') as f:
    f.write(content)
print("patched")

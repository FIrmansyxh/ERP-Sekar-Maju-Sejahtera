const fs = require('fs');

let code = fs.readFileSync('src/components/common/SearchableSelect.tsx', 'utf8');

if (!code.includes('onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;')) {
  code = code.replace('className?: string;', 'className?: string;\n  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;');
  code = code.replace('allowCustom = false', 'allowCustom = false,\n  onKeyDown');
  code = code.replace(/onKeyDown=\{\(e\) => \{\s+if \(e.key === 'Enter' && allowCustom\) \{\s+e.preventDefault\(\);\s+setIsOpen\(false\);\s+onChange\(search\);\s+\}\s+\}\}/, `onKeyDown={(e) => {
            if (e.key === 'Enter' && allowCustom) {
              e.preventDefault();
              setIsOpen(false);
              onChange(search);
            }
            if (onKeyDown) {
              onKeyDown(e);
            }
          }}`);
  fs.writeFileSync('src/components/common/SearchableSelect.tsx', code);
  console.log('Patched SearchableSelect to support onKeyDown');
}

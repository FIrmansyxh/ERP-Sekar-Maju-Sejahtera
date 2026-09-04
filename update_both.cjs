const fs = require('fs');

function updateFile(filename, replacementFile, targetStr, endStr) {
  let content = fs.readFileSync(filename, 'utf8');
  
  // Update imports for icons
  content = content.replace(/import \{([\s\S]*?)\} from 'lucide-react';/, (match, group) => {
    if (!group.includes('ChevronDown')) {
      return `import { ChevronDown, ChevronUp, ${group} } from 'lucide-react';`;
    }
    return match;
  });

  // Add state for filter
  if (!content.includes('const [isFilterOpen')) {
    content = content.replace(/const \[searchTerm, setSearchTerm\] = useState\(''\);/, 
      "const [searchTerm, setSearchTerm] = useState('');\n  const [isFilterOpen, setIsFilterOpen] = useState(true);");
  }

  const replacement = fs.readFileSync(replacementFile, 'utf8');

  // Find the exact block to replace
  const startIdx = content.indexOf(targetStr);
  const endIdx = content.indexOf(endStr, startIdx);

  if (startIdx !== -1 && endIdx !== -1) {
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    fs.writeFileSync(filename, before + 'return (\n' + replacement + '\n' + after);
    console.log(`Updated ${filename}`);
  } else {
    console.log(`Could not find target strings in ${filename}`);
  }
}

updateFile(
  'src/components/harga/HargaManagement.tsx', 
  '/tmp/harga_replacement.txt',
  '  return (\n    <div className="space-y-6">',
  '      {/* Modal Add / Edit Form */}'
);

updateFile(
  'src/components/harga_jual/HargaJualManagement.tsx', 
  '/tmp/hargajual_replacement.txt',
  '  return (\n    <div className="space-y-5 animate-in fade-in duration-150">',
  '      {/* Modal Add / Edit Form */}'
);


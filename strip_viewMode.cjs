const fs = require('fs');

let content = fs.readFileSync('src/components/sample/SampleManagement.tsx', 'utf8');

// Remove viewMode state
content = content.replace(/const \[viewMode, setViewMode\] = useState<'list' \| 'create_batch'>\('list'\);\n/, '');

// Remove viewMode buttons (line 596-619)
content = content.replace(/<div className="flex flex-wrap items-center gap-2">\s*\{viewMode === 'list' \? \([\s\S]*?Kembali ke Daftar Sample.*?<\/span>\s*<\/button>\s*\)\}\s*<\/div>/, '');

// Remove {viewMode === 'create_batch' && (
// And its corresponding closing bracket which is right before {/* VIEW MODE 2
content = content.replace(/\{\/\* VIEW MODE 1: CREATE BATCH SAMPLE \*\/\}\n\s*\{viewMode === 'create_batch' && \(/, '{/* VIEW MODE 1: CREATE BATCH SAMPLE */}');
content = content.replace(/  \}\)\s*\{\/\* VIEW MODE 2: BATCH LIST TABLE & HISTORY \*\/\}/, '\n      {/* VIEW MODE 2: BATCH LIST TABLE & HISTORY */}');
// Wait, the closing bracket for create_batch is like:
//         </div>
//       )}
//
//       {/* VIEW MODE 2: BATCH LIST TABLE & HISTORY */}

content = content.replace(/<\/div>\n\s*\)\}\n\s*\{\/\* VIEW MODE 2: BATCH LIST TABLE & HISTORY \*\/\}/, '</div>\n\n      {/* VIEW MODE 2: BATCH LIST TABLE & HISTORY */}');

// Now remove the entire list view block
// From {/* VIEW MODE 2: BATCH LIST TABLE & HISTORY */} to the closing bracket before {/* Modal 1: QC
content = content.replace(/\{\/\* VIEW MODE 2: BATCH LIST TABLE & HISTORY \*\/\}[\s\S]*?<\/div>\n\s*\)\}\n\s*\{\/\* Modal 1: QC Sortir & Evaluation Modal \*\/\}/, '{/* Modal 1: QC Sortir & Evaluation Modal */}');

fs.writeFileSync('src/components/sample/SampleManagement.tsx', content);

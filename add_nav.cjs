const fs = require('fs');

let content = fs.readFileSync('src/components/sample/SampleManagement.tsx', 'utf8');

// Inside handleSaveBatchForm
// Let's add onNavigateToPengiriman
content = content.replace(/setIsConfirmCreateOpen\(false\);\s*setSelectedBalItems\(\[\]\);\s*\};/g, "setIsConfirmCreateOpen(false);\n    setSelectedBalItems([]);\n    if (onNavigateToPengiriman) {\n      onNavigateToPengiriman();\n    }\n  };");

fs.writeFileSync('src/components/sample/SampleManagement.tsx', content);

// And make sure App.tsx passes onNavigateToPengiriman to SampleManagement
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

appContent = appContent.replace(/onUpdateSample=\{handleUpdateSample\}\n\s*\/>/, "onUpdateSample={handleUpdateSample}\n                onNavigateToPengiriman={() => handleSelectModule('modul-status-batch')}\n              />");

fs.writeFileSync('src/App.tsx', appContent);


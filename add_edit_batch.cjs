const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

const regexToFindState = /const \[evaluatingBatch, setEvaluatingBatch\] = useState<BatchPengirimanSample \| null>\(null\);/;
code = code.replace(regexToFindState, `const [evaluatingBatch, setEvaluatingBatch] = useState<BatchPengirimanSample | null>(null);
  const [editingBatchMetadata, setEditingBatchMetadata] = useState<BatchPengirimanSample | null>(null);`);

const regexToFindButtons = /<button\s*type="button"\s*title="Cetak Surat Dokumen Sample"/;
const buttonsHTML = `<button
                                type="button"
                                title="Edit Info Batch"
                                onClick={() => setEditingBatchMetadata(batch)}
                                className="px-2 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xs transition cursor-pointer flex items-center space-x-1"
                              >
                                <Edit className="w-3 h-3 text-gray-600" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                title="Cetak Surat Dokumen Sample"`;
code = code.replace(regexToFindButtons, buttonsHTML);

// Import Edit icon
code = code.replace(/import \{ \n  Search, \n  Plus,/, 'import { \n  Search, \n  Plus, \n  Edit,');

fs.writeFileSync(file, code);
console.log('Added Edit button to SampleManagement.tsx');

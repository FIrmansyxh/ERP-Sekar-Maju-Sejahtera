const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

const importStatement = "import { EditBatchMetadataModal } from './EditBatchMetadataModal';\n";
code = code.replace(/import \{ ConfirmModal \} from '\.\.\/common\/ConfirmModal';/, "import { ConfirmModal } from '../common/ConfirmModal';\n" + importStatement);

const renderModal = `
      {/* Modal 1: QC Sortir & Evaluation Modal */}
      <EditBatchMetadataModal
        isOpen={!!editingBatchMetadata}
        onClose={() => setEditingBatchMetadata(null)}
        batch={editingBatchMetadata}
        onSave={(updatedBatch) => {
          if (onUpdateBatchSample) {
            onUpdateBatchSample(updatedBatch);
          }
          setEditingBatchMetadata(null);
        }}
      />
      <BatchEvaluasiSortirModal`;
code = code.replace(/\{\/\* Modal 1: QC Sortir & Evaluation Modal \*\/\}\s*<BatchEvaluasiSortirModal/, renderModal);

fs.writeFileSync(file, code);
console.log('Mounted EditBatchMetadataModal in SampleManagement.tsx');

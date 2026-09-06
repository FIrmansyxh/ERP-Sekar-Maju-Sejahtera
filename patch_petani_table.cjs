const fs = require('fs');
const file = 'src/components/petani/PetaniTable.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add TransaksiPembelian import
code = code.replace(
  "import { Petani, UserRole } from '../../types';",
  "import { Petani, UserRole, TransaksiPembelian } from '../../types';"
);

// 2. Add transaksiList to props
const targetInterface = `interface PetaniTableProps {
  data: Petani[];
  userRole: UserRole;`;
const newInterface = `interface PetaniTableProps {
  data: Petani[];
  userRole: UserRole;
  transaksiList?: TransaksiPembelian[];`;
code = code.replace(targetInterface, newInterface);

const targetProps = `export const PetaniTable: React.FC<PetaniTableProps> = ({
  data,
  userRole,`;
const newProps = `export const PetaniTable: React.FC<PetaniTableProps> = ({
  data,
  userRole,
  transaksiList = [],`;
code = code.replace(targetProps, newProps);

// 3. Update the render of Total Bal
const targetRender = `{petani.statistik?.total_setoran_bal || 0} Bal`;
const newRender = `{(() => {
                          const realTransactions = transaksiList.filter((tx) => tx.petani_id === petani.petani_id);
                          const totalBal = realTransactions.reduce((acc, tx) => acc + (tx.total_bal || (tx.items ? tx.items.length : 0)), 0);
                          return totalBal;
                        })()} Bal`;
code = code.replace(targetRender, newRender);

fs.writeFileSync(file, code);

const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// Implement handleClearLogs inside App.tsx
const refreshFunc = `  const handleRefreshLogs = () => {
    setLogAktivitasList([...getLogAktivitasData()]);
  };`;

const clearFunc = `  const handleRefreshLogs = () => {
    setLogAktivitasList([...getLogAktivitasData()]);
  };

  const handleClearLogs = () => {
    setLogAktivitasList([]);
    saveLogAktivitasData([]);
    showToast('Seluruh riwayat log aktivitas telah dihapus.');
  };`;

code = code.replace(refreshFunc, clearFunc);

// Pass onClearLogs to LogAktivitasManagement
const oldLogUsage = `<LogAktivitasManagement
                logs={logAktivitasList}
                currentUser={currentUser}
                allUsers={userList}
                onRefreshLogs={handleRefreshLogs}
              />`;
const newLogUsage = `<LogAktivitasManagement
                logs={logAktivitasList}
                currentUser={currentUser}
                allUsers={userList}
                onRefreshLogs={handleRefreshLogs}
                onClearLogs={handleClearLogs}
              />`;

code = code.replace(oldLogUsage, newLogUsage);

fs.writeFileSync(file, code);

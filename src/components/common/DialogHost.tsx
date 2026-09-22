import { useEffect, useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { berlangganDialog, PermintaanDialog, selesaikanDialog } from '../../utils/dialog';

/** Menampilkan dialog dari utils/dialog satu per satu sesuai urutan permintaan. Cukup dipasang sekali di akar aplikasi. */
export function DialogHost() {
  const [antrean, setAntrean] = useState<PermintaanDialog[]>([]);
  useEffect(() => berlangganDialog(setAntrean), []);

  const aktif = antrean[0];
  if (!aktif) return null;

  const info = aktif.jenis === 'info';
  return (
    <ConfirmModal
      isOpen
      title={aktif.opsi.judul || (info ? 'Perhatian' : 'Konfirmasi')}
      message={aktif.pesan}
      confirmText={aktif.opsi.teksOk || (info ? 'Mengerti' : 'Ya, Lanjutkan')}
      cancelText={aktif.opsi.teksBatal || 'Batal'}
      variant={aktif.opsi.varian}
      hideCancel={info}
      onConfirm={() => selesaikanDialog(aktif.id, true)}
      onClose={() => selesaikanDialog(aktif.id, false)}
    />
  );
}

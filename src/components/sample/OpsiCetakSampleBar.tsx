import React from 'react';
import {
  LABEL_OPSI_HARGA,
  LABEL_OPSI_NO_BAL,
  OpsiCetakSample,
  OpsiHargaSample,
  OpsiNoBalSample,
} from '../../utils/suratSample';

interface OpsiCetakSampleBarProps {
  opsi: OpsiCetakSample;
  onUbah: (ubah: Partial<OpsiCetakSample>) => void;
  className?: string;
}

function Pilihan<T extends string>({
  label,
  nilai,
  daftar,
  onPilih,
}: {
  label: string;
  nilai: T;
  daftar: Record<T, string>;
  onPilih: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold text-gray-600 whitespace-nowrap">{label}</span>
      <div className="inline-flex border border-gray-300 rounded-sm overflow-hidden bg-white" role="radiogroup" aria-label={label}>
        {(Object.keys(daftar) as T[]).map((kunci, i) => (
          <button
            key={kunci}
            type="button"
            role="radio"
            aria-checked={nilai === kunci}
            onClick={() => onPilih(kunci)}
            className={`px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${i > 0 ? 'border-l border-gray-300' : ''} ${
              nilai === kunci ? 'bg-[#b81d24] text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {daftar[kunci]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Pilihan isi Surat Sample: kolom nomor bal dan tampilan harga jual. Bruto selalu tampil. */
export const OpsiCetakSampleBar: React.FC<OpsiCetakSampleBarProps> = ({ opsi, onUbah, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
    <Pilihan<OpsiNoBalSample> label="Nomor Bal" nilai={opsi.noBal} daftar={LABEL_OPSI_NO_BAL} onPilih={(noBal) => onUbah({ noBal })} />
    <Pilihan<OpsiHargaSample> label="Harga Jual" nilai={opsi.harga} daftar={LABEL_OPSI_HARGA} onPilih={(harga) => onUbah({ harga })} />
  </div>
);

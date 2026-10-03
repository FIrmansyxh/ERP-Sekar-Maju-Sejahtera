import { describe, expect, it } from 'vitest';
import { formatDateTimeIndo } from './formatters';

const p = (n: number) => String(n).padStart(2, '0');
const jamLokal = (iso: string) => {
  const d = new Date(iso);
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

describe('formatDateTimeIndo', () => {
  it('waktu berzona dari server atau perangkat ditampilkan dalam jam perangkat, bukan jam yang tertulis di teks', () => {
    // Regresi 2026-10-01: "terakhir login" dan waktu ganti No Bal tampil 7 jam lebih awal (jam UTC)
    expect(formatDateTimeIndo('2026-10-01 07:14:16+00')).toBe(jamLokal('2026-10-01T07:14:16Z'));
    expect(formatDateTimeIndo('2026-10-01T07:14:16.000Z')).toBe(jamLokal('2026-10-01T07:14:16Z'));
    expect(formatDateTimeIndo('2026-10-01 14:02:41.260888+07')).toBe(jamLokal('2026-10-01T07:02:41Z'));
  });

  it('waktu tanpa zona dan tanggal saja tetap seperti tertulis', () => {
    expect(formatDateTimeIndo('2026-10-01 14:05:00')).toBe('01-10-2026 14:05');
    expect(formatDateTimeIndo('2026-10-01')).toBe('01-10-2026');
    expect(formatDateTimeIndo(null)).toBe('-');
  });
});

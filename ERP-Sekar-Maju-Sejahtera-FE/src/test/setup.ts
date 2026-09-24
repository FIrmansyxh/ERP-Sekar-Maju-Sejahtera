import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Bersihkan DOM dan penyimpanan antar tes agar tiap tes berdiri sendiri
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

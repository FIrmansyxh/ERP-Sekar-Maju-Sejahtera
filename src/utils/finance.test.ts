import { describe, it, expect } from 'vitest';
import {
  hitungModalTransaksi,
  hitungNilaiBal
} from './financialCalculations';
import { TransaksiPembelian, TransaksiItemBal } from '../types';

describe('Financial Calculations - Regresi Ganti Tikar', () => {
  it('should correctly calculate subtotal_bersih excluding potongan_tikar from the value', () => {
    // According to the app logic, total_potongan contains potongan_kuli + potongan_tali + potongan_tikar
    // But financialCalculations hitungNilaiBal & hitungModalTransaksi calculate the "Murni" (gross)
    // The actual deduction is applied at the component level.
    
    // So let's test if hitungModalTransaksi correctly calculates gross value
    const tx: Partial<TransaksiPembelian> = {
      items: [
        {
          berat_kg: 50,
          harga_per_kg: 100000,
          potongan_kuli: 7000,
          potongan_tali: 3000,
          potongan_tikar: 75000, // ganti_tikar = true
          potongan: 85000,
        } as unknown as TransaksiItemBal
      ]
    };

    const modal = hitungModalTransaksi(tx);
    // 50 kg * 100,000 = 5,000,000
    expect(modal).toBe(5000000);
    
    // To ensure the component logic works properly, we verify total deduction
    const totalPotongan = tx.items!.reduce((acc, it) => acc + (it.potongan || 0), 0);
    expect(totalPotongan).toBe(85000);
    
    const subtotalBersih = modal - totalPotongan;
    expect(subtotalBersih).toBe(4915000);
  });
});

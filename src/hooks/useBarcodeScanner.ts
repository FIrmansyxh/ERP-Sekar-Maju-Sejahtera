import { useEffect, useRef } from 'react';

/**
 * Hook to listen for hardware barcode scanner inputs (HID Keyboard Wedge).
 * Hardware scanners send character keystrokes rapidly (< 50ms) terminated by Enter.
 * When onNoBalScanned is provided in a component with a No Bal input/context, it gets called.
 * If a component does NOT listen or is on a random page without No Bal, nothing happens.
 */
export function useBarcodeScanner(onNoBalScanned?: (noBal: string) => void) {
  const scanBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const callbackRef = useRef(onNoBalScanned);

  useEffect(() => {
    callbackRef.current = onNoBalScanned;
  }, [onNoBalScanned]);

  useEffect(() => {
    if (!callbackRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // If user is actively typing in a standard textarea or unrelated input, ignore unless it's a dedicated scanner receiver
      const isTypingInOtherInput =
        target &&
        target.tagName === 'TEXTAREA';

      if (isTypingInOtherInput) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;

      // Reset buffer if delay is too long (manual human typing typically > 80ms)
      if (timeDiff > 120 && scanBufferRef.current.length > 0) {
        scanBufferRef.current = '';
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        const scanned = scanBufferRef.current.trim();
        if (scanned.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          if (callbackRef.current) {
            callbackRef.current(scanned);
          }
        }
        scanBufferRef.current = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        scanBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);
}

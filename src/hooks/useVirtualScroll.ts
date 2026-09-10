import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface UseVirtualScrollOptions {
  totalItems: number;
  rowHeight: number;
  overscan?: number;
  containerHeight?: number;
}

export interface UseVirtualScrollResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  startIndex: number;
  endIndex: number;
  paddingTop: number;
  paddingBottom: number;
  totalHeight: number;
  visibleCount: number;
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  scrollTop: number;
}

/**
 * High-performance virtual scrolling hook for tables and lists.
 * Renders only visible rows + overscan buffer to keep DOM lightweight (< 30 nodes)
 * even with 10,000+ items.
 */
export function useVirtualScroll({
  totalItems,
  rowHeight,
  overscan = 6,
  containerHeight = 520,
}: UseVirtualScrollOptions): UseVirtualScrollResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(containerHeight);
  const rafIdRef = useRef<number | null>(null);

  // ResizeObserver to detect exact container height dynamically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (el.clientHeight > 0) {
      setViewportHeight(el.clientHeight);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setViewportHeight(entry.contentRect.height);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // RAF-throttled scroll handler to maintain smooth 60fps scrolling
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const targetScrollTop = e.currentTarget.scrollTop;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      setScrollTop(targetScrollTop);
      rafIdRef.current = null;
    });
  }, []);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Compute virtualization slices
  const { startIndex, endIndex, paddingTop, paddingBottom, totalHeight, visibleCount } = useMemo(() => {
    if (totalItems <= 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        paddingTop: 0,
        paddingBottom: 0,
        totalHeight: 0,
        visibleCount: 0,
      };
    }

    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(
      totalItems,
      Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
    );

    const padTop = start * rowHeight;
    const padBottom = Math.max(0, (totalItems - end) * rowHeight);
    const totHeight = totalItems * rowHeight;

    return {
      startIndex: start,
      endIndex: end,
      paddingTop: padTop,
      paddingBottom: padBottom,
      totalHeight: totHeight,
      visibleCount: end - start,
    };
  }, [totalItems, rowHeight, overscan, scrollTop, viewportHeight]);

  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const targetPos = Math.max(0, Math.min(index * rowHeight, (totalItems - 1) * rowHeight));
      containerRef.current.scrollTop = targetPos;
      setScrollTop(targetPos);
    }
  }, [rowHeight, totalItems]);

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, []);

  return {
    containerRef,
    onScroll,
    startIndex,
    endIndex,
    paddingTop,
    paddingBottom,
    totalHeight,
    visibleCount,
    scrollToIndex,
    scrollToTop,
    scrollTop,
  };
}

'use client';
import { useRef, useEffect } from 'react';

/**
 * TableWrapper — shows a horizontal scrollbar at the TOP of the table
 * so users don't have to scroll to the bottom of the page to scroll horizontally.
 * Both scrollbars (top + bottom) stay in sync.
 */
export function TableWrapper({ children }: { children: React.ReactNode }) {
  const topRef    = useRef<HTMLDivElement>(null);
  const tableRef  = useRef<HTMLDivElement>(null);
  const phantomRef = useRef<HTMLDivElement>(null);
  const syncing   = useRef(false);

  useEffect(() => {
    const top   = topRef.current;
    const table = tableRef.current;
    const ph    = phantomRef.current;
    if (!top || !table || !ph) return;

    // Keep phantom width equal to the scrollable content width
    const syncWidth = () => {
      ph.style.width = table.scrollWidth + 'px';
    };
    syncWidth();

    const ro = new ResizeObserver(syncWidth);
    ro.observe(table);

    // Bidirectional scroll sync
    const onTopScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      table.scrollLeft = top.scrollLeft;
      syncing.current = false;
    };
    const onTableScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      top.scrollLeft = table.scrollLeft;
      syncing.current = false;
    };

    top.addEventListener('scroll', onTopScroll);
    table.addEventListener('scroll', onTableScroll);

    return () => {
      top.removeEventListener('scroll', onTopScroll);
      table.removeEventListener('scroll', onTableScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <div>
      {/* ── Top scrollbar mirror ─────────────────────────────────────────── */}
      <div
        ref={topRef}
        className="overflow-x-scroll overflow-y-hidden border-b border-gray-100"
        style={{ height: 14 }}
      >
        {/* Phantom element — same width as table content */}
        <div ref={phantomRef} style={{ height: 1 }} />
      </div>

      {/* ── Actual table ─────────────────────────────────────────────────── */}
      <div ref={tableRef} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

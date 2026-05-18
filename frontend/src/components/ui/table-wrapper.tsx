'use client';

/**
 * TableWrapper — constrains the table to the visible viewport height.
 * Both the horizontal scrollbar (bottom) and vertical scrollbar (right)
 * are always visible — no need to scroll the page to reach them.
 *
 * 220px accounts for: top nav bar (~57px) + page header (~80px) +
 * filters/toolbar (~80px). Adjust if pages have taller toolbars.
 */
export function TableWrapper({ children, loading, empty, emptyMessage }: {
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div
      className="overflow-auto w-full"
      style={{ maxHeight: 'calc(100vh - 220px)' }}
    >
      {children}
    </div>
  );
}

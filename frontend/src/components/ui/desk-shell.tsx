'use client';

import type { ElementType, ReactNode } from 'react';

/** Table header cell — enterprise-style (dense, uppercase, slate band). */
export const DESK_TH =
  'text-left px-3 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-100/95 border-b border-slate-200';

export function DeskShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function DeskTableSection({ children }: { children: ReactNode }) {
  return <div className="border-t border-slate-100">{children}</div>;
}

export function zebraRow(i: number) {
  return i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';
}

/** Top-of-page title row: icon tile, title, subtitle, optional actions (CRM / ATS style). */
export function DeskPageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  accentClassName = 'bg-blue-700',
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  accentClassName?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 text-white ${accentClassName}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

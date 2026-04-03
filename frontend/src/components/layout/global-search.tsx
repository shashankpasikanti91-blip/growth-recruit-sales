'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api-client';
import { Search, X, User, Briefcase, Building2, Phone, Target, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ENTITY_CONFIG: Record<string, { icon: React.ElementType; color: string; href: (id: string) => string }> = {
  candidate: { icon: User, color: 'text-blue-600 bg-blue-50', href: (id) => `/candidates/${id}` },
  lead: { icon: Target, color: 'text-purple-600 bg-purple-50', href: (id) => `/leads/${id}` },
  company: { icon: Building2, color: 'text-amber-600 bg-amber-50', href: (id) => `/companies/${id}` },
  contact: { icon: Phone, color: 'text-green-600 bg-green-50', href: (id) => `/contacts/${id}` },
  job: { icon: Briefcase, color: 'text-indigo-600 bg-indigo-50', href: (id) => `/jobs/${id}` },
  application: { icon: ClipboardList, color: 'text-rose-600 bg-rose-50', href: (id) => `/applications/${id}` },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: results, isFetching } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => searchApi.global({ q: query, limit: 10 }),
    enabled: query.length >= 2,
    staleTime: 1000,
  });

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = useCallback((entityType: string, id: string) => {
    const config = ENTITY_CONFIG[entityType];
    if (config) {
      router.push(config.href(id));
      setOpen(false);
      setQuery('');
    }
  }, [router]);

  const items = results?.results ?? [];

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-400 hover:border-gray-300 transition-colors w-72"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search everything...</span>
        <kbd className="hidden sm:inline text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">⌘K</kbd>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-0 left-0 w-[420px] bg-white rounded-xl border border-gray-200 shadow-2xl z-50 overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, business ID..."
              className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {query.length < 2 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Type at least 2 characters to search</div>
            )}
            {query.length >= 2 && isFetching && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Searching...</div>
            )}
            {query.length >= 2 && !isFetching && items.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No results found</div>
            )}
            {items.map((item: any) => {
              const config = ENTITY_CONFIG[item.entityType] ?? ENTITY_CONFIG.candidate;
              const Icon = config.icon;
              return (
                <button
                  key={`${item.entityType}-${item.id}`}
                  onClick={() => handleSelect(item.entityType, item.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {item.businessId && <span className="font-mono mr-2">{item.businessId}</span>}
                      {item.subtitle}
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 uppercase bg-gray-50 px-1.5 py-0.5 rounded">
                    {item.entityType}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

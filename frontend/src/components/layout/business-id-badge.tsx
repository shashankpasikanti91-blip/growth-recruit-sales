'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function BusinessIdBadge({ businessId }: { businessId?: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!businessId) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(businessId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Click to copy"
      className="inline-flex items-center gap-1.5 font-mono text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors"
    >
      {businessId}
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 text-gray-400" />
      )}
    </button>
  );
}

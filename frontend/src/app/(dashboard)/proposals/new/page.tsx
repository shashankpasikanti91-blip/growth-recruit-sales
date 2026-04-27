'use client';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function NewProposalPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/proposals" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 mb-4">
          <FileText className="w-6 h-6 text-indigo-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">New Proposal</h1>
        <p className="text-gray-500 text-sm mb-6">
          Proposal creation form is coming soon. You can currently manage proposals via the API or backend admin.
        </p>
        <Link
          href="/proposals"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Back to Proposals
        </Link>
      </div>
    </div>
  );
}

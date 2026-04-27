'use client';
import Link from 'next/link';
import { Send, ArrowLeft } from 'lucide-react';

export default function NewSubmissionPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/submissions" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-50 mb-4">
          <Send className="w-6 h-6 text-purple-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">New Submission</h1>
        <p className="text-gray-500 text-sm mb-6">
          Submission creation form is coming soon. You can currently manage submissions via the API or backend admin.
        </p>
        <Link
          href="/submissions"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          Back to Submissions
        </Link>
      </div>
    </div>
  );
}

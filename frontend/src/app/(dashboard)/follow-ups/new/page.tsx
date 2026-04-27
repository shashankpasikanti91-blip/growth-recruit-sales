'use client';
import Link from 'next/link';
import { CalendarCheck, ArrowLeft } from 'lucide-react';

export default function NewFollowUpPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/follow-ups" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mb-4">
          <CalendarCheck className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Schedule Follow-Up</h1>
        <p className="text-gray-500 text-sm mb-6">
          Follow-up scheduling form is coming soon. You can currently manage follow-ups via the API or backend admin.
        </p>
        <Link
          href="/follow-ups"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
        >
          Back to Follow-Ups
        </Link>
      </div>
    </div>
  );
}

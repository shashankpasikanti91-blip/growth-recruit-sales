'use client';
import Link from 'next/link';
import { Handshake, ArrowLeft } from 'lucide-react';

export default function NewClientPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-4">
          <Handshake className="w-6 h-6 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Add New Client</h1>
        <p className="text-gray-500 text-sm mb-6">
          Client creation form is coming soon. You can currently manage clients via the API or backend admin.
        </p>
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Clients
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useRouter } from 'next/router';
import api from '../lib/api';
import { FileText, PlusCircle, Search, Download, Folder, File } from 'lucide-react';

const DOCUMENT_CATEGORIES = [
  { id: 'policies', label: 'HR Policies', icon: '📖' },
  { id: 'contracts', label: 'Contracts & Agreements', icon: '📜' },
  { id: 'certificates', label: 'Certificates', icon: '🏆' },
  { id: 'benefits', label: 'Benefits & Insurance', icon: '🛡️' },
];

const DOWNLOADABLE_DOCUMENTS = [
  // HR Policies
  { id: 'policy-leave', category: 'policies', name: 'Leave Policy', description: 'Annual and casual leave guidelines', file: 'Leave_Policy_2025.pdf' },
  { id: 'policy-code', category: 'policies', name: 'Code of Conduct', description: 'Employee code of conduct and ethics', file: 'Code_of_Conduct.pdf' },
  { id: 'policy-travel', category: 'policies', name: 'Travel Policy', description: 'Business travel guidelines and allowances', file: 'Travel_Policy_2025.pdf' },
  { id: 'policy-harassment', category: 'policies', name: 'Anti-Harassment Policy', description: 'Workplace harassment and discrimination policy', file: 'Anti_Harassment_Policy.pdf' },
  
  // Contracts
  { id: 'contract-employment', category: 'contracts', name: 'Employment Agreement', description: 'Standard employment contract template', file: 'Employment_Agreement.pdf' },
  { id: 'contract-confidentiality', category: 'contracts', name: 'Confidentiality Agreement', description: 'Non-disclosure and confidentiality agreement', file: 'NDA.pdf' },
  
  // Certificates
  { id: 'cert-experience', category: 'certificates', name: 'Certificate of Service', description: 'Years of service certificate template', file: 'Certificate_of_Service.pdf' },
  
  // Benefits & Insurance
  { id: 'benefits-epf', category: 'benefits', name: 'EPF Information', description: 'Employee Provident Fund details and contribution rates', file: 'EPF_Information_2025.pdf' },
  { id: 'benefits-socso', category: 'benefits', name: 'SOCSO Benefits', description: 'Social Security Organization coverage and benefits', file: 'SOCSO_Benefits.pdf' },
  { id: 'benefits-insurance', category: 'benefits', name: 'Group Insurance', description: 'Company group insurance scheme details', file: 'Group_Insurance_Plan.pdf' },
];

export default function DocumentsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('policies');
  const [documents, setDocuments] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      const role = raw ? JSON.parse(raw)?.role : null;
      const allowed = new Set(['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'HR_ADMIN']);
      if (!allowed.has(role)) {
        router.replace('/workspace/documents');
      }
    } catch {
      router.replace('/workspace/documents');
    }
  }, [router]);

  const [downloading, setDownloading] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [selectedCategory]);

  const loadDocuments = () => {
    // Filter documents by category
    const filtered = DOWNLOADABLE_DOCUMENTS.filter(doc => doc.category === selectedCategory);
    setDocuments(filtered);
  };

  const handleDownload = async (doc) => {
    try {
      setDownloading(doc.id);
      // In a real application, this would download from the server
      // For now, we'll show a success message
      alert(`Document "${doc.name}" download initiated.\n\nFile: ${doc.file}\n\nThis is coming soon!`);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  const currentCategory = DOCUMENT_CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <DashboardLayout title="Document Vault">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Document Vault</h2>
            <p className="text-sm text-slate-500 mt-0.5">Download forms, policies, and documents available to you</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {DOCUMENT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              <span className="mr-2">{cat.icon}</span>{cat.label}
            </button>
          ))}
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.length > 0 ? (
            documents.map(doc => (
              <div key={doc.id} className="bg-white rounded-lg border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <File className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm">{doc.name}</h3>
                    <p className="text-xs text-slate-600 mt-1">{doc.description}</p>
                    <p className="text-xs text-slate-500 mt-2 font-mono">{doc.file}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={downloading === doc.id}
                  className="mt-4 w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> {downloading === doc.id ? 'Downloading...' : 'Download'}
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-slate-50 rounded-lg border border-slate-200 py-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No documents in this category</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h4 className="font-semibold text-blue-900 mb-2">📌 About These Documents</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>All documents are available for employee download and reference</li>
            <li>Statutory forms (EA, CP22, etc.) are required for tax filing and compliance</li>
            <li>HR policies outline company guidelines and employee rights</li>
            <li>Contact HR if you have any questions about the documents</li>
            <li>Some documents may require approval from your department head before submission</li>
          </ul>
        </div>

        {/* Access Control Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h4 className="font-semibold text-amber-900 mb-2">🔒 Document Access Control</h4>
          <p className="text-sm text-amber-800 mb-3">Documents are controlled by different departments:</p>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li><strong>Statutory Forms & Certificates:</strong> Controlled by Finance & Payroll</li>
            <li><strong>HR Policies & Procedures:</strong> Controlled by HR Operations</li>
            <li><strong>Contracts & Agreements:</strong> Controlled by Legal & HR</li>
            <li><strong>Benefits & Insurance:</strong> Controlled by Payroll & Finance</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}

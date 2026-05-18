'use client';

import { useState, useEffect, useId } from 'react';
import { Upload, FileText } from 'lucide-react';
import apiClient from '../../lib/api';

const ACCEPT_TYPES =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function validateFiles(fileList) {
  const allowedExt = /\.(pdf|doc|docx|xls|xlsx|csv|txt)$/i;
  const allowedMime = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
  ]);
  const bad = fileList.filter((f) => !allowedExt.test(f.name) && !allowedMime.has(f.type));
  return bad.length ? `Unsupported file(s): ${bad.map((f) => f.name).join(', ')}` : '';
}

export default function JobDescriptionUpload({ onDescriptionLoaded, initialDescription = '' }) {
  const fileInputId = useId();
  const [selectedTab, setSelectedTab] = useState('text'); // 'text' | 'file'
  const [files, setFiles] = useState([]);
  const [manualText, setManualText] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedDetails, setParsedDetails] = useState(null);

  useEffect(() => {
    setManualText(initialDescription || '');
  }, [initialDescription]);

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (!selectedFiles.length) {
      setFiles([]);
      return;
    }
    const msg = validateFiles(selectedFiles);
    if (msg) {
      setError(msg);
      setFiles([]);
      return;
    }
    setFiles(selectedFiles);
    setError('');
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setError('Please select at least one file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (files.length === 1) {
        const formData = new FormData();
        formData.append('file', files[0]);
        response = await apiClient.post('/api/jobs/parse-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        response = await apiClient.post('/api/jobs/parse-files', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const { description, details } = response.data.data;
      setManualText(description);
      setParsedDetails(details);

      if (onDescriptionLoaded) {
        onDescriptionLoaded(description, details);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to parse job description file(s)');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) {
      setError('Please enter job description text');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/jobs/parse-text', {
        text: manualText,
      });

      const { description, details } = response.data.data;
      setManualText(description);
      setParsedDetails(details);

      if (onDescriptionLoaded) {
        onDescriptionLoaded(description, details);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to parse job description');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Job description (JD)</h3>
        <p className="text-sm text-gray-500 mb-4">
          Use one of the two options below: paste plain text or upload file(s). Then run <strong>Parse with AI</strong> to load the JD into this form.
        </p>

        {/* Tabs — only file upload vs plain text */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setSelectedTab('text')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedTab === 'text'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Plain text
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('file')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedTab === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upload file(s)
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Plain text */}
      {selectedTab === 'text' && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste plain text (full JD)
            </label>
            <textarea
              rows={8}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste the job description here..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !manualText.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'AI is analyzing...' : '⚡ Parse with AI'}
          </button>

          <p className="text-xs text-gray-500">
            Paste the complete JD only here (no other input path). AI will extract skills, experience, salary, and other fields.
          </p>
        </form>
      )}

      {/* File upload */}
      {selectedTab === 'file' && (
        <form onSubmit={handleFileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload JD file(s) — PDF, Word, Excel, CSV, or TXT
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition">
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <input
                type="file"
                onChange={handleFileChange}
                accept={ACCEPT_TYPES}
                multiple
                className="hidden"
                id={fileInputId}
              />
              <label htmlFor={fileInputId} className="cursor-pointer">
                <p className="text-blue-600 font-medium hover:underline">Click to upload</p>
                <p className="text-xs text-gray-500 mt-1">or drag and drop — you can select multiple files</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC/DOCX, XLS/XLSX, CSV, TXT (up to 10MB each)</p>
              </label>
              {files.length > 0 && (
                <ul className="text-sm text-green-600 mt-3 text-left max-w-md mx-auto space-y-1">
                  {files.map((f) => (
                    <li key={f.name + f.size}>✓ {f.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !files.length}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'AI is analyzing file(s)...' : '⚡ Parse with AI'}
          </button>

          <p className="text-xs text-gray-500">
            Multiple files are concatenated in order, then parsed once. Supported: PDF, Word, Excel, CSV, plain text.
          </p>
        </form>
      )}

      {/* Parsed Details */}
      {parsedDetails && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-green-600" />
              ✅ AI-Extracted Job Details (auto-filled into form)
            </h4>

            {parsedDetails.title && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 uppercase">Job Title:</p>
                <p className="text-sm text-gray-800 mt-1">{parsedDetails.title}</p>
              </div>
            )}

            {parsedDetails.description && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 uppercase">Description:</p>
                <p className="text-sm text-gray-800 mt-1">{parsedDetails.description}</p>
              </div>
            )}

            {parsedDetails.requiredSkills && parsedDetails.requiredSkills.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 uppercase">Required Skills:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedDetails.requiredSkills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {(parsedDetails.minExperience > 0 || parsedDetails.maxExperience > 0) && (
                <div className="bg-white rounded p-2 border">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Experience</p>
                  <p className="text-sm font-medium text-gray-900">{parsedDetails.minExperience}-{parsedDetails.maxExperience} yrs</p>
                </div>
              )}
              {parsedDetails.department && (
                <div className="bg-white rounded p-2 border">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Department</p>
                  <p className="text-sm font-medium text-gray-900">{parsedDetails.department}</p>
                </div>
              )}
              {parsedDetails.location && (
                <div className="bg-white rounded p-2 border">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Location</p>
                  <p className="text-sm font-medium text-gray-900">{parsedDetails.location}</p>
                </div>
              )}
              {(parsedDetails.salaryMin || parsedDetails.salaryMax) && (
                <div className="bg-white rounded p-2 border">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Salary</p>
                  <p className="text-sm font-medium text-gray-900">${parsedDetails.salaryMin || 0}k - ${parsedDetails.salaryMax || 0}k</p>
                </div>
              )}
            </div>

            {parsedDetails.requirements && parsedDetails.requirements.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 uppercase">Requirements:</p>
                <ul className="text-xs text-gray-600 mt-2 space-y-1">
                  {parsedDetails.requirements.slice(0, 8).map((req, idx) => (
                    <li key={idx} className="text-gray-700">• {req}</li>
                  ))}
                </ul>
              </div>
            )}

            {parsedDetails.responsibilities && parsedDetails.responsibilities.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 uppercase">Responsibilities:</p>
                <ul className="text-xs text-gray-600 mt-2 space-y-1">
                  {parsedDetails.responsibilities.slice(0, 8).map((resp, idx) => (
                    <li key={idx} className="text-gray-700">• {resp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

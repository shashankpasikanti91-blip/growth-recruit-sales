'use client';

import { useState } from 'react';
import { Upload, FileText, ChevronDown } from 'lucide-react';
import apiClient from '../../lib/api';

export default function JobDescriptionUpload({ onDescriptionLoaded, initialDescription = '' }) {
  const [selectedTab, setSelectedTab] = useState('manual'); // 'manual' or 'file'
  const [file, setFile] = useState(null);
  const [manualText, setManualText] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedDetails, setParsedDetails] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(selectedFile.type)) {
        setError('Only PDF and DOCX files are supported');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/api/jobs/parse-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { description, details } = response.data.data;
      setManualText(description);
      setParsedDetails(details);

      if (onDescriptionLoaded) {
        onDescriptionLoaded(description, details);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to parse job description file');
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Description</h3>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setSelectedTab('manual')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedTab === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setSelectedTab('file')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedTab === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upload File
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Manual Entry Tab */}
      {selectedTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste job description text here
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
            Tip: Paste the job description in plain text. AI will extract skills, experience, salary, and all details automatically.
          </p>
        </form>
      )}

      {/* File Upload Tab */}
      {selectedTab === 'file' && (
        <form onSubmit={handleFileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload job description file
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition">
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.docx"
                className="hidden"
                id="fileInput"
              />
              <label htmlFor="fileInput" className="cursor-pointer">
                <p className="text-blue-600 font-medium hover:underline">Click to upload</p>
                <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PDF or DOCX (up to 10MB)</p>
              </label>
              {file && <p className="text-sm text-green-600 mt-2">✓ {file.name}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'AI is analyzing file...' : '⚡ Parse with AI'}
          </button>

          <p className="text-xs text-gray-500">
            Supported formats: PDF, DOCX. File size limit: 10MB
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

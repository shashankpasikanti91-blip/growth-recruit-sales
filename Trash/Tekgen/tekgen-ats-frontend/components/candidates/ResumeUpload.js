'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import apiClient from '../../lib/api';
import { Upload, FileText, AlertTriangle, User, RefreshCw, Eye, X, Loader } from 'lucide-react';

function DuplicateWarningModal({ warning, onUpdate, onView, onCancel }) {
  const { existing, message, duplicateType } = warning;
  const name = `${existing.firstName} ${existing.lastName}`.trim();
  const updatedAt = existing.updatedAt
    ? new Date(existing.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Unknown';
  const typeLabel = duplicateType === 'IC' ? 'IC Number'
    : duplicateType === 'PASSPORT' ? 'Passport Number'
    : duplicateType === 'RESUME_FILE' ? 'Same Resume File'
    : 'Email Address';
  const typeColor = duplicateType === 'IC' ? 'bg-blue-100 text-blue-800'
    : duplicateType === 'PASSPORT' ? 'bg-purple-100 text-purple-800'
    : duplicateType === 'RESUME_FILE' ? 'bg-orange-100 text-orange-800'
    : 'bg-gray-100 text-gray-700';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Candidate Already Exists</h3>
            <p className="text-sm text-gray-500 mt-0.5">{message}</p>
            {duplicateType && (
              <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>
                Matched by: {typeLabel}
              </span>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-1.5">
          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">{name}</span>
            {existing.displayId && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{existing.displayId}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 ml-5">{existing.email}</p>
          {existing.icNumber && <p className="text-xs text-gray-500 ml-5">IC: <span className="font-medium text-gray-700">{existing.icNumber}</span></p>}
          {existing.passportNumber && <p className="text-xs text-gray-500 ml-5">Passport: <span className="font-medium text-gray-700">{existing.passportNumber}</span></p>}
          {existing.nationality && <p className="text-xs text-gray-500 ml-5">Nationality: <span className="font-medium text-gray-700">{existing.nationality}</span></p>}
          <p className="text-xs text-gray-500 ml-5">
            Status: <span className="font-medium text-gray-700">{existing.status}</span>
          </p>
          <p className="text-xs text-gray-500 ml-5">Last updated: {updatedAt}</p>
        </div>

        <p className="text-sm text-gray-600">
          What would you like to do?
        </p>

        <div className="grid gap-2">
          <button
            onClick={onUpdate}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
          >
            <RefreshCw size={16} /> Update existing profile with new resume
          </button>
          <button
            onClick={onView}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-semibold text-sm"
          >
            <Eye size={16} /> View existing candidate profile
          </button>
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm"
          >
            <X size={16} /> Cancel – I&apos;ll check manually
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResumeUpload() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedinUrl: '',
    portfolio: '',
    icNumber: '',
    passportNumber: '',
    nationality: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    sourceChannel: 'MANUAL_UPLOAD',
    address: '',
  });
  const [manualText, setManualText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [autofilled, setAutofilled] = useState(false);
  const [textParsed, setTextParsed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const applyParsedData = (data) => {
    setFormData(prev => ({
      ...prev,
      firstName: data.firstName || prev.firstName,
      lastName: data.lastName || prev.lastName,
      email: data.email || prev.email,
      phone: data.phone || prev.phone,
      nationality: data.nationality || prev.nationality,
      gender: data.gender || prev.gender,
      maritalStatus: data.maritalStatus || prev.maritalStatus,
      // IC, passport, DOB intentionally NOT overwritten — recruiter fills those
    }));
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(selectedFile.type)) {
      setError('Only PDF and DOCX files are supported');
      return;
    }
    setFile(selectedFile);
    setError('');
    setAutofilled(false);

    // Auto-parse to fill form fields
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('resume', selectedFile);
      const res = await apiClient.post('/api/candidates/preview-resume', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      applyParsedData(res.data?.data || res.data || {});
      setAutofilled(true);
    } catch (_) {
      // Silent — user can still fill manually
    } finally {
      setParsing(false);
    }
  };

  const handleParseText = async () => {
    if (!manualText.trim()) return;
    setError('');
    setParsing(true);
    setTextParsed(false);
    try {
      const res = await apiClient.post('/api/candidates/preview-text', { text: manualText });
      applyParsedData(res.data?.data || res.data || {});
      setTextParsed(true);
    } catch (_) {
      setError('Could not extract fields from text. Please fill in manually.');
    } finally {
      setParsing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Auto-decode Malaysian IC number
    if (name === 'icNumber') {
      const cleaned = value.replace(/[^0-9]/g, '');
      let formatted = cleaned;
      if (cleaned.length > 6) formatted = cleaned.substring(0,6) + '-' + cleaned.substring(6);
      if (cleaned.length > 8) formatted = cleaned.substring(0,6) + '-' + cleaned.substring(6,8) + '-' + cleaned.substring(8,12);
      setFormData(prev => {
        const next = { ...prev, icNumber: formatted };
        if (cleaned.length === 12) {
          const yy = parseInt(cleaned.substring(0,2));
          const mm = parseInt(cleaned.substring(2,4));
          const dd = parseInt(cleaned.substring(4,6));
          const year = yy <= 25 ? 2000 + yy : 1900 + yy;
          if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
            next.dob = `${year}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
          }
          const lastDigit = parseInt(cleaned.charAt(11));
          next.gender = lastDigit % 2 === 0 ? 'FEMALE' : 'MALE';
        }
        return next;
      });
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDuplicateWarning(null);

    if (!file) {
      setError('Please select a resume file');
      return;
    }

    setLoading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('resume', file);
      uploadFormData.append('firstName', formData.firstName);
      uploadFormData.append('lastName', formData.lastName);
      uploadFormData.append('email', formData.email);
      uploadFormData.append('phone', formData.phone);
      uploadFormData.append('location', formData.location);
      uploadFormData.append('linkedinUrl', formData.linkedinUrl);
      uploadFormData.append('portfolio', formData.portfolio);
      if (formData.icNumber) uploadFormData.append('icNumber', formData.icNumber);
      if (formData.passportNumber) uploadFormData.append('passportNumber', formData.passportNumber);
      if (formData.nationality) uploadFormData.append('nationality', formData.nationality);
      if (formData.dob) uploadFormData.append('dob', formData.dob);
      if (formData.gender) uploadFormData.append('gender', formData.gender);
      if (formData.maritalStatus) uploadFormData.append('maritalStatus', formData.maritalStatus);
      if (formData.address) uploadFormData.append('address', formData.address);
      uploadFormData.append('sourceChannel', formData.sourceChannel || 'MANUAL_UPLOAD');

      await apiClient.post('/api/candidates/upload-resume', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Resume uploaded successfully! Redirecting to candidates...');
      setTimeout(() => { router.push('/candidates'); }, 1500);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.duplicate) {
        setDuplicateWarning({ existing: err.response.data.existing, message: err.response.data.message, duplicateType: err.response.data.duplicateType, mode: 'file' });
      } else {
        setError(err.response?.data?.message || 'Failed to upload resume');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceUpdateFile = async () => {
    setDuplicateWarning(null);
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('resume', file);
      fd.append('forceUpdate', 'true');
      fd.append('firstName', formData.firstName);
      fd.append('lastName', formData.lastName);
      fd.append('email', formData.email);
      fd.append('phone', formData.phone);
      fd.append('location', formData.location);
      fd.append('linkedinUrl', formData.linkedinUrl);
      fd.append('portfolio', formData.portfolio);
      if (formData.icNumber) fd.append('icNumber', formData.icNumber);
      if (formData.passportNumber) fd.append('passportNumber', formData.passportNumber);
      if (formData.nationality) fd.append('nationality', formData.nationality);
      if (formData.dob) fd.append('dob', formData.dob);
      if (formData.gender) fd.append('gender', formData.gender);
      if (formData.maritalStatus) fd.append('maritalStatus', formData.maritalStatus);
      if (formData.address) fd.append('address', formData.address);
      fd.append('sourceChannel', formData.sourceChannel || 'MANUAL_UPLOAD');
      await apiClient.post('/api/candidates/upload-resume', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Candidate profile updated successfully! Redirecting...');
      setTimeout(() => { router.push('/candidates'); }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDuplicateWarning(null);

    if (!manualText.trim()) {
      setError('Please paste resume text before submitting');
      return;
    }

    // If fields haven't been parsed yet, parse first
    if (!textParsed) {
      await handleParseText();
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/api/candidates/parse-text', {
        text: manualText,
        ...formData,
      });

      setSuccess('Resume text parsed successfully! Redirecting to candidates...');
      setTimeout(() => { router.push('/candidates'); }, 1500);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.duplicate) {
        setDuplicateWarning({ existing: err.response.data.existing, message: err.response.data.message, duplicateType: err.response.data.duplicateType, mode: 'text' });
      } else {
        setError(err.response?.data?.message || 'Failed to parse resume text');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceUpdateText = async () => {
    setDuplicateWarning(null);
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/candidates/parse-text', {
        text: manualText,
        forceUpdate: 'true',
        ...formData,
      });
      setSuccess('Candidate profile updated successfully! Redirecting...');
      setTimeout(() => { router.push('/candidates'); }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update candidate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      {duplicateWarning && (
        <DuplicateWarningModal
          warning={duplicateWarning}
          onUpdate={duplicateWarning.mode === 'file' ? handleForceUpdateFile : handleForceUpdateText}
          onView={() => router.push(`/candidates/${duplicateWarning.existing.id}`)}
          onCancel={() => setDuplicateWarning(null)}
        />
      )}

      {/* LEFT PANEL — File Upload */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Upload Candidate Resume</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded text-sm">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drop zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resume File (PDF or DOCX)</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                parsing ? 'border-blue-300 bg-blue-50' : autofilled ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
              }`}
              onClick={() => !parsing && document.getElementById('file-input')?.click()}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader className="animate-spin text-blue-500" size={32} />
                  <p className="text-blue-700 text-sm font-medium">Extracting fields from resume…</p>
                </div>
              ) : autofilled ? (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-green-700 font-semibold text-sm">✓ Fields extracted from resume</p>
                  <p className="text-green-600 text-xs">{file?.name}</p>
                  <p className="text-gray-400 text-xs mt-1">Click to change file</p>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                  <p className="text-gray-700">{file?.name || 'Click to upload or drag and drop'}</p>
                  <p className="text-xs text-gray-400 mt-1">PDF or DOCX — fields will be auto-filled</p>
                </>
              )}
              <input id="file-input" type="file" onChange={handleFileChange} accept=".pdf,.docx" className="hidden" />
            </div>
          </div>

          {/* Auto-filled notice */}
          {autofilled && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <span className="font-bold mt-0.5">ℹ</span>
              <span>Name, email, phone, nationality and gender were extracted from the resume. <strong>IC / Passport / Date of Birth must be filled by the recruiter</strong> as these are typically not in the resume.</span>
            </div>
          )}

          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="John" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Doe" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="john@example.com" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+60 12-345 6789" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Kuala Lumpur, MY" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
            <input type="url" name="linkedinUrl" value={formData.linkedinUrl} onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://linkedin.com/in/johndoe" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio URL</label>
            <input type="url" name="portfolio" value={formData.portfolio} onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://portfolio.example.com" />
          </div>

          {/* Identity — recruiter fills manually */}
          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded text-xs flex items-center justify-center font-bold">ID</span>
              Identity &amp; Personal Details
            </h3>
            <p className="text-xs text-gray-400 mb-4">IC / Passport / DOB are usually not in the resume — please fill in manually.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  IC Number <span className="text-gray-400">(Malaysian)</span>
                </label>
                <input type="text" name="icNumber" value={formData.icNumber} onChange={handleInputChange}
                  placeholder="901231-10-5678" maxLength={14}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-0.5">Auto-fills DOB &amp; Gender</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Passport No. <span className="text-gray-400">(Expat)</span>
                </label>
                <input type="text" name="passportNumber" value={formData.passportNumber} onChange={handleInputChange}
                  placeholder="A12345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nationality</label>
                <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange}
                  placeholder="Malaysian"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Marital Status</label>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select status</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </div>
            </div>

            {/* Full Address — recruiter fills manually */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Address <span className="text-gray-400">(optional — recruiter fills)</span>
              </label>
              <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2}
                placeholder="e.g. No. 12, Jalan Bukit Bintang, 50450 Kuala Lumpur"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <p className="text-xs text-gray-400 mt-0.5">City/town is auto-detected from resume. Enter full street address here if needed.</p>
            </div>
          </div>

          {/* Source Channel */}
          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-green-100 text-green-700 rounded text-xs flex items-center justify-center font-bold">S</span>
              Source Channel
            </h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Where was this candidate sourced from?</label>
              <select name="sourceChannel" value={formData.sourceChannel} onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="MANUAL_UPLOAD">Manual Upload / Direct</option>
                <option value="JOB_PORTAL_MONSTER">Job Portal — Monster</option>
                <option value="JOB_PORTAL_NAUKRI">Job Portal — Naukri</option>
                <option value="JOB_PORTAL_JOBSTREET">Job Portal — JobStreet</option>
                <option value="JOB_PORTAL_FUTUREJOBS">Job Portal — Future Jobs</option>
                <option value="JOB_PORTAL_OTHERS">Job Portal — Others</option>
                <option value="REFERRAL">Referral</option>
                <option value="LINKEDIN">LinkedIn</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading || !file || parsing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:opacity-50">
            {loading ? 'Uploading…' : parsing ? 'Extracting fields…' : 'Upload Resume & Create Candidate'}
          </button>
        </form>
      </div>

      {/* RIGHT PANEL — Paste Text */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-2">Paste Resume Text</h2>
        <p className="text-sm text-gray-500 mb-6">Paste the text → click Extract to auto-fill fields → review → create.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resume Text</label>
            <textarea rows={10} value={manualText}
              onChange={(e) => { setManualText(e.target.value); setTextParsed(false); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Paste the full resume text here…" />
          </div>

          {/* Step 1: Extract */}
          {!textParsed ? (
            <button type="button" onClick={handleParseText}
              disabled={parsing || !manualText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
              {parsing ? <><Loader size={16} className="animate-spin" /> Extracting fields…</> : '⚡ Step 1: Extract Fields from Text'}
            </button>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                <span className="font-bold mt-0.5">✓</span>
                <span>Fields extracted. Review below and fill in IC / Passport / DOB, then click Create.</span>
              </div>

              {/* Identity fields for text panel too */}
              <div className="border border-orange-100 bg-orange-50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-orange-800 flex items-center gap-1">
                  <span>ID</span> Fill in manually (not in resume)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">IC Number</label>
                    <input type="text" name="icNumber" value={formData.icNumber} onChange={handleInputChange}
                      placeholder="901231-10-5678" maxLength={14}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-xs text-gray-400 mt-0.5">Auto-fills DOB &amp; Gender</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Passport No.</label>
                    <input type="text" name="passportNumber" value={formData.passportNumber} onChange={handleInputChange}
                      placeholder="A12345678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nationality</label>
                    <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange}
                      placeholder="Malaysian"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Marital Status</label>
                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select status</option>
                      <option value="SINGLE">Single</option>
                      <option value="MARRIED">Married</option>
                      <option value="DIVORCED">Divorced</option>
                      <option value="WIDOWED">Widowed</option>
                    </select>
                  </div>
                </div>
              </div>

              <form onSubmit={handleManualSubmit}>
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50">
                  {loading ? 'Creating…' : '✓ Step 2: Create Candidate'}
                </button>
              </form>
            </>
          )}

          <p className="text-xs text-gray-400">All fields are optional except the resume text. You can fill in missing details later from the candidate profile.</p>
        </div>
      </div>
    </div>
  );
}

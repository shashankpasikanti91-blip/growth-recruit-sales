import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AlertCircle, CheckCircle, Clock, Upload, X } from 'lucide-react';
import axios from 'axios';

export default function OvertimeSubmission() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    claimDate: '',
    hoursWorked: '',
    overtimeType: 'STANDARD',
    description: '',
    attachments: []
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [displayId, setDisplayId] = useState('');
  const [filePreview, setFilePreview] = useState([]);

  // Overtime type options
  const overtimeTypes = [
    { value: 'STANDARD', label: 'Standard Overtime (1.5x)', description: 'Weekday overtime' },
    { value: 'DOUBLE_TIME', label: 'Double Time (2x)', description: 'Weekend or holiday overtime' },
    { value: 'WEEKEND', label: 'Weekend (2x)', description: 'Saturday/Sunday work' },
    { value: 'HOLIDAY', label: 'Holiday (2.5x)', description: 'Public holiday work' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.claimDate) {
      newErrors.claimDate = 'Date is required';
    }

    if (!formData.hoursWorked || formData.hoursWorked <= 0) {
      newErrors.hoursWorked = 'Hours must be greater than 0';
    }

    if (formData.hoursWorked > 12) {
      newErrors.hoursWorked = 'Cannot claim more than 12 hours in a single day';
    }

    if (!formData.overtimeType) {
      newErrors.overtimeType = 'Overtime type is required';
    }

    if (!formData.description || formData.description.trim().length === 0) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (files.length + formData.attachments.length > maxFiles) {
      setErrors(prev => ({
        ...prev,
        attachments: `Maximum ${maxFiles} files allowed`
      }));
      return;
    }

    const validFiles = [];
    files.forEach(file => {
      if (file.size > maxSize) {
        setErrors(prev => ({
          ...prev,
          attachments: `File ${file.name} exceeds 10MB limit`
        }));
      } else {
        validFiles.push(file);
      }
    });

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles]
    }));

    setFilePreview(prev => [
      ...prev,
      ...validFiles.map(f => ({
        name: f.name,
        size: (f.size / 1024 / 1024).toFixed(2)
      }))
    ]);
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
    setFilePreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      const submitData = new FormData();
      submitData.append('claimDate', formData.claimDate);
      submitData.append('hoursWorked', parseFloat(formData.hoursWorked));
      submitData.append('overtimeType', formData.overtimeType);
      submitData.append('description', formData.description);

      // Add attachments
      formData.attachments.forEach((file, index) => {
        submitData.append(`attachments`, file);
      });

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/claims`,
        submitData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setDisplayId(response.data.data.displayId);
        setSubmitted(true);
        setFormData({
          claimDate: '',
          hoursWorked: '',
          overtimeType: 'STANDARD',
          description: '',
          attachments: []
        });
        setFilePreview([]);
      }
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || 'Failed to submit overtime claim. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Overtime Claimed!</h2>
            <p className="text-gray-600 mb-4">
              Your overtime claim has been successfully submitted for approval.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">Claim ID</p>
              <p className="text-xl font-bold text-blue-600">{displayId}</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Please track your claim status in the <strong>My Overtime</strong> page.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/workspace/overtime')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700"
              >
                View My Claims
              </button>
              <button
                onClick={() => setSubmitted(false)}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300"
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-600" />
              Overtime Claim
            </h1>
            <p className="text-gray-600 mt-2">
              Submit your overtime hours for approval and payroll processing
            </p>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Overtime *
              </label>
              <input
                type="date"
                value={formData.claimDate}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, claimDate: e.target.value }));
                  setErrors(prev => ({ ...prev, claimDate: '' }));
                }}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.claimDate
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.claimDate && (
                <p className="text-red-600 text-sm mt-1">{errors.claimDate}</p>
              )}
            </div>

            {/* Hours Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hours Worked *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={formData.hoursWorked}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, hoursWorked: e.target.value }));
                  setErrors(prev => ({ ...prev, hoursWorked: '' }));
                }}
                placeholder="Enter hours (e.g., 2.5)"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.hoursWorked
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.hoursWorked && (
                <p className="text-red-600 text-sm mt-1">{errors.hoursWorked}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">Maximum 12 hours per claim</p>
            </div>

            {/* Overtime Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Overtime Type *
              </label>
              <div className="space-y-3">
                {overtimeTypes.map(type => (
                  <label key={type.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50"
                    style={{
                      borderColor: formData.overtimeType === type.value ? '#2563eb' : '#e5e7eb',
                      backgroundColor: formData.overtimeType === type.value ? '#eff6ff' : '#fff'
                    }}
                  >
                    <input
                      type="radio"
                      name="overtimeType"
                      value={type.value}
                      checked={formData.overtimeType === type.value}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, overtimeType: e.target.value }));
                        setErrors(prev => ({ ...prev, overtimeType: '' }));
                      }}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{type.label}</p>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.overtimeType && (
                <p className="text-red-600 text-sm mt-1">{errors.overtimeType}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description/Reason *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, description: e.target.value }));
                  setErrors(prev => ({ ...prev, description: '' }));
                }}
                placeholder="Explain why overtime was required..."
                rows="4"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.description
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.description && (
                <p className="text-red-600 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supporting Documents
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer transition">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Click to upload files</p>
                  <p className="text-gray-500 text-sm">or drag and drop</p>
                  <p className="text-gray-500 text-xs mt-2">
                    Max 5 files, 10MB each (PDF, DOC, XLS, images)
                  </p>
                </label>
              </div>

              {filePreview.length > 0 && (
                <div className="mt-4 space-y-2">
                  {filePreview.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.size} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Overtime Claim'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

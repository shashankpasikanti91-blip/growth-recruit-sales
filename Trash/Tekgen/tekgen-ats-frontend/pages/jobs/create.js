/**
 * Job Create/Edit Page
 * Form for creating and editing job positions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import JobDescriptionUpload from '../../components/jobs/JobDescriptionUpload';
import api from '../../lib/api';
import { useRole } from '../../lib/useRole';

export default function JobFormPage() {
  const router = useRouter();
  const { id } = router.query;
  const isEdit = !!id;
  const { isAdmin, isSalesRole, user } = useRole();

  // Redirect non-sales/non-admin users away from create/edit
  useEffect(() => {
    if (user && !isAdmin && !isSalesRole) {
      router.replace('/jobs');
    }
  }, [user, isAdmin, isSalesRole]);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [skills, setSkills] = useState(['']);
  const [teamMembers, setTeamMembers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientName: '',
    contractType: 'PERMANENT',
    department: '',
    location: '',
    minExperience: 0,
    maxExperience: 0,
    salaryMin: 0,
    salaryMax: 0,
    headcount: 1,
    candidateType: 'ANY',
    assignedRecruiters: [],
  });

  useEffect(() => {
    fetchTeamMembers();
    if (isEdit && id) {
      fetchJob();
    }
  }, [id]);

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/api/jobs/team-members');
      const users = res.data.data?.users || res.data.data || [];
      setTeamMembers(Array.isArray(users) ? users : []);
    } catch (_) {}
  };

  const fetchJob = async () => {
    try {
      const response = await api.get(`/api/jobs/${id}`);
      const job = response.data.data;
      setFormData({
        title: job.title,
        description: job.description,
        clientName: job.clientName || '',
        contractType: job.contractType || 'PERMANENT',
        department: job.department || '',
        location: job.location || '',
        minExperience: job.minExperience || 0,
        maxExperience: job.maxExperience || 0,
        salaryMin: job.salaryMin || 0,
        salaryMax: job.salaryMax || 0,
        headcount: job.headcount || 1,
        candidateType: job.candidateType || 'ANY',
        assignedRecruiters: job.assignedRecruiters || [],
      });
      setSkills(job.requiredSkills || ['']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(value) ? value : Number(value),
    }));
  };

  const toggleRecruiter = (userId) => {
    setFormData(prev => ({
      ...prev,
      assignedRecruiters: prev.assignedRecruiters.includes(userId)
        ? prev.assignedRecruiters.filter(id => id !== userId)
        : [...prev.assignedRecruiters, userId],
    }));
  };

  const handleSkillChange = (index, value) => {
    const newSkills = [...skills];
    newSkills[index] = value;
    setSkills(newSkills);
  };

  const addSkill = () => {
    setSkills([...skills, '']);
  };

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');

      if (!formData.clientName || !formData.clientName.trim()) {
        setError('Client name is required');
        setSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        requiredSkills: skills.filter(s => s.trim() !== ''),
      };

      if (isEdit) {
        await api.put(`/api/jobs/${id}`, payload);
      } else {
        await api.post('/api/jobs', payload);
      }

      router.push('/jobs');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save job');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Job' : 'Create New Job'}
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Job Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="e.g., Senior Software Engineer"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Client Name — REQUIRED */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Client Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              required
              placeholder="e.g., Acme Corporation"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">The company this JD is being hired for (mandatory)</p>
          </div>

          {/* Contract Type */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Contract Type <span className="text-red-500">*</span></label>
            <select
              name="contractType"
              value={formData.contractType}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PERMANENT">Permanent</option>
              <option value="CONTRACT">Contract</option>
              <option value="FREELANCE">Freelance</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>

          {/* Job Description Upload Component */}
          <JobDescriptionUpload
            initialDescription={formData.description}
            onDescriptionLoaded={(description, details) => {
              setFormData(prev => ({
                ...prev,
                description,
                // Auto-fill title if empty and AI extracted one
                title: prev.title || details?.title || prev.title,
                // Auto-fill experience from AI parsing
                minExperience: details?.minExperience || prev.minExperience,
                maxExperience: details?.maxExperience || prev.maxExperience,
                // Auto-fill salary from AI parsing
                salaryMin: details?.salaryMin || prev.salaryMin,
                salaryMax: details?.salaryMax || prev.salaryMax,
                // Auto-fill department and location
                department: details?.department || prev.department,
                location: details?.location || prev.location,
              }));
              // Auto-populate skills from AI-extracted required skills
              if (details && details.requiredSkills && details.requiredSkills.length > 0) {
                setSkills(details.requiredSkills.slice(0, 15));
              }
            }}
          />

          {/* Show parsed description preview */}
          {formData.description && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Parsed Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          {/* Location & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., San Francisco, CA"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
          </div>

          {/* Experience */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Min Experience (years)</label>
              <input
                type="number"
                name="minExperience"
                value={formData.minExperience}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Max Experience (years)</label>
              <input
                type="number"
                name="maxExperience"
                value={formData.maxExperience}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Min Salary ($k)</label>
              <input
                type="number"
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleInputChange}
                min="0"
                placeholder="120"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Max Salary ($k)</label>
              <input
                type="number"
                name="salaryMax"
                value={formData.salaryMax}
                onChange={handleInputChange}
                min="0"
                placeholder="180"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Headcount & Candidate Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Headcount (# of positions)</label>
              <input
                type="number"
                name="headcount"
                value={formData.headcount}
                onChange={handleInputChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Candidate Type</label>
              <select
                name="candidateType"
                value={formData.candidateType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ANY">Any</option>
                <option value="LOCAL">Local Only</option>
                <option value="EXPAT">Expat in Malaysia</option>
                <option value="FOREIGNER_RELOCATE">Foreigner (Willing to Relocate)</option>
              </select>
            </div>
          </div>

          {/* Assign Recruiters */}
          {teamMembers.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Assign Recruiters</label>
              <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                {teamMembers.map(u => {
                  const selected = formData.assignedRecruiters.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleRecruiter(u.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {u.firstName} {u.lastName}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">{formData.assignedRecruiters.length} recruiter(s) selected</p>
            </div>
          )}

          {/* Required Skills */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Required Skills</label>
            <div className="space-y-2 mb-3">
              {skills.map((skill, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => handleSkillChange(index, e.target.value)}
                    placeholder={`Skill ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {skills.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              Add Skill
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              {submitting ? 'Saving...' : isEdit ? 'Update Job' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

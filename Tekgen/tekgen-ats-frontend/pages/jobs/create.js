/**
 * Job Create/Edit Page
 * Form for creating and editing job positions
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import JobDescriptionUpload from '../../components/jobs/JobDescriptionUpload';
import api from '../../lib/api';
import { useRole } from '../../lib/useRole';

function todayISODateLocal() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export default function JobFormPage() {
  const router = useRouter();
  const { id } = router.query;
  const isEdit = !!id;
  const { canManageClientJobs, user } = useRole();

  useEffect(() => {
    if (user && !canManageClientJobs) {
      router.replace('/jobs');
    }
  }, [user, canManageClientJobs, router]);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [jdIngested, setJdIngested] = useState(isEdit);
  const [skills, setSkills] = useState(['']);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientName: '',
    clientId: '',
    contractType: 'PERMANENT',
    contractDuration: '',
    department: '',
    location: '',
    minExperience: 0,
    maxExperience: 0,
    salaryMin: 0,
    salaryMax: 0,
    salaryCurrency: 'MYR',
    headcount: 1,
    slaTargetDays: 30,
    targetSubmissionDate: '',
    jobReceivedDate: todayISODateLocal(),
    targetCvSubmissions: '',
    shareJdWithClient: false,
    candidateType: 'ANY',
    priority: 'MEDIUM',
    assignedRecruiters: [],
    salesOwnerId: '',
  });
  const [clientMeta, setClientMeta] = useState({ accountManagerName: '', defaultRecruiterCount: 0 });

  useEffect(() => {
    fetchTeamMembers();
    const loadClients = async () => {
      try {
        const res = await api.get('/api/sales/clients?limit=300&page=1');
        const list = res.data.data?.clients || [];
        setClients(Array.isArray(list) ? list : []);
      } catch (_) {
        setClients([]);
      }
    };
    loadClients();
    if (isEdit && id) {
      fetchJob();
    }
  }, [id, isEdit]);

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/api/jobs/team-members');
      const users = res.data.data?.users || res.data.data || [];
      setTeamMembers(Array.isArray(users) ? users : []);
    } catch (_) {}
  };

  const hydrateClientForJob = useCallback(
    async (clientId, opts = { fillRecruitersIfEmpty: true, keepSalesOwner: false }) => {
      const row = clients.find((x) => x.id === clientId);
      if (!clientId) {
        setFormData((prev) => ({ ...prev, clientId: '', clientName: '', salesOwnerId: '' }));
        setClientMeta({ accountManagerName: '', defaultRecruiterCount: 0 });
        return;
      }
      try {
        const res = await api.get(`/api/clients/${clientId}`);
        const full = res.data.data;
        setClientMeta({
          accountManagerName: full.owner ? `${full.owner.firstName} ${full.owner.lastName}` : '',
          defaultRecruiterCount: full.defaultRecruiters?.length || 0,
        });
        setFormData((prev) => {
          const patch = {
            ...prev,
            clientId,
            clientName: row?.clientName || full.clientName || '',
            salesOwnerId: opts.keepSalesOwner
              ? prev.salesOwnerId || full.owner?.id || ''
              : full.owner?.id || '',
          };
          if (
            opts.fillRecruitersIfEmpty &&
            prev.assignedRecruiters.length === 0 &&
            full.defaultRecruiters?.length
          ) {
            patch.assignedRecruiters = [...full.defaultRecruiters];
          }
          return patch;
        });
      } catch (_) {
        setClientMeta({ accountManagerName: '', defaultRecruiterCount: 0 });
        setFormData((prev) => ({
          ...prev,
          clientId,
          clientName: row?.clientName || prev.clientName,
        }));
      }
    },
    [clients]
  );

  const fetchJob = async () => {
    try {
      const response = await api.get(`/api/jobs/${id}`);
      const job = response.data.data;
      setFormData({
        title: job.title,
        description: job.description,
        clientName: job.clientName || '',
        clientId: job.clientId || '',
        contractType: job.contractType || 'PERMANENT',
        contractDuration: job.contractDuration || '',
        department: job.department || '',
        location: job.location || '',
        minExperience: job.minExperience || 0,
        maxExperience: job.maxExperience || 0,
        salaryMin: job.salaryMin || 0,
        salaryMax: job.salaryMax || 0,
        salaryCurrency: job.salaryCurrency || 'MYR',
        headcount: job.headcount || 1,
        slaTargetDays: job.slaTargetDays ?? 30,
        targetSubmissionDate: job.targetSubmissionDate
          ? String(job.targetSubmissionDate).slice(0, 10)
          : '',
        jobReceivedDate: job.jobReceivedDate
          ? String(job.jobReceivedDate).slice(0, 10)
          : '',
        targetCvSubmissions: job.targetCvSubmissions ?? '',
        shareJdWithClient: !!job.shareJdWithClient,
        candidateType: job.candidateType || 'ANY',
        priority: job.priority || 'MEDIUM',
        assignedRecruiters: job.assignedRecruiters || [],
        salesOwnerId: job.salesOwnerId || '',
      });
      setSkills(job.requiredSkills || ['']);
      setJdIngested(true);
      if (job.clientId) {
        try {
          const cr = await api.get(`/api/clients/${job.clientId}`);
          const full = cr.data.data;
          setClientMeta({
            accountManagerName: full.owner ? `${full.owner.firstName} ${full.owner.lastName}` : '',
            defaultRecruiterCount: full.defaultRecruiters?.length || 0,
          });
        } catch (_) {
          setClientMeta({ accountManagerName: '', defaultRecruiterCount: 0 });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    const numericFields = new Set([
      'minExperience',
      'maxExperience',
      'salaryMin',
      'salaryMax',
      'headcount',
      'slaTargetDays',
      'targetCvSubmissions',
    ]);
    if (numericFields.has(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? '' : Number(value),
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const recruiterPool = useMemo(
    () =>
      teamMembers.filter((u) =>
        ['RECRUITER', 'RECRUITMENT_MANAGER'].includes(u.role)
      ),
    [teamMembers]
  );

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

      const selectedClient = clients.find((c) => c.id === formData.clientId);
      if (!formData.clientId) {
        setError('Select a client. Each JD must be linked to a client record (one client can have many JDs). Add clients under Clients if the list is empty.');
        setSubmitting(false);
        return;
      }
      const resolvedClientName = (selectedClient?.clientName || formData.clientName || '').trim();
      if (!resolvedClientName) {
        setError('Could not resolve client name. Pick the client again or refresh the page.');
        setSubmitting(false);
        return;
      }

      if (!formData.jobReceivedDate || !formData.targetSubmissionDate) {
        setError(
          'JD received date and target submission date are required for every client-linked requirement.'
        );
        setSubmitting(false);
        return;
      }

      if (!isEdit && !jdIngested) {
        setError('Add the JD using Plain text or Upload file, then click Parse with AI before saving.');
        setSubmitting(false);
        return;
      }

      if (!isEdit && !(formData.description && String(formData.description).trim())) {
        setError('Job description is missing. Parse the JD from plain text or file first.');
        setSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        clientName: resolvedClientName,
        salesOwnerId: formData.salesOwnerId || null,
        targetCvSubmissions:
          formData.targetCvSubmissions === '' || formData.targetCvSubmissions == null
            ? null
            : Number(formData.targetCvSubmissions),
        targetSubmissionDate: formData.targetSubmissionDate || null,
        jobReceivedDate: formData.jobReceivedDate || null,
        priority: formData.priority || 'MEDIUM',
        slaTargetDays: formData.slaTargetDays === '' ? 30 : Number(formData.slaTargetDays),
        requiredSkills: skills.filter((s) => s.trim() !== ''),
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
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mt-1"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Edit client requirement' : 'New client requirement'}
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Sales and recruitment: pick a CRM client (each client already has a Tekgen CRM displayId; new clients get one when created under Clients).{' '}
              This form creates a <strong>single</strong> requirement with a Tekgen job <span className="font-mono text-xs">TKG-J-…</span> id when you save.
              Add the JD from file or plain text, set received/target dates, then save. For many rows from a bank Excel, use{' '}
              <Link href="/jobs/bulk-import" className="text-blue-600 hover:text-blue-800 font-medium">Bulk hiring (Excel)</Link>.
            </p>
          </div>
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

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.clientId}
              onChange={(e) => {
                const cid = e.target.value;
                hydrateClientForJob(cid, { fillRecruitersIfEmpty: true, keepSalesOwner: false });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                  {c.displayId ? ` · ${c.displayId}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Required: every JD is stored under a client. One client can have many JDs.
              {clientMeta.accountManagerName && (
                <span className="block text-slate-600 mt-1">
                  Account manager (sales owner on this JD): <strong>{clientMeta.accountManagerName}</strong>
                  {clientMeta.defaultRecruiterCount > 0 &&
                    ` · ${clientMeta.defaultRecruiterCount} default recruiter(s) from client — applied when assignment is empty.`}
                </span>
              )}
              {clients.length === 0 && (
                <span className="block text-amber-700 mt-1">
                  No clients in CRM yet — add a client first, then return here.
                </span>
              )}
            </p>
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

          {(formData.contractType === 'CONTRACT' || formData.contractType === 'INTERNSHIP') && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Duration</label>
              <input
                type="text"
                name="contractDuration"
                value={formData.contractDuration}
                onChange={handleInputChange}
                placeholder="e.g. 6 months, 12 months extensions"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Job Description Upload Component */}
          <JobDescriptionUpload
            initialDescription={formData.description}
            onDescriptionLoaded={(description, details) => {
              setJdIngested(true);
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

          {/* JD text after parse — refine only; add new content via Plain text / Upload above */}
          {formData.description && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Job description (after parse — you can edit)
              </label>
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Currency</label>
              <select
                name="salaryCurrency"
                value={formData.salaryCurrency}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MYR">MYR</option>
                <option value="SGD">SGD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Min salary (monthly)</label>
              <input
                type="number"
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleInputChange}
                min="0"
                placeholder="8000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Max salary (monthly)</label>
              <input
                type="number"
                name="salaryMax"
                value={formData.salaryMax}
                onChange={handleInputChange}
                min="0"
                placeholder="12000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Headcount & Candidate Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Open roles (headcount)</label>
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
              <label className="block text-sm font-semibold text-gray-900 mb-2">Candidate type</label>
              <select
                name="candidateType"
                value={formData.candidateType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ANY">Any</option>
                <option value="LOCAL">Local</option>
                <option value="EXPAT">Expat in Malaysia</option>
                <option value="FOREIGNER_RELOCATE">Foreigner (willing to relocate)</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4 space-y-4">
            <h3 className="text-sm font-bold text-violet-900 uppercase tracking-wide">Delivery & timeline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  JD received date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="jobReceivedDate"
                  value={formData.jobReceivedDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">When the client JD landed (mandatory for client-linked reqs).</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">HIGH appears in recruitment & sales priority alerts.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Target CV submissions</label>
                <input
                  type="number"
                  name="targetCvSubmissions"
                  value={formData.targetCvSubmissions}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="e.g. 5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">How many profiles to submit for this JD (optional).</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Internal SLA (days)</label>
                <input
                  type="number"
                  name="slaTargetDays"
                  value={formData.slaTargetDays}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Target submission date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="targetSubmissionDate"
                  value={formData.targetSubmissionDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                name="shareJdWithClient"
                checked={formData.shareJdWithClient}
                onChange={handleInputChange}
                className="rounded border-gray-300"
              />
              OK to share this JD text with the client (optional)
            </label>
          </div>

          {recruiterPool.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Assign recruiters (optional — multi-select)
              </label>
              <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                {recruiterPool.map((u) => {
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
              <p className="text-xs text-gray-400 mt-1">
                {formData.assignedRecruiters.length} selected — they see this JD first in recruitment. Screening maps candidates to the selected job.
              </p>
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

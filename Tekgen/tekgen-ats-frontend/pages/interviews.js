/**
 * Interview Scheduling Page
 * Schedule and manage interviews with candidates
 */

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Plus, Trash2, Link2 } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../lib/api';

export default function InterviewSchedulingPage() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [formData, setFormData] = useState({
    candidateId: '',
    candidateEmail: '',
    candidateName: '',
    jobTitle: '',
    interviewDate: '',
    time: '',
    interviewType: 'phone',
    location: '',
    meetLink: '',
    notes: '',
    sendCalendarInvite: true,
    notifyTeamsChannel: true,
    sendWhatsApp: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [intResponse, candResponse] = await Promise.allSettled([
        api.get('/api/analytics/interview/list'),
        api.get('/api/candidates?status=INTERVIEW&limit=100'),
      ]);
      if (intResponse.status === 'fulfilled' && intResponse.value?.data?.data) {
        setInterviews(intResponse.value.data.data || []);
      }
      if (candResponse.status === 'fulfilled') {
        const cd = candResponse.value?.data?.data;
        setCandidates(Array.isArray(cd) ? cd : (cd?.candidates || []));
      }
    } catch (err) {
      // interviews may simply be empty
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCandidateSelect = (e) => {
    const candidate = candidates.find(c => c.id === e.target.value);
    if (candidate) {
      setFormData(prev => ({
        ...prev,
        candidateId: candidate.id,
        candidateEmail: candidate.email,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        jobTitle: prev.jobTitle || candidate.latestScreenedJobTitle || candidate.applyingForRole || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        candidateId: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const res = await api.post('/api/analytics/interview/schedule-with-tracking', formData);
      const warnings = res.data.data?.integrations?.warnings || [];
      if (warnings.length) {
        setInfo(`Scheduled. Notes: ${warnings.join(' ')}`);
      } else {
        setInfo('Interview scheduled. Calendar / Teams steps completed where integrations are configured.');
      }
      setFormData({
        candidateId: '',
        candidateEmail: '',
        candidateName: '',
        jobTitle: '',
        interviewDate: '',
        time: '',
        interviewType: 'phone',
        location: '',
        meetLink: '',
        notes: '',
        sendCalendarInvite: true,
        notifyTeamsChannel: true,
        sendWhatsApp: false,
      });
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule interview');
    }
  };

  const handleDelete = async (interviewId) => {
    if (window.confirm('Delete this interview?')) {
      try {
        await api.delete(`/api/analytics/interview/${interviewId}`);
        setInterviews(interviews.filter(i => i.id !== interviewId));
      } catch (err) {
        setError('Failed to delete interview');
      }
    }
  };

  const getInterviewTypeColor = (type) => {
    switch (type) {
      case 'phone':
        return 'bg-blue-100 text-blue-800';
      case 'video':
        return 'bg-purple-100 text-purple-800';
      case 'in-person':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const upcomingInterviews = (interviews || [])
    .filter(i => new Date(i.interviewDate) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate));

  const pastInterviews = (interviews || [])
    .filter(i => new Date(i.interviewDate) < new Date(new Date().toDateString()))
    .sort((a, b) => new Date(b.interviewDate) - new Date(a.interviewDate));

  return (
    <DashboardLayout title="Recruitment › Interviews">
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Scheduling</h1>
            <p className="text-gray-600 mt-1">
              Schedule interviews, send Outlook calendar invites (.ics), and notify your Teams channel when integrations are connected.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Schedule Interview
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm">
            {info}
          </div>
        )}

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Schedule New Interview</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Select Candidate</label>
                  <select
                    value={formData.candidateId}
                    onChange={handleCandidateSelect}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose candidate...</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} — {c.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Role / Job title</label>
                  <input
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleInputChange}
                    placeholder="e.g. Senior Developer"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Interview Type</label>
                  <select
                    name="interviewType"
                    value={formData.interviewType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="phone">Phone</option>
                    <option value="video">Video</option>
                    <option value="in-person">In-Person</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Date</label>
                  <input
                    type="date"
                    name="interviewDate"
                    value={formData.interviewDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Time</label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {formData.interviewType === 'video' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Meeting link (Teams / Zoom / Meet)</label>
                  <input
                    type="url"
                    name="meetLink"
                    value={formData.meetLink}
                    onChange={handleInputChange}
                    placeholder="https://teams.microsoft.com/... or https://zoom.us/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {formData.interviewType === 'in-person' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Office address or meeting room"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Interview panel, focus areas, etc."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="border border-gray-100 rounded-lg p-4 space-y-2 bg-gray-50">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Integrations</p>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" name="sendCalendarInvite" checked={formData.sendCalendarInvite} onChange={handleInputChange} />
                  Email calendar invite (.ics) to candidate via Outlook SMTP
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" name="notifyTeamsChannel" checked={formData.notifyTeamsChannel} onChange={handleInputChange} />
                  Post summary to Teams (incoming webhook)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" name="sendWhatsApp" checked={formData.sendWhatsApp} onChange={handleInputChange} />
                  WhatsApp candidate (requires Cloud API + phone on candidate profile)
                </label>
                <p className="text-xs text-gray-500 pt-1">
                  Configure Outlook, Teams, and WhatsApp under <strong>Integrations</strong>. Warnings appear after save if something is not connected.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Schedule Interview
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Interviews ({upcomingInterviews.length})</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : upcomingInterviews.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-600">
              No upcoming interviews scheduled
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingInterviews.map((interview) => (
                <div key={interview.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={18} className="text-gray-600 flex-shrink-0" />
                        <h3 className="text-lg font-bold text-gray-900 truncate">{interview.candidateName}</h3>
                      </div>
                      {interview.jobTitle && (
                        <p className="text-sm text-gray-600 mb-1">{interview.jobTitle}</p>
                      )}
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getInterviewTypeColor(interview.interviewType)}`}>
                        {(interview.interviewType || interview.type || '').toUpperCase()}
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-gray-500">
                        {interview.icsSentAt && <span className="bg-green-50 text-green-800 px-2 py-0.5 rounded">ICS sent</span>}
                        {interview.teamsNotifiedAt && <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded">Teams</span>}
                        {interview.whatsappNotifiedAt && <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">WhatsApp</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(interview.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                      aria-label="Delete interview"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-start gap-2">
                      <Calendar size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Date</p>
                        <p className="text-sm text-gray-900">
                          {new Date(interview.interviewDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Time</p>
                        <p className="text-sm text-gray-900">{interview.time || interview.interviewTime}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600 font-semibold">Location / link</p>
                        <p className="text-sm text-gray-900 break-all">
                          {interview.location || interview.meetLink || 'TBD'}
                        </p>
                        {interview.meetLink && (
                          <a href={interview.meetLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <Link2 size={12} /> Open link
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {interview.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                      {interview.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {pastInterviews.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Past Interviews ({pastInterviews.length})</h2>
            <div className="space-y-3">
              {pastInterviews.slice(0, 8).map((interview) => (
                <div key={interview.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{interview.candidateName}</p>
                      {interview.jobTitle && <p className="text-xs text-gray-500">{interview.jobTitle}</p>}
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(interview.interviewDate).toLocaleDateString()} at {interview.time || interview.interviewTime}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${getInterviewTypeColor(interview.interviewType)}`}>
                      {interview.interviewType || interview.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

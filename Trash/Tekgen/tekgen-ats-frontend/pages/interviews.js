/**
 * Interview Scheduling Page
 * Schedule and manage interviews with candidates
 */

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Plus, Trash2, Eye } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../lib/api';

export default function InterviewSchedulingPage() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [formData, setFormData] = useState({
    candidateEmail: '',
    candidateName: '',
    interviewDate: '',
    time: '',
    interviewType: 'phone',
    location: '',
    meetLink: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch candidates for dropdown - interviews endpoint may not exist yet
      const [intResponse, candResponse] = await Promise.allSettled([
        api.get('/api/analytics/interview/list').catch(() => null),
        api.get('/api/candidates?limit=100'),
      ]);
      if (intResponse.status === 'fulfilled' && intResponse.value?.data?.data) {
        setInterviews(intResponse.value.data.data || []);
      }
      if (candResponse.status === 'fulfilled') {
        const cd = candResponse.value?.data?.data;
        setCandidates(Array.isArray(cd) ? cd : (cd?.candidates || []));
      }
    } catch (err) {
      // Don't surface generic errors — interviews may simply be empty
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCandidateSelect = (e) => {
    const candidate = candidates.find(c => c.id === e.target.value);
    if (candidate) {
      setFormData(prev => ({
        ...prev,
        candidateEmail: candidate.email,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/analytics/interview/schedule-with-tracking', formData);
      setFormData({
        candidateEmail: '',
        candidateName: '',
        interviewDate: '',
        time: '',
        interviewType: 'phone',
        location: '',
        meetLink: '',
        notes: '',
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
        await api.delete(`/api/interviews/${interviewId}`);
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
    .filter(i => new Date(i.interviewDate) >= new Date())
    .sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate));

  const pastInterviews = (interviews || [])
    .filter(i => new Date(i.interviewDate) < new Date())
    .sort((a, b) => new Date(b.interviewDate) - new Date(a.interviewDate));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Scheduling</h1>
            <p className="text-gray-600 mt-1">Manage candidate interviews and assessments</p>
          </div>
          <button
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

        {/* Schedule Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Schedule New Interview</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Candidate Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Select Candidate</label>
                  <select
                    onChange={handleCandidateSelect}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose candidate...</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} - {c.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interview Type */}
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

                {/* Interview Date */}
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

                {/* Interview Time */}
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
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Meeting Link</label>
                  <input
                    type="url"
                    name="meetLink"
                    value={formData.meetLink}
                    onChange={handleInputChange}
                    placeholder="https://zoom.us/..."
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
                  placeholder="Add any notes or interview details..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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

        {/* Upcoming Interviews */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Interviews ({upcomingInterviews.length})</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : upcomingInterviews.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-600">
              No upcoming interviews scheduled
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingInterviews.map((interview) => (
                <div key={interview.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={18} className="text-gray-600" />
                        <h3 className="text-lg font-bold text-gray-900">{interview.candidateName}</h3>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getInterviewTypeColor(interview.interviewType)}`}>
                        {interview.interviewType.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(interview.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="flex items-start gap-2">
                      <Calendar size={16} className="text-gray-400 mt-1" />
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
                      <Clock size={16} className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Time</p>
                        <p className="text-sm text-gray-900">{interview.time}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Location</p>
                        <p className="text-sm text-gray-900">{interview.location || interview.meetLink || 'TBD'}</p>
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

        {/* Past Interviews */}
        {pastInterviews.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Past Interviews ({pastInterviews.length})</h2>
            <div className="space-y-3">
              {pastInterviews.slice(0, 5).map((interview) => (
                <div key={interview.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{interview.candidateName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(interview.interviewDate).toLocaleDateString()} at {interview.time}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getInterviewTypeColor(interview.interviewType)}`}>
                      {interview.interviewType}
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

'use client';

import { useState } from 'react';
import apiClient from '../../lib/api';
import { Zap, Target } from 'lucide-react';

export default function AdvancedMatcher() {
  const [mode, setMode] = useState('job'); // 'job' or 'candidate'
  const [jobId, setJobId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFindMatches = async () => {
    setLoading(true);
    setError('');

    try {
      if (mode === 'job' && !jobId) {
        setError('Please provide Job ID');
        setLoading(false);
        return;
      }

      if (mode === 'candidate' && !candidateId) {
        setError('Please provide Candidate ID');
        setLoading(false);
        return;
      }

      const endpoint = mode === 'job' ? '/api/analytics/match/best-candidates' : '/api/analytics/match/best-jobs';
      const payload = mode === 'job' ? { jobId, limit: 10 } : { candidateId, limit: 5 };

      const response = await apiClient.post(endpoint, payload);
      setMatches(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to find matches');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        <Target size={24} className="mr-2 text-green-600" /> Advanced Matching Engine
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="mode"
              value="job"
              checked={mode === 'job'}
              onChange={(e) => setMode(e.target.value)}
              className="mr-2"
            />
            <span>Find Best Candidates for Job</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="mode"
              value="candidate"
              checked={mode === 'candidate'}
              onChange={(e) => setMode(e.target.value)}
              className="mr-2"
            />
            <span>Find Best Jobs for Candidate</span>
          </label>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {mode === 'job' ? (
          <>
            <input
              type="text"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Enter Job ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleFindMatches}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50 flex items-center"
            >
              <Zap size={18} className="mr-2" />
              {loading ? 'Searching...' : 'Find Candidates'}
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="Enter Candidate ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleFindMatches}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50 flex items-center"
            >
              <Zap size={18} className="mr-2" />
              {loading ? 'Searching...' : 'Find Jobs'}
            </button>
          </>
        )}
      </div>

      {matches && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">Matches Found: {matches.length}</h4>
          {matches.map((match, idx) => (
            <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h5 className="font-semibold text-gray-800">
                    {mode === 'job' ? match.candidate?.firstName + ' ' + match.candidate?.lastName : match.job?.title}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {mode === 'job' ? match.candidate?.email : match.job?.location}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{match.overallScore}%</div>
                  <div className="text-xs text-gray-500">{match.recommendation}</div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <ScoreBox label="Experience" value={match.scores?.experience} />
                <ScoreBox label="Skills" value={match.scores?.skills} />
                <ScoreBox label="Education" value={match.scores?.education} />
                <ScoreBox label="Location" value={match.scores?.location} />
                <ScoreBox label="Salary" value={match.scores?.salaryAlignment} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBox({ label, value }) {
  return (
    <div className="p-2 bg-gray-50 rounded">
      <div className="text-lg font-bold text-gray-800">{value}%</div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
}

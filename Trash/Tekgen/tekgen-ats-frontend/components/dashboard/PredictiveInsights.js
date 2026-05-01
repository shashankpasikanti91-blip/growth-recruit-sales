'use client';

import { useState } from 'react';
import apiClient from '../../lib/api';
import { Brain, Zap } from 'lucide-react';

export default function PredictiveInsights() {
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePredictSuccess = async () => {
    if (!candidateId || !jobId) {
      setError('Please provide both candidate and job IDs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/analytics/predict/candidate-success', {
        candidateId,
        jobId,
      });
      setPrediction(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to predict success');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        <Brain size={24} className="mr-2 text-purple-600" /> Predictive Success Analysis
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Candidate ID</label>
          <input
            type="text"
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            placeholder="e.g., clxxxxx"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Job ID</label>
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="e.g., clxxxxx"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handlePredictSuccess}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
          >
            <Zap size={18} className="mr-2" />
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {prediction && (
        <div className="space-y-4">
          {/* Success Probability */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-700">Success Probability</span>
              <span className="text-2xl font-bold text-purple-600">{prediction.successProbability}%</span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${prediction.successProbability}%` }}
              />
            </div>
          </div>

          {/* Recommendation */}
          <div className={`p-4 rounded-lg ${
            prediction.recommendation === 'STRONG_CANDIDATE'
              ? 'bg-green-100 border border-green-300'
              : prediction.recommendation === 'GOOD_CANDIDATE'
              ? 'bg-blue-100 border border-blue-300'
              : 'bg-yellow-100 border border-yellow-300'
          }`}>
            <p className="font-semibold">
              {prediction.recommendation === 'STRONG_CANDIDATE'
                ? '✓ Strong Candidate'
                : prediction.recommendation === 'GOOD_CANDIDATE'
                ? '⚠ Good Candidate'
                : '! Review Further'}
            </p>
          </div>

          {/* Factor Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <FactorBox
              label="Experience"
              value={prediction.factors.experienceMatch}
              color="blue"
            />
            <FactorBox
              label="Skills"
              value={prediction.factors.skillsMatch}
              color="green"
            />
            <FactorBox
              label="Historical Success"
              value={prediction.factors.historicalSuccessRate}
              color="purple"
            />
          </div>

          {/* Time to Hire */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Estimated Time to Hire</p>
            <p className="text-2xl font-bold text-gray-800">{prediction.estimatedTimeToHire} days</p>
          </div>
        </div>
      )}
    </div>
  );
}

function FactorBox({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`p-4 border rounded-lg ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold">{value}%</p>
    </div>
  );
}

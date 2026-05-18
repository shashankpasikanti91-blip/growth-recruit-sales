'use client';

import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter
} from 'recharts';
import { TrendingUp, Users, Award, Target, AlertCircle } from 'lucide-react';

export default function AdvancedAnalyticsDashboard() {
  const [funnelData, setFunnelData] = useState(null);
  const [scoreDistribution, setScoreDistribution] = useState(null);
  const [recruiterPerf, setRecruiterPerf] = useState(null);
  const [qualityInsights, setQualityInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [funnel, scores, perf, quality] = await Promise.all([
        apiClient.get('/api/analytics/funnel').catch(() => ({ data: { data: null } })),
        apiClient.get('/api/analytics/score-distribution').catch(() => ({ data: { data: null } })),
        apiClient.get('/api/analytics/recruiter/performance').catch(() => ({ data: { data: null } })),
        apiClient.get('/api/analytics/quality-insights').catch(() => ({ data: { data: null } })),
      ]);

      setFunnelData(funnel.data.data);
      setScoreDistribution(scores.data.data);
      setRecruiterPerf(perf.data.data);
      setQualityInsights(quality.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading advanced analytics...</div>;
  }

  // Prepare chart data
  const funnelChartData = funnelData ? [
    { stage: 'Applied', count: funnelData.statusBreakdown.APPLIED || 0 },
    { stage: 'Screened', count: funnelData.statusBreakdown.SCREENED || 0 },
    { stage: 'Shortlisted', count: funnelData.statusBreakdown.SHORTLISTED || 0 },
    { stage: 'Interview', count: funnelData.statusBreakdown.INTERVIEWED || 0 },
    { stage: 'Offered', count: funnelData.statusBreakdown.OFFERED || 0 },
  ] : [];

  const scoreChartData = scoreDistribution ? [
    { range: '0-20', count: scoreDistribution.distribution['0-20'] },
    { range: '21-40', count: scoreDistribution.distribution['21-40'] },
    { range: '41-60', count: scoreDistribution.distribution['41-60'] },
    { range: '61-80', count: scoreDistribution.distribution['61-80'] },
    { range: '81-100', count: scoreDistribution.distribution['81-100'] },
  ] : [];

  const allRecommendationData = qualityInsights ? [
    { name: 'Strong Match', value: qualityInsights.recommendations.STRONG_MATCH || 0, fill: '#28a745' },
    { name: 'Good Match', value: qualityInsights.recommendations.GOOD_MATCH || 0, fill: '#17a2b8' },
    { name: 'Moderate Match', value: qualityInsights.recommendations.MODERATE_MATCH || 0, fill: '#ffc107' },
    { name: 'Weak Match', value: qualityInsights.recommendations.WEAK_MATCH || 0, fill: '#fd7e14' },
    { name: 'Not Suitable', value: qualityInsights.recommendations.NOT_SUITABLE || 0, fill: '#dc3545' },
  ] : [];
  const recommendationChartData = allRecommendationData.filter(d => d.value > 0);

  return (
    <div className="space-y-6 p-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users size={32} className="text-blue-600" />}
          label="Total Candidates"
          value={recruiterPerf?.totalCandidates || 0}
          subtext={`${recruiterPerf?.hireSuccessRate || 0}% hire success rate`}
        />
        <MetricCard
          icon={<Award size={32} className="text-green-600" />}
          label="Hired"
          value={recruiterPerf?.hiredCount || 0}
          subtext={`From ${recruiterPerf?.totalApplications || 0} applications`}
        />
        <MetricCard
          icon={<Target size={32} className="text-purple-600" />}
          label="Avg Screening Score"
          value={`${recruiterPerf?.avgScreeningScore || 0}/100`}
          subtext="Quality metric"
        />
        <MetricCard
          icon={<TrendingUp size={32} className="text-orange-600" />}
          label="Screening Jobs"
          value={recruiterPerf?.totalScreenings || 0}
          subtext="Active screenings"
        />
      </div>

      {/* Recruitment Funnel */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <TrendingUp size={24} className="mr-2" /> Recruitment Funnel
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={funnelChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip formatter={(value) => `${value} candidates`} />
            <Area type="monotone" dataKey="count" fill="#007bff" stroke="#0056b3" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
        {funnelData && (
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <p className="text-sm text-gray-700">
              <strong>Conversion Rates:</strong> Applied→Screened: {funnelData.conversionRates.applied_to_screened}% | 
              Screened→Shortlisted: {funnelData.conversionRates.screened_to_shortlisted}% | 
              Avg Time in Pipeline: {funnelData.avgTimeInPipeline} days
            </p>
          </div>
        )}
      </div>

      {/* Scoring Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#007bff" />
            </BarChart>
          </ResponsiveContainer>
          {scoreDistribution && (
            <p className="text-sm text-gray-600 mt-4 text-center">
              Average Score: <strong>{scoreDistribution.averageScore}/100</strong> | 
              Total Screened: <strong>{scoreDistribution.totalScreened}</strong>
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Candidate Recommendations</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={recommendationChartData}
                cx="50%"
                cy="45%"
                innerRadius={40}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {recommendationChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} candidates`, name]} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers */}
      {qualityInsights && qualityInsights.topPerformers && qualityInsights.topPerformers.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Award size={24} className="mr-2" /> Top Performing Candidates
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Candidate</th>
                  <th className="px-4 py-2 text-left">Job Title</th>
                  <th className="px-4 py-2 text-left">Score</th>
                  <th className="px-4 py-2 text-left">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {qualityInsights.topPerformers.map((candidate, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 font-medium">{candidate.candidateName}</td>
                    <td className="px-4 py-2">{candidate.jobTitle}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block w-16 h-6 bg-blue-100 text-center rounded">
                        {candidate.score}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        candidate.recommendation === 'STRONG_MATCH' ? 'bg-green-100 text-green-800' :
                        candidate.recommendation === 'GOOD_MATCH' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {candidate.recommendation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, subtext }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className="opacity-20">{icon}</div>
      </div>
    </div>
  );
}

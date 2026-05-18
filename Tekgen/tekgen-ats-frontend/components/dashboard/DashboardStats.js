'use client';

import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Briefcase, CheckCircle, XCircle } from 'lucide-react';

const COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d'];

export default function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/api/screenings/stats/pipeline');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Set empty stats so dashboard still renders
      setStats({ total: 0, APPLIED: 0, SCREENED: 0, INTERVIEW: 0, REJECTED: 0, HIRED: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  const allChartData = stats ? [
    { name: 'Applied', value: stats.APPLIED || 0 },
    { name: 'Screened', value: stats.SCREENED || 0 },
    { name: 'Interview', value: stats.INTERVIEW || 0 },
    { name: 'Rejected', value: stats.REJECTED || 0 },
    { name: 'Hired', value: stats.HIRED || 0 },
  ] : [];

  const chartData = allChartData;
  const pieData = allChartData.filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="text-blue-600" size={32} />}
          label="Total Candidates"
          value={stats?.total || 0}
        />
        <StatCard
          icon={<CheckCircle className="text-green-600" size={32} />}
          label="Hired"
          value={stats?.HIRED || 0}
        />
        <StatCard
          icon={<Briefcase className="text-orange-600" size={32} />}
          label="In Interview"
          value={stats?.INTERVIEW || 0}
        />
        <StatCard
          icon={<XCircle className="text-red-600" size={32} />}
          label="Rejected"
          value={stats?.REJECTED || 0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Pipeline Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#007bff" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Candidate Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                outerRadius={90}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((entry, index) => {
                  const colorIdx = allChartData.findIndex(d => d.name === entry.name);
                  return <Cell key={`cell-${index}`} fill={COLORS[colorIdx >= 0 ? colorIdx : index]} />;
                })}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} candidates`, name]} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        <div className="opacity-20">{icon}</div>
      </div>
    </div>
  );
}

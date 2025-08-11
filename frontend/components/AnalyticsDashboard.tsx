'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getToken } from '@/utils/auth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface AnalyticsData {
  teamProductivity: { date: string; productivity: number }[];
  weeklyHours: { week: string; hours: number }[];
  monthlyPosts: { month: string; posts: number }[];
  recruitmentStatus: { status: string; count: number }[];
  memberPerformance: { member: string; hours: number }[];
}

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [error, setError] = useState('');

  // Fetch analytics data from API
  const fetchAnalyticsData = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/reports/analytics?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
      setError('');
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  // Chart.js configuration options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#E5E7EB', // text-gray-200
          font: {
            size: 12
          }
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#E5E7EB',
        bodyColor: '#E5E7EB',
        borderColor: '#6B7280',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9CA3AF' // text-gray-400
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.3)' // gray-500 with opacity
        }
      },
      y: {
        ticks: {
          color: '#9CA3AF' // text-gray-400
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.3)' // gray-500 with opacity
        }
      }
    }
  };

  // Line chart for productivity
  const getProductivityChartData = () => {
    if (!analyticsData?.teamProductivity || analyticsData.teamProductivity.length === 0) {
      return null;
    }

    return {
      labels: analyticsData.teamProductivity.map(item => {
        // Parse date-only strings as local dates to avoid timezone issues
        const date = item.date.includes('T') ? 
          new Date(item.date) : 
          (() => {
            const [year, month, day] = item.date.split('-').map(Number);
            return new Date(year, month - 1, day);
          })();
          
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }),
      datasets: [
        {
          label: 'Team Productivity (%)',
          data: analyticsData.teamProductivity.map(item => item.productivity),
          borderColor: 'rgb(59, 130, 246)', // blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: 'rgb(59, 130, 246)',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }
      ]
    };
  };

  // Bar chart for weekly hours
  const getWeeklyHoursChartData = () => {
    if (!analyticsData?.weeklyHours || analyticsData.weeklyHours.length === 0) {
      return null;
    }

    return {
      labels: analyticsData.weeklyHours.map(item => item.week),
      datasets: [
        {
          label: 'Hours Worked',
          data: analyticsData.weeklyHours.map(item => item.hours),
          backgroundColor: 'rgba(16, 185, 129, 0.8)', // green-500
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    };
  };

  // Bar chart for monthly posts
  const getMonthlyPostsChartData = () => {
    if (!analyticsData?.monthlyPosts || analyticsData.monthlyPosts.length === 0) {
      return null;
    }

    return {
      labels: analyticsData.monthlyPosts.map(item => item.month),
      datasets: [
        {
          label: 'Posts Created',
          data: analyticsData.monthlyPosts.map(item => item.posts),
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    };
  };

  // Doughnut chart for recruitment status
  const getRecruitmentStatusChartData = () => {
    if (!analyticsData?.recruitmentStatus || analyticsData.recruitmentStatus.length === 0) {
      return null;
    }

    const colors = [
      'rgba(59, 130, 246, 0.8)', // blue-500
      'rgba(6, 182, 212, 0.8)',  // cyan-500
      'rgba(16, 185, 129, 0.8)', // green-500
      'rgba(245, 158, 11, 0.8)', // amber-500
      'rgba(239, 68, 68, 0.8)',  // red-500
    ];

    return {
      labels: analyticsData.recruitmentStatus.map(item => item.status),
      datasets: [
        {
          label: 'Recruitment Status',
          data: analyticsData.recruitmentStatus.map(item => item.count),
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.8', '1')),
          borderWidth: 2,
          hoverOffset: 4,
        }
      ]
    };
  };

  // Bar chart for member performance
  const getMemberPerformanceChartData = () => {
    if (!analyticsData?.memberPerformance || analyticsData.memberPerformance.length === 0) {
      return null;
    }

    return {
      labels: analyticsData.memberPerformance.map(item => 
        item.member.length > 12 ? item.member.substring(0, 12) + '...' : item.member
      ),
      datasets: [
        {
          label: 'Hours Worked',
          data: analyticsData.memberPerformance.map(item => item.hours),
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    };
  };

  // Chart component wrapper
  const ChartContainer = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      <div className="h-64">
        {children}
      </div>
    </div>
  );

  // Empty state component
  const EmptyChart = ({ title }: { title: string }) => (
    <ChartContainer title={title}>
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">No data available</p>
      </div>
    </ChartContainer>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full animate-spin flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button 
          onClick={fetchAnalyticsData}
          className="mt-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-gray-400">Visual insights into your team's performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {analyticsData && (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Productivity Line Chart */}
            {getProductivityChartData() ? (
              <ChartContainer title="Team Productivity Trend">
                <Line data={getProductivityChartData()!} options={chartOptions} />
              </ChartContainer>
            ) : (
              <EmptyChart title="Team Productivity Trend" />
            )}

            {/* Weekly Hours Bar Chart */}
            {getWeeklyHoursChartData() ? (
              <ChartContainer title="Weekly Hours Worked">
                <Bar data={getWeeklyHoursChartData()!} options={chartOptions} />
              </ChartContainer>
            ) : (
              <EmptyChart title="Weekly Hours Worked" />
            )}

            {/* Monthly Posts Bar Chart */}
            {getMonthlyPostsChartData() ? (
              <ChartContainer title="Monthly Posts Created">
                <Bar data={getMonthlyPostsChartData()!} options={chartOptions} />
              </ChartContainer>
            ) : (
              <EmptyChart title="Monthly Posts Created" />
            )}

            {/* Recruitment Status Doughnut Chart */}
            {getRecruitmentStatusChartData() ? (
              <ChartContainer title="Recruitment Pipeline">
                <Doughnut 
                  data={getRecruitmentStatusChartData()!} 
                  options={{
                    ...chartOptions,
                    scales: undefined, // Remove scales for doughnut chart
                  }} 
                />
              </ChartContainer>
            ) : (
              <EmptyChart title="Recruitment Pipeline" />
            )}
          </div>

          {/* Member Performance Full Width */}
          {getMemberPerformanceChartData() ? (
            <ChartContainer title="Individual Member Performance (Hours)">
              <Bar data={getMemberPerformanceChartData()!} options={chartOptions} />
            </ChartContainer>
          ) : (
            <EmptyChart title="Individual Member Performance (Hours)" />
          )}

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Productivity</p>
                  <p className="text-xl font-bold text-white">
                    {analyticsData.teamProductivity.length > 0 
                      ? Math.round(analyticsData.teamProductivity.reduce((sum, d) => sum + d.productivity, 0) / analyticsData.teamProductivity.length)
                      : 0}%
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Hours</p>
                  <p className="text-xl font-bold text-white">
                    {analyticsData.weeklyHours.reduce((sum, d) => sum + d.hours, 0)}h
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Posts</p>
                  <p className="text-xl font-bold text-white">
                    {analyticsData.monthlyPosts.reduce((sum, d) => sum + d.posts, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Recruits</p>
                  <p className="text-xl font-bold text-white">
                    {analyticsData.recruitmentStatus.reduce((sum, d) => sum + d.count, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

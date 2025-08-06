'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getToken } from '@/utils/auth';
import TeamHoursSummary from './TeamHoursSummary';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  totalHours: number;
  avgHoursPerDay: number;
  lastActivity: string;
  attendance: number;
  productivity: number;
}

interface TeamReport {
  period: string;
  totalMembers: number;
  totalHours: number;
  avgProductivity: number;
  topPerformer: string;
  totalPosts: number;
  activeRecruits: number;
  members: TeamMember[];
}

export default function TeamReports() {
  const [reportData, setReportData] = useState<TeamReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeamReport();
  }, [selectedPeriod]);

  const fetchTeamReport = async () => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/reports/team?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to fetch team report');
      }
    } catch (error) {
      console.error('Error fetching team report:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Parse date-only strings as local dates to avoid timezone issues
    const date = dateString.includes('T') ? 
      new Date(dateString) : 
      (() => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      })();
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProductivityColor = (productivity: number) => {
    if (productivity >= 90) return 'text-green-400';
    if (productivity >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProductivityBg = (productivity: number) => {
    if (productivity >= 90) return 'bg-green-500/20';
    if (productivity >= 70) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full animate-spin flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Header with Period Selection */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Reports</h2>
          <p className="text-gray-400">Monitor your team's performance and productivity</p>
        </div>
        <div className="flex space-x-2">
          {['week', 'month', 'quarter'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                selectedPeriod === period
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {reportData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-400 mb-1">Total Members</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{reportData.totalMembers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-400 mb-1">Total Hours</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{reportData.totalHours.toFixed(1)}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-400 mb-1">Total Posts</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{reportData.totalPosts}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-400 mb-1">Active Recruits</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{reportData.activeRecruits}</p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-400 mb-1">Avg Productivity</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{reportData.avgProductivity.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-400 mb-1">Top Performer</p>
                  <p className="text-lg sm:text-xl font-bold text-white truncate" title={reportData.topPerformer}>
                    {reportData.topPerformer}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members Performance */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-6">Team Performance</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Member</th>
                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Role</th>
                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Total Hours</th>
                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Avg/Day</th>
                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Attendance</th>
                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Productivity</th>
                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.members.map((member, index) => (
                    <tr key={member._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{member.name}</p>
                            <p className="text-gray-400 text-sm">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-purple-400 capitalize text-sm">{member.role}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-white font-medium">{member.totalHours.toFixed(1)}h</span>
                      </td>
                      <td className="py-4">
                        <span className="text-white">{member.avgHoursPerDay.toFixed(1)}h</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-white/10 rounded-full">
                            <div 
                              className="h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                              style={{ width: `${member.attendance}%` }}
                            ></div>
                          </div>
                          <span className="text-white text-sm">{member.attendance}%</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getProductivityBg(member.productivity)}`}>
                            <span className={getProductivityColor(member.productivity)}>
                              {member.productivity}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-gray-400 text-sm">{formatDate(member.lastActivity)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team Hours Summary */}
          <TeamHoursSummary />

          {/* Export Options */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4 sm:mb-6">Export Reports</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button className="flex items-center justify-center space-x-3 p-4 sm:p-5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all duration-300 hover:scale-105">
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-white font-medium">Export PDF</span>
              </button>
              <button className="flex items-center justify-center space-x-3 p-4 sm:p-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition-all duration-300 hover:scale-105">
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-white font-medium">Export Excel</span>
              </button>
              <button className="flex items-center justify-center space-x-3 p-4 sm:p-5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-lg transition-all duration-300 hover:scale-105">
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="text-white font-medium">Share Report</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

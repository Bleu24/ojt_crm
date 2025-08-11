'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getToken } from '@/utils/auth';

interface TeamHoursMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  requiredHours: number | null;
  totalHoursWorked: number;
  isComplete: boolean | null;
}

interface TeamHoursSummary {
  teamMembers: TeamHoursMember[];
}

export default function TeamHoursSummary() {
  const [teamData, setTeamData] = useState<TeamHoursSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch team hours summary
  const fetchTeamHours = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/team-hours-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch team hours data');
      }

      const data = await response.json();
      setTeamData(data);
      setError('');
    } catch (err) {
      console.error('Error fetching team hours:', err);
      setError('Failed to load team hours data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamHours();
  }, []);

  // Get progress percentage
  const getProgressPercentage = (member: TeamHoursMember) => {
    if (!member.requiredHours || member.requiredHours === 0) return 0;
    return Math.min((member.totalHoursWorked / member.requiredHours) * 100, 100);
  };

  // Get progress color class
  const getProgressColorClass = (member: TeamHoursMember) => {
    if (member.role !== 'intern' || !member.requiredHours) return 'bg-gray-500';
    
    const percentage = getProgressPercentage(member);
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get status text
  const getStatusText = (member: TeamHoursMember) => {
    if (member.role !== 'intern') return 'Staff';
    if (!member.requiredHours || member.requiredHours === 0) return 'Hours not set';
    if (member.isComplete) return 'Complete';
    return `${getProgressPercentage(member).toFixed(0)}% Complete`;
  };

  // Get status color
  const getStatusColor = (member: TeamHoursMember) => {
    if (member.role !== 'intern') return 'text-blue-400';
    if (!member.requiredHours || member.requiredHours === 0) return 'text-yellow-400';
    if (member.isComplete) return 'text-green-400';
    return 'text-blue-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full animate-spin flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mac-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Team Hours Summary</h3>
          <p className="text-gray-400">Track internship progress and working hours</p>
        </div>
        <button
          onClick={fetchTeamHours}
          className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Team Members Hours */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
        {teamData && teamData.teamMembers.length > 0 ? (
          <div className="divide-y divide-white/10">
            {teamData.teamMembers.map((member) => (
              <div key={member._id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    
                    {/* Member Info */}
                    <div>
                      <h4 className="text-white font-medium">{member.name}</h4>
                      <p className="text-gray-400 text-sm">{member.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 capitalize">
                          {member.role.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member)}`}>
                          {getStatusText(member)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hours Display */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-white mb-1">
                      {member.role === 'intern' && member.requiredHours ? (
                        <span>
                          {member.totalHoursWorked.toFixed(1)}h / {member.requiredHours}h
                        </span>
                      ) : (
                        <span>{member.totalHoursWorked.toFixed(1)}h</span>
                      )}
                    </div>
                    
                    {/* Progress Bar for Interns */}
                    {member.role === 'intern' && member.requiredHours && member.requiredHours > 0 && (
                      <div className="w-32 bg-white/10 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${getProgressColorClass(member)}`}
                          style={{ width: `${Math.min(getProgressPercentage(member), 100)}%` }}
                        />
                      </div>
                    )}
                    
                    {/* Additional Info */}
                    <div className="text-xs text-gray-400 mt-1">
                      {member.role === 'intern' && member.requiredHours ? (
                        member.isComplete ? (
                          <span className="text-green-400">✓ Complete</span>
                        ) : (
                          <span>
                            {Math.max(0, member.requiredHours - member.totalHoursWorked).toFixed(1)}h remaining
                          </span>
                        )
                      ) : member.role === 'intern' ? (
                        <span className="text-yellow-400">No hours requirement set</span>
                      ) : (
                        <span>Total hours worked</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-400">No team members found</p>
          </div>
        )}
      </div>
    </div>
  );
}

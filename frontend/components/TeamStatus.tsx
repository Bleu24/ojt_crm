'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getToken } from '@/utils/auth';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  isOnline: boolean;
  currentStatus: 'clocked_in' | 'clocked_out' | 'never_clocked';
  lastClockIn?: string;
  lastClockOut?: string;
  todayHours: number;
  isFirstTimeToday: boolean;
}

interface DtrEntry {
  _id: string;
  userId: string;
  date: string;
  timeIn: string;
  timeOut?: string;
  accomplishment?: string;
  hoursWorked?: number;
}

export default function TeamStatus() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [accomplishments, setAccomplishments] = useState<DtrEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [loadingAccomplishments, setLoadingAccomplishments] = useState(false);
  const [error, setError] = useState('');

  // Format date for display
  const formatDate = (dateString: string) => {
    // Parse date-only strings as local dates to avoid timezone issues
    const date = dateString.includes('T') ? 
      new Date(dateString) : 
      (() => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      })();
      
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clocked_in':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'clocked_out':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'never_clocked':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'clocked_in':
        return 'Clocked In';
      case 'clocked_out':
        return 'Clocked Out';
      case 'never_clocked':
        return 'Not Started';
      default:
        return 'Unknown';
    }
  };

  // Fetch team members and their status
  const fetchTeamStatus = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/team-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team status');
      }

      const data = await response.json();
      setTeamMembers(data.teamMembers || []);
      setError('');
    } catch (err) {
      console.error('Error fetching team status:', err);
      setError('Failed to load team status');
    } finally {
      setLoading(false);
    }
  };

  // Fetch accomplishments for selected member and date
  const fetchAccomplishments = async (memberId: string, date: string) => {
    setLoadingAccomplishments(true);
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/dtr/accomplishments/${memberId}?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch accomplishments');
      }

      const data = await response.json();
      setAccomplishments(data.entries || []);
    } catch (err) {
      console.error('Error fetching accomplishments:', err);
      setError('Failed to load accomplishments');
    } finally {
      setLoadingAccomplishments(false);
    }
  };

  // Load team status on component mount
  useEffect(() => {
    fetchTeamStatus();
    // Set up interval to refresh status every 30 seconds
    const interval = setInterval(fetchTeamStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load accomplishments when member or date changes
  useEffect(() => {
    if (selectedMember) {
      fetchAccomplishments(selectedMember._id, selectedDate);
    }
  }, [selectedMember, selectedDate]);

  if (loading) {
    return (
      <div className="group relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6">
          <div className="text-center text-gray-400 py-8">
            <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading team status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="group relative">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-pink-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6">
          <div className="text-center text-red-400 py-8">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-base font-medium mb-2">Error Loading Team Status</p>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchTeamStatus}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Status Overview */}
      <div className="group relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Team Status</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </div>
          </div>

          {teamMembers.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-base">No team members assigned yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member) => (
                <div
                  key={member._id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{member.name}</h4>
                        <p className="text-xs text-gray-400 capitalize">{member.role}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(member.currentStatus)}`}>
                      {getStatusText(member.currentStatus)}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {member.currentStatus === 'clocked_in' && member.lastClockIn && (
                      <div className="flex justify-between text-gray-300">
                        <span>Clocked in:</span>
                        <span>{formatTime(member.lastClockIn)}</span>
                      </div>
                    )}
                    {member.currentStatus === 'clocked_out' && member.lastClockOut && (
                      <div className="flex justify-between text-gray-300">
                        <span>Last out:</span>
                        <span>{formatTime(member.lastClockOut)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-300">
                      <span>Today's hours:</span>
                      <span>{member.todayHours.toFixed(1)}h</span>
                    </div>
                    {member.isFirstTimeToday && (
                      <div className="text-xs text-yellow-400 font-medium">
                        First time today
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accomplishments Panel */}
      {selectedMember && (
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold text-white">Accomplishments</h3>
                <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                  {selectedMember.name}
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Date Picker */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Accomplishments List */}
            {loadingAccomplishments ? (
              <div className="text-center text-gray-400 py-8">
                <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading accomplishments...</p>
              </div>
            ) : accomplishments.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-base">No accomplishments recorded for {formatDate(selectedDate)}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accomplishments.map((entry) => (
                  <div key={entry._id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4 text-sm text-gray-300">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTime(entry.timeIn)}</span>
                        </div>
                        {entry.timeOut && (
                          <>
                            <span className="text-gray-500">→</span>
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{formatTime(entry.timeOut)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {entry.hoursWorked && (
                        <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                          {entry.hoursWorked.toFixed(1)}h
                        </div>
                      )}
                    </div>
                    {entry.accomplishment && (
                      <div className="text-gray-300">
                        <p className="text-sm font-medium text-white mb-2">Accomplishments:</p>
                        <p className="text-sm whitespace-pre-line">{entry.accomplishment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

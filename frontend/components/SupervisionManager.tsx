'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getToken } from '@/utils/auth';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  supervisorId: string | null;
  createdAt: string;
}

interface SupervisionStats {
  totalSupervised: number;
  activeToday: number;
  avgHoursWorked: number;
  totalHoursThisWeek: number;
}

export default function SupervisionManager() {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [supervisedUsers, setSupervisedUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SupervisionStats>({
    totalSupervised: 0,
    activeToday: 0,
    avgHoursWorked: 0,
    totalHoursThisWeek: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchSupervisedUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = getToken();
      if (!token) return;

      // Fetch users without supervisors (available for supervision)
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSupervisedUsers = async () => {
    try {
      const token = getToken();
      if (!token) return;

      // Fetch users under current user's supervision
      const response = await fetch(`${API_BASE_URL}/users/supervised`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const users = await response.json();
        setSupervisedUsers(users);
      }
    } catch (error) {
      console.error('Error fetching supervised users:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/reports/supervision/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const addToSupervision = async (userId: string) => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/users/${userId}/assign-supervisor`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchUsers();
        await fetchSupervisedUsers();
        await fetchStats();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to assign supervisor');
      }
    } catch (error) {
      console.error('Error assigning supervisor:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const removeFromSupervision = async (userId: string) => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/users/${userId}/remove-supervisor`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchUsers();
        await fetchSupervisedUsers();
        await fetchStats();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to remove supervisor');
      }
    } catch (error) {
      console.error('Error removing supervisor:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="mac-card space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Supervised</p>
              <p className="text-2xl font-bold text-white">{stats.totalSupervised}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Today</p>
              <p className="text-2xl font-bold text-white">{stats.activeToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Hours/Day</p>
              <p className="text-2xl font-bold text-white">{stats.avgHoursWorked.toFixed(1)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Hours This Week</p>
              <p className="text-2xl font-bold text-white">{stats.totalHoursThisWeek.toFixed(1)}</p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Users Pool */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Available Team Members</h3>
            <span className="text-sm text-gray-400">{filteredAvailableUsers.length} available</span>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredAvailableUsers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No available team members</p>
            ) : (
              filteredAvailableUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                      <p className="text-xs text-blue-400 capitalize">{user.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => addToSupervision(user._id)}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-300 disabled:opacity-50"
                  >
                    Add to Team
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Supervised Users */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Your Team</h3>
            <span className="text-sm text-gray-400">{supervisedUsers.length} members</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {supervisedUsers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No team members assigned</p>
            ) : (
              supervisedUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-blue-400 capitalize">{user.role}</p>
                        <span className="text-xs text-gray-500">•</span>
                        <p className="text-xs text-gray-500">Added {formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromSupervision(user._id)}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-sm font-medium rounded-lg transition-all duration-300 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

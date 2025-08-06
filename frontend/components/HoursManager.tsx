'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getToken, getUserFromToken } from '@/utils/auth';

interface HoursData {
  userId: string;
  userName: string;
  role: string;
  requiredHours: number | null;
  totalHoursWorked: number;
  isComplete: boolean | null;
}

export default function HoursManager() {
  const [hoursData, setHoursData] = useState<HoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingHours, setSettingHours] = useState(false);
  const [requiredHoursInput, setRequiredHoursInput] = useState('');
  const [showSetHours, setShowSetHours] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Get user info from token
  useEffect(() => {
    const token = getToken();
    if (token) {
      const userData = getUserFromToken(token);
      setUser(userData);
    }
  }, []);

  // Fetch hours data
  const fetchHoursData = async () => {
    if (!user) return;

    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/${user.userId}/total-hours`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch hours data');
      }

      const data = await response.json();
      setHoursData(data);
      
      // Show set hours modal if no required hours are set
      if (!data.requiredHours || data.requiredHours === 0) {
        setShowSetHours(true);
      }
      
      setError('');
    } catch (err) {
      console.error('Error fetching hours data:', err);
      setError('Failed to load hours data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHoursData();
    }
  }, [user]);

  // Set required hours
  const handleSetRequiredHours = async () => {
    if (!user || !requiredHoursInput || parseFloat(requiredHoursInput) <= 0) {
      setError('Please enter a valid number of hours');
      return;
    }

    setSettingHours(true);
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/${user.userId}/required-hours`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requiredHours: parseFloat(requiredHoursInput)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to set required hours');
      }

      // Refresh hours data
      await fetchHoursData();
      setShowSetHours(false);
      setRequiredHoursInput('');
      setError('');
    } catch (err) {
      console.error('Error setting required hours:', err);
      setError('Failed to set required hours. Please try again.');
    } finally {
      setSettingHours(false);
    }
  };

  // Calculate percentage
  const getProgressPercentage = () => {
    if (!hoursData || !hoursData.requiredHours || hoursData.requiredHours === 0) return 0;
    return Math.min((hoursData.totalHoursWorked / hoursData.requiredHours) * 100, 100);
  };

  // Get progress color
  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return 'from-green-500 to-emerald-500';
    if (percentage >= 75) return 'from-blue-500 to-purple-500';
    if (percentage >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">My Hours</h2>
          <p className="text-gray-400">Track your internship progress</p>
        </div>
        {hoursData?.requiredHours && (
          <button
            onClick={() => setShowSetHours(true)}
            className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
          >
            Update Required Hours
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Hours Overview */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        {hoursData ? (
          <div className="space-y-6">
            {/* Progress Circle */}
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 mb-6">
                {/* Background circle */}
                <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    stroke="url(#progressGradient)"
                    strokeWidth="12"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    strokeDashoffset={`${2 * Math.PI * 85 * (1 - getProgressPercentage() / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" className="stop-color-current" style={{ stopColor: getProgressColor().includes('green') ? '#10b981' : getProgressColor().includes('blue') ? '#3b82f6' : getProgressColor().includes('yellow') ? '#f59e0b' : '#ef4444' }} />
                      <stop offset="100%" className="stop-color-current" style={{ stopColor: getProgressColor().includes('green') ? '#059669' : getProgressColor().includes('blue') ? '#8b5cf6' : getProgressColor().includes('yellow') ? '#ea580c' : '#ec4899' }} />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold text-white mb-1">
                    {getProgressPercentage().toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-400">Complete</div>
                </div>
              </div>
              
              {/* Status badge */}
              {hoursData.isComplete ? (
                <div className="px-6 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                  🎉 Internship Complete!
                </div>
              ) : (
                <div className="px-6 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                  In Progress
                </div>
              )}
            </div>

            {/* Hours Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-2xl font-bold text-white mb-1">
                  {hoursData.totalHoursWorked.toFixed(1)}h
                </div>
                <div className="text-sm text-gray-400">Hours Worked</div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-2xl font-bold text-white mb-1">
                  {hoursData.requiredHours || 0}h
                </div>
                <div className="text-sm text-gray-400">Required Hours</div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-2xl font-bold text-white mb-1">
                  {hoursData.requiredHours ? Math.max(0, hoursData.requiredHours - hoursData.totalHoursWorked).toFixed(1) : 0}h
                </div>
                <div className="text-sm text-gray-400">Remaining</div>
              </div>
            </div>

            {/* Additional Info */}
            {hoursData.requiredHours && hoursData.requiredHours > 0 && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-purple-400 font-medium text-sm mb-1">Progress Update</p>
                    <p className="text-gray-300 text-sm">
                      {hoursData.isComplete 
                        ? "Congratulations! You have completed your required internship hours." 
                        : `You're ${getProgressPercentage().toFixed(0)}% of the way through your internship. Keep up the great work!`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No hours data available</p>
          </div>
        )}
      </div>

      {/* Set Required Hours Modal */}
      {showSetHours && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                {hoursData?.requiredHours ? 'Update' : 'Set'} Required Hours
              </h3>
              <button
                onClick={() => {
                  setShowSetHours(false);
                  setRequiredHoursInput('');
                  setError('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-white text-sm font-medium mb-2">
                Total Required Hours for Internship
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={requiredHoursInput}
                onChange={(e) => setRequiredHoursInput(e.target.value)}
                placeholder="e.g. 500"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-gray-400 text-xs mt-2">
                Enter the total number of hours required to complete your internship
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowSetHours(false);
                  setRequiredHoursInput('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={settingHours}
              >
                Cancel
              </button>
              <button
                onClick={handleSetRequiredHours}
                disabled={settingHours || !requiredHoursInput}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingHours ? 'Setting...' : 'Set Hours'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getToken } from '@/utils/auth';

interface DTREntry {
  _id: string;
  date: string;
  timeIn: string;
  timeOut: string | null;
  hoursWorked: number;
  accomplishment: string;
}

interface WorldClock {
  city: string;
  timezone: string;
  time: string;
  date: string;
}

export default function DTRSystem() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [worldClocks, setWorldClocks] = useState<WorldClock[]>([]);
  const [recentEntries, setRecentEntries] = useState<DTREntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [todayEntry, setTodayEntry] = useState<DTREntry | null>(null);
  const [accomplishmentNote, setAccomplishmentNote] = useState('');
  const [elapsedTime, setElapsedTime] = useState('');

  // World clock timezones
  const timeZones = [
    { city: 'Manila', timezone: 'Asia/Manila' },
    { city: 'Tokyo', timezone: 'Asia/Tokyo' },
    { city: 'New York', timezone: 'America/New_York' },
    { city: 'London', timezone: 'Europe/London' },
  ];

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update world clocks
  useEffect(() => {
    const updateWorldClocks = () => {
      const clocks = timeZones.map(zone => {
        const time = new Date().toLocaleTimeString('en-US', {
          timeZone: zone.timezone,
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        const date = new Date().toLocaleDateString('en-US', {
          timeZone: zone.timezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        return {
          city: zone.city,
          timezone: zone.timezone,
          time,
          date
        };
      });
      setWorldClocks(clocks);
    };

    updateWorldClocks();
    const timer = setInterval(updateWorldClocks, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate elapsed time if clocked in
  useEffect(() => {
    if (todayEntry && !todayEntry.timeOut) {
      const timer = setInterval(() => {
        const timeIn = new Date(todayEntry.timeIn);
        const now = new Date();
        const diff = now.getTime() - timeIn.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setElapsedTime('');
    }
  }, [todayEntry]);

  // Fetch DTR entries on component mount
  useEffect(() => {
    fetchDTREntries();
  }, []);

  const fetchDTREntries = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/dtr/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const entries = await response.json();
        setRecentEntries(entries.slice(0, 5)); // Show only 5 recent entries
        
        // Check if there's an entry for today
        const today = new Date().toISOString().split('T')[0];
        const todayEntryFound = entries.find((entry: DTREntry) => {
          const entryDate = new Date(entry.date).toISOString().split('T')[0];
          return entryDate === today;
        });
        setTodayEntry(todayEntryFound || null);
      }
    } catch (error) {
      console.error('Error fetching DTR entries:', error);
    }
  };

  const handleTimeIn = async () => {
    console.log('Time in button clicked');
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      console.log('Making API call to:', `${API_BASE_URL}/dtr/timein`);
      const response = await fetch(`${API_BASE_URL}/dtr/timein`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setTodayEntry(data.entry);
        await fetchDTREntries();
      } else {
        setError(data.message || 'Failed to clock in');
      }
    } catch (error) {
      console.error('Error during time in:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeOut = async () => {
    if (!accomplishmentNote.trim()) {
      setError('Please provide an accomplishment note before clocking out');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/dtr/timeout`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accomplishment: accomplishmentNote
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTodayEntry(data.entry);
        setAccomplishmentNote('');
        await fetchDTREntries();
      } else {
        setError(data.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Error during time out:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: string) => {
    if (!date) return 'Invalid Date';
    
    // Parse the date string more carefully to avoid timezone issues
    let dateObj: Date;
    
    if (date.includes('T')) {
      // ISO datetime string
      dateObj = new Date(date);
    } else {
      // Date-only string (YYYY-MM-DD) - parse as local date to avoid timezone shift
      const [year, month, day] = date.split('-').map(Number);
      if (year && month && day) {
        dateObj = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        dateObj = new Date(date);
      }
    }
    
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isTimedIn = todayEntry && !todayEntry.timeOut;

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Current Time & Status */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <div className="text-center">
          <div className="text-5xl sm:text-6xl font-mono font-bold text-white mb-2 tracking-wider">
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })}
          </div>
          <div className="text-gray-300 text-sm">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          
          {/* Status Badge */}
          <div className="mt-4">
            {isTimedIn ? (
              <div className="space-y-2">
                <div className="inline-flex items-center px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  Currently Clocked In
                </div>
                {elapsedTime && (
                  <div className="text-lg font-semibold text-white">
                    Elapsed: {elapsedTime}
                  </div>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center px-4 py-2 bg-gray-500/20 text-gray-400 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                Not Clocked In
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clock In/Out Actions */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">Time Management</h3>
        
        {!isTimedIn ? (
          <button
            onClick={handleTimeIn}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Clocking In...' : 'Clock In'}
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Accomplishment Note (Required)
              </label>
              <textarea
                value={accomplishmentNote}
                onChange={(e) => setAccomplishmentNote(e.target.value)}
                placeholder="Describe what you accomplished today..."
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
              />
            </div>
            <button
              onClick={handleTimeOut}
              disabled={loading || !accomplishmentNote.trim()}
              className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Clocking Out...' : 'Clock Out'}
            </button>
          </div>
        )}
      </div>

      {/* World Clock */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">World Clock</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {worldClocks.map((clock, index) => (
            <div key={index} className="text-center">
              <div className="text-lg font-bold text-white">{clock.time}</div>
              <div className="text-sm text-gray-300">{clock.date}</div>
              <div className="text-xs text-gray-400 mt-1">{clock.city}</div>
            </div>
          ))}
        </div>
        
        {/* Time Button */}
        <div className="mt-6 text-center">
          <button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">
            <div className="text-lg font-mono">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </div>
            <div className="text-xs opacity-80">Current Time</div>
          </button>
        </div>
      </div>

      {/* Recent DTR Entries */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">Recent DTR Entries</h3>
        {recentEntries.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No DTR entries found</p>
        ) : (
          <div className="space-y-4">
            {recentEntries.map((entry) => (
              <div key={entry._id} className="bg-white/5 rounded-lg p-4 border border-white/5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="text-white font-medium">{formatDate(entry.date)}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400 text-sm">In: {formatTime(entry.timeIn)}</span>
                        {entry.timeOut && (
                          <span className="text-red-400 text-sm">Out: {formatTime(entry.timeOut)}</span>
                        )}
                      </div>
                    </div>
                    {entry.accomplishment && (
                      <p className="text-gray-300 text-sm mb-2">{entry.accomplishment}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.hoursWorked > 0 && (
                      <div className="text-purple-400 font-semibold">
                        {entry.hoursWorked.toFixed(1)}h
                      </div>
                    )}
                    {!entry.timeOut && (
                      <div className="text-yellow-400 text-xs">Active</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

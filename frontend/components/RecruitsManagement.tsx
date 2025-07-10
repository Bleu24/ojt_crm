'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getToken, getUserFromToken } from '@/utils/auth';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Recruit {
  _id: string;
  fullName: string;
  contactNumber: string;
  email: string;
  permanentAddress: string;
  course?: string;
  school?: string;
  educationalStatus: 'UNDERGRAD' | 'GRADUATE' | 'GRADUATING';
  applicationStatus: 'Applied' | 'Interviewed' | 'Hired' | 'Rejected' | 'Pending';
  resumeUrl?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewer?: User;
  interviewNotes?: string;
  assignedTo: User;
  dateApplied: string;
  createdAt: string;
}

export default function RecruitsManagement() {
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRecruit, setSelectedRecruit] = useState<Recruit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    permanentAddress: '',
    course: '',
    school: '',
    educationalStatus: 'UNDERGRAD' as const,
    dateApplied: new Date().toISOString().split('T')[0]
  });

  // Schedule form state
  const [scheduleData, setScheduleData] = useState({
    interviewDate: '',
    interviewTime: '',
    interviewerId: '',
    interviewNotes: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch recruits
  const fetchRecruits = async () => {
    const token = getToken();
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }

    // Debug: Check user role from token
    const user = getUserFromToken(token);
    console.log('Current user role:', user?.role);

    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      console.log('Fetching recruits from:', `${API_BASE_URL}/recruits?${queryParams.toString()}`);

      const response = await fetch(`${API_BASE_URL}/recruits?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          const errorMessage = errorData.error || errorData.message || 'Access denied';
          console.error('Permission denied:', {
            userRole: user?.role,
            status: response.status,
            errorData
          });
          throw new Error(`Access denied: ${errorMessage}. Your current role (${user?.role || 'unknown'}) may not have permission to access recruits. Please contact your administrator or try logging out and back in.`);
        }
        
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('Failed to fetch recruits:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Failed to fetch recruits: ${errorMessage}`);
      }

      const data = await response.json();
      setRecruits(data.recruits || data); // Handle both paginated and non-paginated responses
      setError('');
    } catch (err) {
      console.error('Error fetching recruits:', err);
      setError('Failed to load recruits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for assignment
  const fetchUsers = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/recruits/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchRecruits();
    fetchUsers();
  }, [searchTerm, statusFilter]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      
      if (selectedFile) {
        formDataToSend.append('resume', selectedFile);
      }

      const response = await fetch(`${API_BASE_URL}/recruits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        throw new Error('Failed to create recruit');
      }

      const result = await response.json();
      setRecruits([result.recruit, ...recruits]);
      setShowAddForm(false);
      resetForm();
      setError('');
    } catch (err) {
      console.error('Error creating recruit:', err);
      setError('Failed to create recruit. Please try again.');
    }
  };

  // Handle schedule interview
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRecruit) return;

    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/recruits/${selectedRecruit._id}/schedule`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      });

      if (!response.ok) {
        throw new Error('Failed to schedule interview');
      }

      const result = await response.json();
      setRecruits(recruits.map(r => r._id === selectedRecruit._id ? result.recruit : r));
      setShowScheduleModal(false);
      setSelectedRecruit(null);
      setScheduleData({ interviewDate: '', interviewTime: '', interviewerId: '', interviewNotes: '' });
      setError('');
    } catch (err) {
      console.error('Error scheduling interview:', err);
      setError('Failed to schedule interview. Please try again.');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (recruitId: string, newStatus: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/recruits/${recruitId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ applicationStatus: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result = await response.json();
      setRecruits(recruits.map(r => r._id === recruitId ? result.recruit : r));
      setError('');
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      fullName: '',
      contactNumber: '',
      email: '',
      permanentAddress: '',
      course: '',
      school: '',
      educationalStatus: 'UNDERGRAD',
      dateApplied: new Date().toISOString().split('T')[0]
    });
    setSelectedFile(null);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Applied': return 'bg-blue-500/20 text-blue-400';
      case 'Interviewed': return 'bg-yellow-500/20 text-yellow-400';
      case 'Hired': return 'bg-green-500/20 text-green-400';
      case 'Rejected': return 'bg-red-500/20 text-red-400';
      case 'Pending': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
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
          <h2 className="text-2xl font-bold text-white">Recruits Management</h2>
          <p className="text-gray-400">Manage applicants and schedule interviews</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Recruit</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, or contact number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Status</option>
          <option value="Applied">Applied</option>
          <option value="Interviewed">Interviewed</option>
          <option value="Hired">Hired</option>
          <option value="Rejected">Rejected</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      {/* Recruits Table */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Education
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Interview
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {recruits.map((recruit) => (
                <tr key={recruit._id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-white font-medium">{recruit.fullName}</div>
                      <div className="text-gray-400 text-sm">{recruit.email}</div>
                      <div className="text-gray-400 text-sm">{recruit.permanentAddress}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">{recruit.contactNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-white">{recruit.course}</div>
                      <div className="text-gray-400 text-sm">{recruit.school}</div>
                      <div className="text-gray-400 text-sm">{recruit.educationalStatus}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={recruit.applicationStatus}
                      onChange={(e) => handleStatusUpdate(recruit._id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 ${getStatusColor(recruit.applicationStatus)}`}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Interviewed">Interviewed</option>
                      <option value="Hired">Hired</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {recruit.interviewDate ? (
                      <div>
                        <div className="text-white text-sm">
                          {new Date(recruit.interviewDate).toLocaleDateString()}
                        </div>
                        <div className="text-gray-400 text-sm">{recruit.interviewTime}</div>
                        {recruit.interviewer && (
                          <div className="text-gray-400 text-sm">{recruit.interviewer.name}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not scheduled</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedRecruit(recruit);
                          setScheduleData({
                            interviewDate: recruit.interviewDate ? recruit.interviewDate.split('T')[0] : '',
                            interviewTime: recruit.interviewTime || '',
                            interviewerId: recruit.interviewer?._id || '',
                            interviewNotes: recruit.interviewNotes || ''
                          });
                          setShowScheduleModal(true);
                        }}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                      >
                        Schedule
                      </button>
                      {recruit.resumeUrl && (
                        <a
                          href={`${API_BASE_URL}/${recruit.resumeUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                        >
                          Resume
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Recruit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Add New Recruit</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Contact Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Educational Status *
                  </label>
                  <select
                    required
                    value={formData.educationalStatus}
                    onChange={(e) => setFormData({ ...formData, educationalStatus: e.target.value as any })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="UNDERGRAD">Undergraduate</option>
                    <option value="GRADUATE">Graduate</option>
                    <option value="GRADUATING">Graduating</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Course
                  </label>
                  <input
                    type="text"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    School
                  </label>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Permanent Address *
                </label>
                <textarea
                  required
                  value={formData.permanentAddress}
                  onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Date Applied *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateApplied}
                  onChange={(e) => setFormData({ ...formData, dateApplied: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Resume (PDF, DOC, DOCX - Max 5MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500 file:text-white file:cursor-pointer hover:file:bg-purple-600"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Add Recruit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && selectedRecruit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Schedule Interview</h3>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedRecruit(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-white font-medium">{selectedRecruit.fullName}</p>
              <p className="text-gray-400 text-sm">{selectedRecruit.email}</p>
            </div>

            <form onSubmit={handleScheduleInterview} className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Interview Date *
                </label>
                <input
                  type="date"
                  required
                  value={scheduleData.interviewDate}
                  onChange={(e) => setScheduleData({ ...scheduleData, interviewDate: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Interview Time *
                </label>
                <input
                  type="time"
                  required
                  value={scheduleData.interviewTime}
                  onChange={(e) => setScheduleData({ ...scheduleData, interviewTime: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Interviewer
                </label>
                <select
                  value={scheduleData.interviewerId}
                  onChange={(e) => setScheduleData({ ...scheduleData, interviewerId: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Interviewer</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Notes
                </label>
                <textarea
                  value={scheduleData.interviewNotes}
                  onChange={(e) => setScheduleData({ ...scheduleData, interviewNotes: e.target.value })}
                  rows={3}
                  placeholder="Additional notes for the interview..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedRecruit(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Schedule Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

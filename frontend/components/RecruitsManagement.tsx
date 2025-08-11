'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import ZoomAuthPrompt from '@/components/ZoomAuthPrompt';
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
  applicationStatus: 'Applied' | 'Interviewed' | 'Hired' | 'Rejected' | 'Pending' | 'Pending Final Interview';
  source?: string;
  resumeUrl?: string;
  
  // Step 1 Interview (by intern/staff)
  initialInterviewDate?: string;
  initialInterviewTime?: string;
  initialInterviewer?: User;
  initialInterviewNotes?: string;
  initialInterviewCompleted?: boolean;
  
  // Zoom Meeting Information for Initial Interview
  initialInterviewZoomMeetingId?: string;
  initialInterviewZoomJoinUrl?: string;
  initialInterviewZoomStartUrl?: string;
  initialInterviewZoomPassword?: string;
  
  // Step 2 Interview (by unit manager)
  finalInterviewDate?: string;
  finalInterviewTime?: string;
  finalInterviewer?: User;
  finalInterviewNotes?: string;
  finalInterviewCompleted?: boolean;
  finalInterviewAssignedTo?: User; // Which unit manager is assigned to handle the final interview
  
  // Zoom Meeting Information for Final Interview
  finalInterviewZoomMeetingId?: string;
  finalInterviewZoomJoinUrl?: string;
  finalInterviewZoomStartUrl?: string;
  finalInterviewZoomPassword?: string;
  
  // Legacy fields (keeping for backward compatibility)
  interviewDate?: string;
  interviewTime?: string;
  interviewer?: User;
  interviewNotes?: string;
  
  // Legacy Zoom Meeting Information
  zoomMeetingId?: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  zoomPassword?: string;
  
  assignedTo: User;
  dateApplied: string;
  createdAt: string;
}

export default function RecruitsManagement() {
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [unitManagers, setUnitManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showZoomPrompt, setShowZoomPrompt] = useState(false);
  const [zoomConnecting, setZoomConnecting] = useState(false);
  const [pendingSchedulePayload, setPendingSchedulePayload] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{ type: string; zoomMeeting?: any } | null>(null);
  const [selectedRecruit, setSelectedRecruit] = useState<Recruit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUnitManager, setSelectedUnitManager] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    permanentAddress: '',
    course: '',
    school: '',
    educationalStatus: 'UNDERGRAD' as const,
    source: '',
    dateApplied: new Date().toISOString().split('T')[0]
  });

  // Schedule form state
  const [scheduleData, setScheduleData] = useState({
    interviewDate: '',
    interviewTime: '',
    interviewerId: '',
    interviewNotes: '',
    interviewType: 'initial' as 'initial' | 'final',
    createZoomMeeting: false
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Get current user info
  const getCurrentUser = () => {
    const token = getToken();
    if (!token) return null;
    return getUserFromToken(token);
  };

  // Handle resume preview - open in new tab
  const handleResumePreview = async (recruit: Recruit) => {
    console.log('Attempting to preview resume for recruit:', recruit.fullName);
    console.log('Resume URL:', recruit.resumeUrl);
    
    // If no resumeUrl, show alert and return
    if (!recruit.resumeUrl) {
      alert('No resume file found for this recruit');
      return;
    }

    try {
      const token = getToken();
      if (!token) { 
        console.log('No token found, opening URL directly');
        window.open(recruit.resumeUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      console.log('Fetching preview URL from backend...');
      const response = await fetch(`${API_BASE_URL}/recruits/${recruit._id}/resume/preview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Backend response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Backend response data:', data);
        
        // Try the preview URL first, then fall back to original
        const urlToOpen = data.previewUrl || data.originalUrl || recruit.resumeUrl;
        console.log('Opening URL:', urlToOpen);
        
        window.open(urlToOpen, '_blank', 'noopener,noreferrer');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend error:', response.status, errorData);
        
        // Fallback: try to open the original resume URL directly
        console.log('Falling back to direct URL:', recruit.resumeUrl);
        window.open(recruit.resumeUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error previewing resume:', error);
      
      // Final fallback: try to open the original resume URL
      console.log('Final fallback to direct URL:', recruit.resumeUrl);
      window.open(recruit.resumeUrl, '_blank', 'noopener,noreferrer');
    }
  };

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

  // Fetch unit managers for assignment
  const fetchUnitManagers = async () => {
    try {
      const token = getToken();
      if (!token) return;

      // Only fetch unit managers if the current user is intern or staff
      const user = getUserFromToken(token);
      if (!user || !['intern', 'staff'].includes(user.role)) {
        console.log('Skipping unit managers fetch - user role:', user?.role);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/recruits/unit-managers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnitManagers(data);
      }
    } catch (err) {
      console.error('Error fetching unit managers:', err);
    }
  };

  useEffect(() => {
    fetchRecruits();
    fetchUsers();
    fetchUnitManagers();
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
  const finalizeSchedule = async (payload: any) => {
    const { endpoint, body } = payload;
    const token = getToken();
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Request failed');
    }
    return response.json();
  };

  const initiateZoomConnect = async () => {
    try {
      setZoomConnecting(true);
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/zoom/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok && data.authUrl) {
        const w = 600, h = 740;
        const y = window.top!.outerHeight / 2 + window.top!.screenY - (h / 2);
        const x = window.top!.outerWidth / 2 + window.top!.screenX - (w / 2);
        const popup = window.open(data.authUrl, 'zoom-oauth', `width=${w},height=${h},left=${x},top=${y}`);

        const tokenHeader = { 'Authorization': `Bearer ${token}` };
        const poll = setInterval(async () => {
          try {
            const statusRes = await fetch(`${API_BASE_URL}/zoom/status`, { headers: tokenHeader });
            if (statusRes.ok) {
              const status = await statusRes.json();
              if (status?.details?.authenticated) {
                clearInterval(poll);
                popup?.close();
                setShowZoomPrompt(false);
                setZoomConnecting(false);
                if (pendingSchedulePayload) {
                  try {
                    const result = await finalizeSchedule(pendingSchedulePayload);
                    // Apply success handling similar to handleScheduleInterview
                    if (result.zoomMeeting && selectedRecruit) {
                      setSuccessData({ type: scheduleData.interviewType, zoomMeeting: result.zoomMeeting });
                      setShowSuccessModal(true);
                      setRecruits(recruits.map(r => r._id === selectedRecruit._id ? result.recruit : r));
                    }
                    setShowScheduleModal(false);
                    setSelectedRecruit(null);
                    setScheduleData({ 
                      interviewDate: '', 
                      interviewTime: '', 
                      interviewerId: '', 
                      interviewNotes: '',
                      interviewType: 'initial',
                      createZoomMeeting: false
                    });
                  } catch (e) {
                    console.error('Resume schedule error', e);
                    setError('Failed to resume scheduling after Zoom connect.');
                  } finally {
                    setPendingSchedulePayload(null);
                  }
                }
              }
            }
          } catch {}
        }, 1000);
      } else {
        setZoomConnecting(false);
        setError('Failed to get Zoom authorization URL.');
      }
    } catch (e) {
      setZoomConnecting(false);
      setError('Error initiating Zoom connection.');
    }
  };
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRecruit) return;

    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const endpoint = scheduleData.interviewType === 'initial' 
        ? `${API_BASE_URL}/recruits/${selectedRecruit._id}/schedule-initial`
        : `${API_BASE_URL}/recruits/${selectedRecruit._id}/schedule-final`;

      console.log('🔵 FRONTEND: Scheduling interview with data:', {
        ...scheduleData,
        recruitName: selectedRecruit.fullName,
        endpoint
      });

      const payload = {
        endpoint,
        body: {
          interviewDate: scheduleData.interviewDate,
          interviewTime: scheduleData.interviewTime,
          interviewerId: scheduleData.interviewerId,
          interviewNotes: scheduleData.interviewNotes,
          createZoomMeeting: scheduleData.createZoomMeeting
        }
      };

      let result;
      try {
        result = await finalizeSchedule(payload);
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('authRequired') || msg.includes('Zoom authentication required') || msg.includes('401')) {
          setPendingSchedulePayload(payload);
          setShowZoomPrompt(true);
          return;
        }
        throw err;
      }
      
      console.log('✅ FRONTEND: Interview scheduled successfully:', result);
      
      // Show success modal instead of alert
      if (result.zoomMeeting) {
        setSuccessData({
          type: scheduleData.interviewType,
          zoomMeeting: result.zoomMeeting
        });
        setShowSuccessModal(true);
      }
      
      setRecruits(recruits.map(r => r._id === selectedRecruit._id ? result.recruit : r));
      setShowScheduleModal(false);
      setSelectedRecruit(null);
      setScheduleData({ 
        interviewDate: '', 
        interviewTime: '', 
        interviewerId: '', 
        interviewNotes: '',
        interviewType: 'initial',
        createZoomMeeting: false
      });
      setError('');
    } catch (err) {
      console.error('❌ FRONTEND: Error scheduling interview:', err);
      setError(`Failed to schedule ${scheduleData.interviewType} interview. Please try again.`);
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

  // Handle complete interview
  const handleCompleteInterview = async (recruitId: string, interviewType: 'initial' | 'final', passed: boolean, notes: string = '', assignedTo?: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const endpoint = interviewType === 'initial' 
        ? `${API_BASE_URL}/recruits/${recruitId}/complete-initial`
        : `${API_BASE_URL}/recruits/${recruitId}/complete-final`;

      const body = interviewType === 'initial' 
        ? { passed, notes, finalInterviewAssignedTo: assignedTo }
        : { decision: passed ? 'hired' : 'rejected', notes };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to complete ${interviewType} interview`);
      }

      const result = await response.json();
      setRecruits(recruits.map(r => r._id === recruitId ? result.recruit : r));
      setError('');
    } catch (err) {
      console.error(`Error completing ${interviewType} interview:`, err);
      setError(`Failed to complete ${interviewType} interview. Please try again.`);
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
      source: '',
      dateApplied: new Date().toISOString().split('T')[0]
    });
    setSelectedFile(null);
  };

  // Send email functions
  const sendPassInitialEmail = async (recruitId: string, message?: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/pass-initial`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recruitId,
          message: message || 'Congratulations on passing your initial interview!'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send pass initial email');
      }

      const result = await response.json();
      console.log('✅ Pass initial email sent:', result);
      return true;
    } catch (err) {
      console.error('❌ Error sending pass initial email:', err);
      setError('Failed to send email notification. Please try again.');
      return false;
    }
  };

  const sendFailInitialEmail = async (recruitId: string, message?: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/fail-initial`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recruitId,
          message: message || 'Thank you for your time and interest in our company.'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send fail initial email');
      }

      const result = await response.json();
      console.log('✅ Fail initial email sent:', result);
      return true;
    } catch (err) {
      console.error('❌ Error sending fail initial email:', err);
      setError('Failed to send email notification. Please try again.');
      return false;
    }
  };

  const sendHireEmail = async (recruitId: string, jobDetails?: any) => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/hire`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recruitId,
          jobDetails: jobDetails || {
            startDate: 'To be determined',
            salary: 'Competitive package',
            benefits: 'Health, Dental, and other benefits',
            workLocation: 'Office/Remote',
            workArrangement: 'Full-time'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send hire email');
      }

      const result = await response.json();
      console.log('✅ Hire email sent:', result);
      return true;
    } catch (err) {
      console.error('❌ Error sending hire email:', err);
      setError('Failed to send email notification. Please try again.');
      return false;
    }
  };

  const sendRejectEmail = async (recruitId: string, message?: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/email/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recruitId,
          message: message || 'We appreciate your interest and wish you success in your career journey.'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send reject email');
      }

      const result = await response.json();
      console.log('✅ Reject email sent:', result);
      return true;
    } catch (err) {
      console.error('❌ Error sending reject email:', err);
      setError('Failed to send email notification. Please try again.');
      return false;
    }
  };

  // Combined handlers that complete interview and send email
  const handlePassInitialInterview = async (recruitId: string, assignedTo?: string) => {
    setEmailLoading(true);
    try {
      // First complete the interview
      await handleCompleteInterview(recruitId, 'initial', true, 'Passed initial interview', assignedTo);
      
      // Then send the email
      const emailSent = await sendPassInitialEmail(recruitId);
      
      if (emailSent) {
        alert('✅ Initial interview marked as passed and email notification sent!');
      } else {
        alert('⚠️ Interview completed but email notification failed. Please send manually.');
      }
    } catch (err) {
      console.error('Error in pass initial process:', err);
      setError('Failed to complete the pass initial process. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleFailInitialInterview = async (recruitId: string) => {
    if (!confirm('Are you sure you want to mark this candidate as failed and send a rejection email?')) {
      return;
    }
    
    setEmailLoading(true);
    try {
      // First complete the interview
      await handleCompleteInterview(recruitId, 'initial', false, 'Did not pass initial interview');
      
      // Then send the email
      const emailSent = await sendFailInitialEmail(recruitId);
      
      if (emailSent) {
        alert('✅ Initial interview marked as failed and email notification sent!');
      } else {
        alert('⚠️ Interview completed but email notification failed. Please send manually.');
      }
    } catch (err) {
      console.error('Error in fail initial process:', err);
      setError('Failed to complete the fail initial process. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleHireCandidate = async (recruitId: string) => {
    if (!confirm('Are you sure you want to hire this candidate and send a job offer email?')) {
      return;
    }
    
    setEmailLoading(true);
    try {
      // First complete the interview
      await handleCompleteInterview(recruitId, 'final', true, 'Candidate hired');
      
      // Then send the email
      const emailSent = await sendHireEmail(recruitId);
      
      if (emailSent) {
        alert('🎉 Candidate hired and job offer email sent!');
      } else {
        alert('⚠️ Candidate hired but email notification failed. Please send manually.');
      }
    } catch (err) {
      console.error('Error in hire process:', err);
      setError('Failed to complete the hire process. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRejectCandidate = async (recruitId: string) => {
    if (!confirm('Are you sure you want to reject this candidate and send a rejection email?')) {
      return;
    }
    
    setEmailLoading(true);
    try {
      // First complete the interview
      await handleCompleteInterview(recruitId, 'final', false, 'Candidate rejected');
      
      // Then send the email
      const emailSent = await sendRejectEmail(recruitId);
      
      if (emailSent) {
        alert('✅ Candidate rejected and email notification sent!');
      } else {
        alert('⚠️ Candidate rejected but email notification failed. Please send manually.');
      }
    } catch (err) {
      console.error('Error in reject process:', err);
      setError('Failed to complete the reject process. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Applied': return 'bg-blue-500/20 text-blue-400';
      case 'Pending': return 'bg-orange-500/20 text-orange-400'; // For scheduled interviews
      case 'Pending Final Interview': return 'bg-blue-500/20 text-blue-400'; // Awaiting final interview
      case 'Interviewed': return 'bg-yellow-500/20 text-yellow-400';
      case 'Hired': return 'bg-green-500/20 text-green-400';
      case 'Rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Get status display text
  const getStatusDisplayText = (recruit: Recruit) => {
    if (recruit.applicationStatus === 'Pending' && (recruit.interviewDate || recruit.initialInterviewDate || recruit.finalInterviewDate)) {
      return 'Interview Scheduled';
    }
    if (recruit.applicationStatus === 'Pending Final Interview') {
      return 'Awaiting Final Interview';
    }
    return recruit.applicationStatus;
  };

  // Determine what kind of interview can be scheduled
  const getAvailableInterviewType = (recruit: Recruit, userRole: string) => {
    const currentUser = getCurrentUser();
    
    // If initial interview not completed, only intern/staff can schedule initial
    if (!recruit.initialInterviewCompleted && ['intern', 'staff'].includes(userRole)) {
      return 'initial';
    }
    // If initial completed but final not scheduled/completed, only assigned unit_manager can schedule final
    if (recruit.initialInterviewCompleted && !recruit.finalInterviewCompleted && 
        userRole === 'unit_manager' && 
        recruit.finalInterviewAssignedTo?._id === currentUser?.userId) {
      return 'final';
    }
    // If both completed or user doesn't have permission
    return null;
  };

  // Get interview status info for display
  const getInterviewStatusInfo = (recruit: Recruit) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return { text: 'Not scheduled', canSchedule: false };

    const availableType = getAvailableInterviewType(recruit, currentUser.role);
    
    if (recruit.finalInterviewCompleted) {
      return { text: 'Interviews Completed', canSchedule: false };
    }
    
    if (recruit.finalInterviewDate && !recruit.finalInterviewCompleted) {
      // Parse date-only strings as local dates to avoid timezone issues
      const date = recruit.finalInterviewDate.includes('T') ? 
        new Date(recruit.finalInterviewDate) : 
        (() => {
          const [year, month, day] = recruit.finalInterviewDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })();
        
      let subText = recruit.finalInterviewer?.name || '';
      // Add Zoom meeting info if available
      if (recruit.finalInterviewZoomJoinUrl) {
        subText += subText ? '\n' : '';
        subText += `<a href="${recruit.finalInterviewZoomJoinUrl}" target="_blank" rel="noopener noreferrer" class='underline text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold'>Join Zoom Meeting</a>`;
      }
        
      return {
        text: `Final: ${date.toLocaleDateString()} ${recruit.finalInterviewTime}`,
        subText,
        canSchedule: currentUser.role === 'unit_manager' && recruit.finalInterviewAssignedTo?._id === currentUser.userId
      };
    }
    
    if (recruit.initialInterviewCompleted && recruit.applicationStatus === 'Pending Final Interview') {
      const assignedText = recruit.finalInterviewAssignedTo 
        ? `Assigned to: ${recruit.finalInterviewAssignedTo.name}`
        : 'Not assigned';
      return {
        text: 'Awaiting Final Interview',
        subText: assignedText,
        canSchedule: currentUser.role === 'unit_manager' && recruit.finalInterviewAssignedTo?._id === currentUser.userId
      };
    }
    
    if (recruit.initialInterviewDate && !recruit.initialInterviewCompleted) {
      // Parse date-only strings as local dates to avoid timezone issues
      const date = recruit.initialInterviewDate.includes('T') ? 
        new Date(recruit.initialInterviewDate) : 
        (() => {
          const [year, month, day] = recruit.initialInterviewDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })();
        
      let subText = recruit.initialInterviewer?.name || '';
      // Add Zoom meeting info if available
      if (recruit.initialInterviewZoomJoinUrl) {
        subText += subText ? '\n' : '';
        subText += `<a href="${recruit.initialInterviewZoomJoinUrl}" target="_blank" rel="noopener noreferrer" class='underline text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold'>Join Zoom Meeting</a>`;
      }
        
      return {
        text: `Initial: ${date.toLocaleDateString()} ${recruit.initialInterviewTime}`,
        subText,
        canSchedule: ['intern', 'staff'].includes(currentUser.role)
      };
    }
    
    if (!recruit.initialInterviewDate && availableType === 'initial') {
      return { text: 'Not scheduled', canSchedule: true };
    }
    
    return { text: 'Not scheduled', canSchedule: false };
  };

  // Format role for display
  const formatRole = (role: string) => {
    if (!role) return '';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
      <ZoomAuthPrompt
        open={showZoomPrompt}
        onClose={() => setShowZoomPrompt(false)}
        onConnect={initiateZoomConnect}
        connecting={zoomConnecting}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Recruits Management</h2>
          <p className="text-gray-400">Manage applicants and schedule interviews</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center space-x-2"
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
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white'
          }}
        >
          <option value="all" style={{ backgroundColor: '#1f2937', color: 'white' }}>All Status</option>
          <option value="Applied" style={{ backgroundColor: '#1f2937', color: 'white' }}>Applied</option>
          <option value="Pending" style={{ backgroundColor: '#1f2937', color: 'white' }}>Pending Interview</option>
          <option value="Pending Final Interview" style={{ backgroundColor: '#1f2937', color: 'white' }}>Pending Final Interview</option>
          <option value="Interviewed" style={{ backgroundColor: '#1f2937', color: 'white' }}>Interviewed</option>
          <option value="Hired" style={{ backgroundColor: '#1f2937', color: 'white' }}>Hired</option>
          <option value="Rejected" style={{ backgroundColor: '#1f2937', color: 'white' }}>Rejected</option>
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
                      {recruit.source && (
                        <div className="text-blue-400 text-xs mt-1 bg-blue-500/20 px-2 py-1 rounded-full inline-block">
                          Source: {recruit.source}
                        </div>
                      )}
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
                    <div className="flex flex-col space-y-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block text-center ${getStatusColor(recruit.applicationStatus)}`}>
                        {getStatusDisplayText(recruit)}
                      </span>
                      <select
                        value={recruit.applicationStatus}
                        onChange={(e) => handleStatusUpdate(recruit._id, e.target.value)}
                        className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Applied" style={{ backgroundColor: '#1f2937', color: 'white' }}>Applied</option>
                        <option value="Pending" style={{ backgroundColor: '#1f2937', color: 'white' }}>Pending Interview</option>
                        <option value="Pending Final Interview" style={{ backgroundColor: '#1f2937', color: 'white' }}>Pending Final Interview</option>
                        <option value="Interviewed" style={{ backgroundColor: '#1f2937', color: 'white' }}>Interviewed</option>
                        <option value="Hired" style={{ backgroundColor: '#1f2937', color: 'white' }}>Hired</option>
                        <option value="Rejected" style={{ backgroundColor: '#1f2937', color: 'white' }}>Rejected</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const interviewInfo = getInterviewStatusInfo(recruit);
                      return (
                        <div>
                          <div className="text-white text-sm">
                            {interviewInfo.text}
                          </div>
                          {interviewInfo.subText && (
                            <div className="text-gray-400 text-sm" dangerouslySetInnerHTML={{ __html: interviewInfo.subText.replace(/\n/g, '<br/>') }} />
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-2">
                      {(() => {
                        const currentUser = getCurrentUser();
                        const interviewInfo = getInterviewStatusInfo(recruit);
                        const availableType = currentUser ? getAvailableInterviewType(recruit, currentUser.role) : null;
                        
                        return (
                          <>
                            <div className="flex space-x-2">
                              {interviewInfo.canSchedule && availableType && (
                                <button
                                  onClick={() => {
                                    setSelectedRecruit(recruit);
                                    const isInitial = availableType === 'initial';
                                    setScheduleData({
                                      interviewDate: isInitial 
                                        ? (recruit.initialInterviewDate ? recruit.initialInterviewDate.split('T')[0] : '')
                                        : (recruit.finalInterviewDate ? recruit.finalInterviewDate.split('T')[0] : ''),
                                      interviewTime: isInitial ? (recruit.initialInterviewTime || '') : (recruit.finalInterviewTime || ''),
                                      interviewerId: isInitial 
                                        ? (recruit.initialInterviewer?._id || '')
                                        : (recruit.finalInterviewer?._id || ''),
                                      interviewNotes: isInitial 
                                        ? (recruit.initialInterviewNotes || '')
                                        : (recruit.finalInterviewNotes || ''),
                                      interviewType: availableType,
                                      createZoomMeeting: false
                                    });
                                    setShowScheduleModal(true);
                                  }}
                                  className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                                >
                                  {availableType === 'initial' ? 'Schedule Initial' : 'Schedule Final'}
                                </button>
                              )}
                              
                              {recruit.resumeUrl && (
                                <button
                                  onClick={() => handleResumePreview(recruit)}
                                  className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                                  title="Opens resume in new tab"
                                >
                                  📄 Open Resume
                                </button>
                              )}
                            </div>
                            
                            {/* Complete Interview Buttons */}
                            {(recruit.initialInterviewDate && !recruit.initialInterviewCompleted && 
                              ['intern', 'staff'].includes(currentUser?.role || '')) && (
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => {
                                    setSelectedRecruit(recruit);
                                    setShowAssignModal(true);
                                  }}
                                  className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                                  title="Pass Initial Interview"
                                >
                                  ✓ Pass Initial
                                </button>
                                <button
                                  onClick={() => handleFailInitialInterview(recruit._id)}
                                  disabled={loading || emailLoading}
                                  className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                  title="Fail Initial Interview"
                                >
                                  {emailLoading ? 'Sending...' : '✗ Fail Initial'}
                                </button>
                              </div>
                            )}
                            
                            {(recruit.finalInterviewDate && !recruit.finalInterviewCompleted && 
                              currentUser?.role === 'unit_manager') && (
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleHireCandidate(recruit._id)}
                                  disabled={loading || emailLoading}
                                  className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors disabled:opacity-50"
                                  title="Hire Candidate"
                                >
                                  {emailLoading ? 'Sending...' : '✓ Hire'}
                                </button>
                                <button
                                  onClick={() => handleRejectCandidate(recruit._id)}
                                  disabled={loading || emailLoading}
                                  className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                  title="Reject Candidate"
                                >
                                  {emailLoading ? 'Sending...' : '✗ Reject'}
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
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
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UNDERGRAD" style={{ backgroundColor: '#1f2937', color: 'white' }}>Undergraduate</option>
                    <option value="GRADUATE" style={{ backgroundColor: '#1f2937', color: 'white' }}>Graduate</option>
                    <option value="GRADUATING" style={{ backgroundColor: '#1f2937', color: 'white' }}>Graduating</option>
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
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Source
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select Source</option>
                    <option value="Job Portal" style={{ backgroundColor: '#1f2937', color: 'white' }}>Job Portal</option>
                    <option value="LinkedIn" style={{ backgroundColor: '#1f2937', color: 'white' }}>LinkedIn</option>
                    <option value="Facebook" style={{ backgroundColor: '#1f2937', color: 'white' }}>Facebook</option>
                    <option value="Company Website" style={{ backgroundColor: '#1f2937', color: 'white' }}>Company Website</option>
                    <option value="Employee Referral" style={{ backgroundColor: '#1f2937', color: 'white' }}>Employee Referral</option>
                    <option value="University/School" style={{ backgroundColor: '#1f2937', color: 'white' }}>University/School</option>
                    <option value="Walk-in" style={{ backgroundColor: '#1f2937', color: 'white' }}>Walk-in</option>
                    <option value="Indeed" style={{ backgroundColor: '#1f2937', color: 'white' }}>Indeed</option>
                    <option value="JobStreet" style={{ backgroundColor: '#1f2937', color: 'white' }}>JobStreet</option>
                    <option value="Other" style={{ backgroundColor: '#1f2937', color: 'white' }}>Other</option>
                  </select>
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
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:cursor-pointer hover:file:bg-blue-600"
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
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
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
              <h3 className="text-xl font-semibold text-white">
                Schedule {scheduleData.interviewType === 'initial' ? 'Initial' : 'Final'} Interview
              </h3>
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
              {scheduleData.interviewType === 'final' && (
                <p className="text-yellow-400 text-sm mt-1">
                  ✓ Initial interview completed
                </p>
              )}
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
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Interviewer
                </label>
                <select
                  value={scheduleData.interviewerId}
                  onChange={(e) => setScheduleData({ ...scheduleData, interviewerId: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select Interviewer</option>
                  {users
                    .filter(user => {
                      // For initial interviews, show intern and staff
                      if (scheduleData.interviewType === 'initial') {
                        return ['intern', 'staff'].includes(user.role);
                      }
                      // For final interviews, show unit managers
                      if (scheduleData.interviewType === 'final') {
                        return user.role === 'unit_manager';
                      }
                      return false;
                    })
                    .map((user) => (
                    <option key={user._id} value={user._id} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                      {user.name} - {formatRole(user.role)}
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
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Video Conference
                </label>
                <button
                  type="button"
                  aria-pressed={scheduleData.createZoomMeeting}
                  onClick={() => setScheduleData({ ...scheduleData, createZoomMeeting: !scheduleData.createZoomMeeting })}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-secondary border border-primary/40 shadow-md
                    ${scheduleData.createZoomMeeting
                      ? 'bg-primary text-white ring-2 ring-secondary animate-pulse shadow-[0_0_8px_2px_rgb(var(--color-primary))]'
                      : 'bg-white/10 text-secondary hover:bg-secondary/20'}
                  `}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 32 32"
                    width="20"
                    height="20"
                    className="mr-2"
                  >
                    <rect width="32" height="32" rx="8" className="fill-primary" />
                    <path
                      d="M23.5 13.5l3.5-2.5v9l-3.5-2.5v-4zm-1.5-2c.828 0 1.5.672 1.5 1.5v8c0 .828-.672 1.5-1.5 1.5h-12c-.828 0-1.5-.672-1.5-1.5v-8c0-.828.672-1.5 1.5-1.5h12z"
                      className="fill-white"
                    />
                  </svg>
                  {scheduleData.createZoomMeeting ? 'Zoom Meeting Enabled' : 'Enable Zoom Meeting'}
                </button>
              </div>
              {scheduleData.createZoomMeeting && (
                <div className="text-sm text-accent bg-secondary/10 border border-secondary/20 rounded-lg p-3 mt-2">
                  <div className="flex items-center space-x-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      className="text-secondary"
                    >
                      <circle cx="12" cy="12" r="10" className="fill-primary" />
                      <text x="12" y="16" textAnchor="middle" fontSize="12" className="fill-white">
                        i
                      </text>
                    </svg>
                    <span>A Zoom meeting will be automatically created and the applicant will receive an email invitation with meeting details and calendar invite.</span>
                  </div>
                </div>
              )}

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
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
                >
                  Schedule {scheduleData.interviewType === 'initial' ? 'Initial' : 'Final'} Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal for Final Interview */}
      {showAssignModal && selectedRecruit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Assign Final Interview</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedRecruit(null);
                  setSelectedUnitManager('');
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
              <p className="text-green-400 text-sm mt-1">✓ Passing initial interview</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Assign Final Interview To *
                </label>
                <select
                  value={selectedUnitManager}
                  onChange={(e) => setSelectedUnitManager(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select Unit Manager</option>
                  {unitManagers.map((manager) => (
                    <option key={manager._id} value={manager._id} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedRecruit(null);
                    setSelectedUnitManager('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedUnitManager) {
                      setError('Please select a unit manager to assign the final interview to.');
                      return;
                    }
                    handlePassInitialInterview(selectedRecruit._id, selectedUnitManager);
                    setShowAssignModal(false);
                    setSelectedRecruit(null);
                    setSelectedUnitManager('');
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
                  disabled={!selectedUnitManager || loading || emailLoading}
                >
                  {emailLoading ? 'Sending...' : 'Pass & Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✨ SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                🎯 Interview Scheduled Successfully!
              </h3>
              
              {/* Details */}
              {successData && successData.zoomMeeting && (
                <div className="text-sm text-gray-600 mb-6 space-y-2">
                  <p><strong>Meeting ID:</strong> {successData.zoomMeeting.meetingId}</p>
                  <p><strong>Join URL:</strong></p>
                  <div className="bg-blue-50 p-2 rounded text-xs font-mono break-all">
                    {successData.zoomMeeting.joinUrl}
                  </div>
                  {successData.zoomMeeting.password && (
                    <p><strong>Password:</strong> <span className="font-mono">{successData.zoomMeeting.password}</span></p>
                  )}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex space-x-3 justify-center">
                {successData?.zoomMeeting?.joinUrl && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(successData.zoomMeeting.joinUrl);
                      // Could add a toast notification here
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    📋 Copy Link
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessData(null);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

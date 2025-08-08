'use client';

import { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import { getUserFromToken, getToken } from "@/utils/auth";
import { API_BASE_URL } from "@/config/api";

interface ZoomConnectionStatus {
  connected: boolean;
  userId?: string;
  email?: string;
}

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [zoomStatus, setZoomStatus] = useState<ZoomConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const userData = getUserFromToken(token);
      setUser(userData);
      checkZoomConnection();
    }
  }, []);

  const checkZoomConnection = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/zoom/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setZoomStatus(data);
      }
    } catch (error) {
      console.error('Error checking Zoom connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectZoom = async () => {
    setConnecting(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/zoom/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Zoom OAuth
        window.location.href = data.authUrl;
      } else {
        alert('Failed to connect to Zoom. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting to Zoom:', error);
      alert('Error connecting to Zoom. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectZoom = async () => {
    if (!confirm('Are you sure you want to disconnect your Zoom account? You will no longer be able to host Zoom meetings through the system.')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/zoom/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setZoomStatus({ connected: false });
        alert('Zoom account disconnected successfully.');
      } else {
        alert('Failed to disconnect Zoom account. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting Zoom:', error);
      alert('Error disconnecting Zoom. Please try again.');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>
              
              {/* User Information */}
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Name</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.name || 'Loading...'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Role</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{user?.role?.replace('_', ' ') || 'Loading...'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Employee ID</label>
                      <p className="mt-1 text-sm text-gray-900">{user?.employeeId || 'Loading...'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">User ID</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono text-xs">{user?.userId || 'Loading...'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zoom Integration */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Zoom Integration</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Checking Zoom connection...</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full mr-2 ${zoomStatus.connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="text-sm font-medium">
                            {zoomStatus.connected ? 'Connected to Zoom' : 'Not connected to Zoom'}
                          </span>
                        </div>
                        {zoomStatus.connected ? (
                          <button
                            onClick={disconnectZoom}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={connectZoom}
                            disabled={connecting}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {connecting ? 'Connecting...' : 'Connect Zoom'}
                          </button>
                        )}
                      </div>
                      
                      {zoomStatus.connected && zoomStatus.email && (
                        <div className="text-sm text-gray-600">
                          <p>Connected as: <span className="font-medium">{zoomStatus.email}</span></p>
                        </div>
                      )}
                      
                      <div className="mt-4 text-sm text-gray-500">
                        <p className="mb-2">
                          <strong>Why connect your Zoom account?</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Host interview meetings from your own Zoom account</li>
                          <li>Meetings appear in your personal Zoom dashboard</li>
                          <li>Better meeting management and recording access</li>
                          <li>Eliminates dependency on shared system accounts</li>
                        </ul>
                        {!zoomStatus.connected && (
                          <p className="mt-3 text-amber-600">
                            <strong>Note:</strong> If you don't connect your Zoom account, the system will use fallback credentials when creating meetings.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Back to Dashboard */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ← Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

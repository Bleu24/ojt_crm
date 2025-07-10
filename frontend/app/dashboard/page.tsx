'use client';

import { useState, useEffect, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import DTRSystem from "@/components/DTRSystem";
import SupervisionManager from "@/components/SupervisionManager";
import TeamReports from "@/components/TeamReports";
import TeamStatus from "@/components/TeamStatus";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import RecruitsManagement from "@/components/RecruitsManagement";
import { removeToken, getToken, getUserFromToken } from "@/utils/auth";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user info from token
  useEffect(() => {
    const token = getToken();
    if (token) {
      const userData = getUserFromToken(token);
      setUser(userData);
      // Set default tab based on user role
      if (userData.role === 'staff') {
        setActiveTab('dtr');
      } else if (userData.role === 'intern') {
        setActiveTab('recruits'); // Intern defaults to recruits tab
      } else if (userData.role === 'unit_manager') {
        setActiveTab('reports');
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  const stats = [
    { title: 'Total Users', value: '2,543', change: '+12.5%', positive: true },
    { title: 'Active Recruits', value: '1,247', change: '+8.2%', positive: true },
    { title: 'Posts Created', value: '89', change: '+23.1%', positive: true },
    { title: 'Revenue', value: '$45,230', change: '-2.4%', positive: false },
  ];

  const recentActivities = [
    { action: 'New user registered', user: 'John Doe', time: '2 mins ago' },
    { action: 'Post published', user: 'Sarah Johnson', time: '5 mins ago' },
    { action: 'Recruit approved', user: 'Mike Chen', time: '12 mins ago' },
    { action: 'DTR submitted', user: 'Emma Wilson', time: '1 hour ago' },
  ];

  const handleLogout = () => {
    removeToken();
    router.push('/');
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowProfileDropdown(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowProfileDropdown(false);
    }, 150); // 150ms delay
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRole = (role: string) => {
    if (!role) return '';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isUnitManager = () => {
    return user?.role === 'unit_manager';
  };

  const isStaffOrIntern = () => {
    return user?.role === 'staff' || user?.role === 'intern';
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      
      {/* Header */}
      <header className="relative z-[100] border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs sm:text-sm">C</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-white">CRM Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              
              {/* Profile Dropdown */}
              <div 
                ref={dropdownRef}
                className="relative z-[101]"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  id="profile-button"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowProfileDropdown(!showProfileDropdown);
                    }
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm hover:from-emerald-500 hover:to-cyan-500 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
                  aria-expanded={showProfileDropdown}
                  aria-haspopup="true"
                  aria-label="User profile menu"
                >
                  {user ? getInitials(user.name) : 'U'}
                </button>
                
                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <div 
                    className="absolute right-0 top-full mt-1 w-56 sm:w-64 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-2xl"
                    style={{ zIndex: 99999 }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="profile-button"
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-semibold">
                          {user ? getInitials(user.name) : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {user ? user.name : 'Loading...'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {user ? user.email : ''}
                          </p>
                          <p className="text-xs text-purple-400">
                            {user ? formatRole(user.role) : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t border-white/10 pt-3">
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            // Add profile settings logic here
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center"
                          role="menuitem"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile Settings
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            handleLogout();
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center"
                          role="menuitem"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="relative z-[5] border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 sm:space-x-8 overflow-x-auto">
            {isAdmin() ? (
              // Admin navigation
              ['dashboard', 'users', 'recruits', 'posts', 'analytics'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm capitalize transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-purple-400 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {tab}
                </button>
              ))
            ) : isUnitManager() ? (
              // Unit Manager navigation (added recruits for final interviews)
              ['reports', 'recruits', 'analytics', 'team', 'supervision'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm capitalize transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-purple-400 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {tab === 'supervision' ? 'Manage Team' : tab}
                </button>
              ))
            ) : (
              // Staff/Intern navigation (DTR and Recruits for intern and staff)
              (user?.role === 'intern' || user?.role === 'staff') ? 
                ['dtr', 'recruits', 'history'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm capitalize transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'border-purple-400 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {tab === 'dtr' ? 'Time Record' : tab}
                  </button>
                )) :
                // Other staff/intern roles (DTR only)
                ['dtr', 'history'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm capitalize transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'border-purple-400 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {tab === 'dtr' ? 'Time Record' : tab}
                  </button>
                ))
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-[5] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {isAdmin() ? (
          // Admin Dashboard Content
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 sm:p-6 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-300 mb-2">{stat.title}</h3>
                        <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className={`text-xs px-3 py-1 rounded-full flex-shrink-0 ml-4 ${
                        stat.positive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {stat.change}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Chart Area */}
              <div className="lg:col-span-2">
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Analytics Overview</h3>
                    <div className="h-48 sm:h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <p className="text-sm sm:text-base text-gray-300">Chart visualization will be displayed here</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Recent Activities</h3>
                  <div className="space-y-3 sm:space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3 p-2 sm:p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-white font-medium truncate">{activity.action}</p>
                          <p className="text-xs text-gray-400 truncate">by {activity.user}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 sm:mt-8">
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { title: 'Add User', icon: '👤', color: 'from-blue-500 to-purple-500' },
                      { title: 'Create Post', icon: '📝', color: 'from-emerald-500 to-cyan-500' },
                      { title: 'Review Recruits', icon: '🎯', color: 'from-orange-500 to-red-500' },
                      { title: 'Generate Report', icon: '📊', color: 'from-pink-500 to-rose-500' },
                    ].map((action, index) => (
                      <button
                        key={index}
                        className="group/btn relative overflow-hidden rounded-xl p-4 sm:p-6 bg-white/5 hover:bg-white/10 border border-white/20 transition-all duration-300 hover:scale-105"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-0 group-hover/btn:opacity-20 transition-opacity`}></div>
                        <div className="relative text-center">
                          <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{action.icon}</div>
                          <div className="text-sm sm:text-base font-medium text-white">{action.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : isUnitManager() ? (
          // Unit Manager Dashboard Content
          <>
            {activeTab === 'reports' && <TeamReports />}
            {activeTab === 'recruits' && <RecruitsManagement />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
            {activeTab === 'team' && <TeamStatus />}
            {activeTab === 'supervision' && <SupervisionManager />}
          </>
        ) : (
          // Staff/Intern DTR Content
          <>
            {activeTab === 'dtr' && <DTRSystem />}
            {activeTab === 'recruits' && <RecruitsManagement />}
            {activeTab === 'history' && (
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Work History</h3>
                  <div className="text-center text-gray-400 py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <p className="text-base">Detailed work history and reports will be available here</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
    </AuthGuard>
  );
}

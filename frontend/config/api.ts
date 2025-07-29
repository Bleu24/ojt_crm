// API Configuration for all environments
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Additional environment-specific configurations
export const APP_ENV = process.env.NODE_ENV || 'development';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout'
  },
  USERS: '/users',
  DTR: '/dtr',
  RECRUITS: '/recruits',
  POSTS: '/posts',
  REPORTS: '/reports',
  NAP_REPORT: {
    BASE: '/nap-report',
    UPLOAD: '/nap-report/upload',
    EXPORT: '/nap-report/export'
  }
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Environment check helpers
export const isProduction = APP_ENV === 'production';
export const isDevelopment = APP_ENV === 'development';

// Console logging helper (only logs in development)
export const devLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log('[DEV]', ...args);
  }
};

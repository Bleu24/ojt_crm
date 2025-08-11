'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl, devLog } from '@/config/api';
import { getToken } from '@/utils/auth';

interface NapRow {
  _id?: string;
  agentName: string;
  month: string;
  cc: number;
  sale: number;
  lapsed: number;
  createdAt?: string;
}

interface ApiResponse {
  message: string;
  records: NapRow[];
}

export default function NapReport() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<NapRow[]>([]);
  const [allReports, setAllReports] = useState<NapRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const res = await fetch(buildApiUrl(API_ENDPOINTS.NAP_REPORT.BASE), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch reports: ${res.status}`);
      }

      const reports: NapRow[] = await res.json();
      setAllReports(reports);
      
      // Extract unique months
      const months = [...new Set(reports.map(report => report.month))];
      setAvailableMonths(months);
      
      setData(reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file to upload');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('pdfFile', file);

      const res = await fetch(buildApiUrl(API_ENDPOINTS.NAP_REPORT.UPLOAD), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Upload failed: ${res.status}`);
      }

      const result: ApiResponse = await res.json();
      setSuccess('NAP report uploaded and parsed successfully');
      setFile(null);
      
      // Refresh the reports list
      await fetchReports();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async (exportType: 'single' | 'all' = 'single') => {
    if (exportType === 'single' && !selectedMonth) {
      setError('Please select a month to export');
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build the URL based on export type
      let url = buildApiUrl(API_ENDPOINTS.NAP_REPORT.EXPORT);
      let filename = 'NAP_Report_All_Months.xlsx';
      
      if (exportType === 'single' && selectedMonth) {
        url += `?month=${selectedMonth}`;
        filename = `NAP_Report_${selectedMonth}.xlsx`;
      } else if (exportType === 'all') {
        url += '?view=total';
        filename = 'NAP_Report_All_Months.xlsx';
      }

      devLog('Exporting NAP report:', { exportType, url, filename });

      // Create a temporary link to download the file with proper headers
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccess(`Export completed successfully: ${filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const clearTable = async () => {
    if (!window.confirm('Are you sure you want to clear all NAP report data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await fetch(buildApiUrl(API_ENDPOINTS.NAP_REPORT.BASE + '/clear'), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Clear failed: ${res.status}`);
      }

      const result = await res.json();
      setSuccess(result.message);
      
      // Clear local state
      setData([]);
      setAllReports([]);
      setAvailableMonths([]);
      setSelectedMonth('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear table');
    } finally {
      setLoading(false);
    }
  };  const handleMonthFilter = (month: string) => {
    setSelectedMonth(month);
    if (month) {
      setData(allReports.filter(report => report.month === month));
    } else {
      setData(allReports);
    }
  };

  // Calculate totals for the current displayed data
  const calculateTotals = () => {
    return data.reduce((totals, row) => {
      totals.totalCC += row.cc || 0;
      totals.totalSale += row.sale || 0;
      totals.totalLapsed += row.lapsed || 0;
      return totals;
    }, { totalCC: 0, totalSale: 0, totalLapsed: 0 });
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Background gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-500/10 to-cyan-500/10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      
      <div className="mac-card relative z-[5] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">NAP Report Management</h1>
          <p className="text-gray-400">Upload and manage Network, API, and Productivity reports</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-rose-600/20 rounded-xl blur opacity-75"></div>
            <div className="relative backdrop-blur-xl bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-red-300 font-medium">{error}</span>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-xl blur opacity-75"></div>
            <div className="relative backdrop-blur-xl bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-emerald-300 font-medium">{success}</span>
                </div>
                <button 
                  onClick={() => setSuccess(null)}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="mb-6 sm:mb-8 group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Upload NAP Report</h2>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select PDF File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer bg-white/5 border border-white/20 rounded-lg"
                  />
                </div>
                {file && (
                  <p className="mt-2 text-sm text-gray-400">
                    Selected: {file.name}
                  </p>
                )}
              </div>
              
              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Summarize</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-xl font-semibold text-white">
                NAP Reports {selectedMonth && `- ${selectedMonth}`}
              </h2>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Month Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Filter by Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthFilter(e.target.value)}
                    className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Months</option>
                    {availableMonths.map((month) => (
                      <option key={month} value={month} className="bg-gray-800">
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Export Buttons */}
                <div className="flex flex-col space-y-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1 opacity-0">
                    Actions
                  </label>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => exportExcel('single')}
                      disabled={!selectedMonth}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export Month</span>
                    </button>
                    
                    <button
                      onClick={() => exportExcel('all')}
                      disabled={allReports.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      <span>Export All</span>
                    </button>

                    <button
                      onClick={clearTable}
                      disabled={allReports.length === 0 || loading}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-lg hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Clear Table</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loading && !file ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <svg className="animate-spin w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-gray-300">Loading reports...</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                        Agent Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 uppercase tracking-wider">
                        CC
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 uppercase tracking-wider">
                        SALE
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 uppercase tracking-wider">
                        LAPSED
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-gray-300 text-lg font-medium">No reports available</p>
                            <p className="text-gray-500 text-sm mt-1">Upload a PDF file to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {data.map((row, idx) => (
                          <tr 
                            key={row._id || idx} 
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="px-4 py-4 text-white font-medium">
                              {row.agentName}
                            </td>
                            <td className="px-4 py-4 text-gray-300">
                              {row.month}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                                {row.cc}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
                                {row.sale}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                row.lapsed 
                                  ? 'bg-red-500/20 text-red-300' 
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {row.lapsed}
                              </span>
                            </td>
                          </tr>
                        ))}
                        
                        {/* Totals Row */}
                        <tr className="border-t-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
                          <td className="px-4 py-4 text-yellow-300 font-bold text-lg">
                            TOTALS
                          </td>
                          <td className="px-4 py-4 text-gray-400 italic">
                            {selectedMonth || 'All Months'}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-600/30 text-blue-200 border border-blue-400/30">
                              {totals.totalCC}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-600/30 text-emerald-200 border border-emerald-400/30">
                              {totals.totalSale.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${
                              totals.totalLapsed > 0
                                ? 'bg-red-600/30 text-red-200 border-red-400/30' 
                                : 'bg-emerald-600/30 text-emerald-200 border-emerald-400/30'
                            }`}>
                              {totals.totalLapsed.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

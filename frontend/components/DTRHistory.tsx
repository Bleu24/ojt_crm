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

export default function DTRHistory() {
  const [entries, setEntries] = useState<DTREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingEntry, setEditingEntry] = useState<DTREntry | null>(null);
  const [editAccomplishment, setEditAccomplishment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{processed: number, errors: string[]} | null>(null);

  // Fetch all DTR entries
  const fetchDTREntries = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/dtr/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch DTR entries');
      }

      const data = await response.json();
      setEntries(Array.isArray(data.entries) ? data.entries : Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Error fetching DTR entries:', err);
      setError('Failed to load DTR history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDTREntries();
  }, []); // Only fetch once on mount

  // Update accomplishment
  const handleUpdateAccomplishment = async () => {
    if (!editingEntry) return;

    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/dtr/${editingEntry._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accomplishment: editAccomplishment
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update accomplishment');
      }

      const updatedEntry = await response.json();
      
      // Update the entries list
      setEntries(prevEntries => 
        Array.isArray(prevEntries) ? prevEntries.map(entry => 
          entry._id === editingEntry._id 
            ? { ...entry, accomplishment: editAccomplishment }
            : entry
        ) : []
      );

      // Close editing modal
      setEditingEntry(null);
      setEditAccomplishment('');
      setError('');
    } catch (err) {
      console.error('Error updating accomplishment:', err);
      setError('Failed to update accomplishment. Please try again.');
    }
  };

  // Start editing accomplishment
  const startEditingAccomplishment = (entry: DTREntry) => {
    setEditingEntry(entry);
    setEditAccomplishment(entry.accomplishment || '');
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    
    // Parse the date string more carefully to avoid timezone issues
    let date: Date;
    
    if (dateString.includes('T')) {
      // ISO datetime string
      date = new Date(dateString);
    } else {
      // Date-only string (YYYY-MM-DD) - parse as local date to avoid timezone shift
      const [year, month, day] = dateString.split('-').map(Number);
      if (year && month && day) {
        date = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        date = new Date(dateString);
      }
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const time = new Date(timeString);
    if (isNaN(time.getTime())) return '';
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter entries based on search term and date
  const filteredEntries = Array.isArray(entries) ? entries.filter(entry => {
    let matchesSearch = true;
    let matchesDate = true;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesSearch = (
        entry.accomplishment?.toLowerCase().includes(searchLower) ||
        formatDate(entry.date).toLowerCase().includes(searchLower)
      );
    }

    // Date filter
    if (dateFilter) {
      let entryDate: Date;
      
      if (entry.date.includes('T')) {
        // ISO datetime string
        entryDate = new Date(entry.date);
      } else {
        // Date-only string - parse as local date
        const [year, month, day] = entry.date.split('-').map(Number);
        if (year && month && day) {
          entryDate = new Date(year, month - 1, day);
        } else {
          entryDate = new Date(entry.date);
        }
      }
      
      if (!isNaN(entryDate.getTime())) {
        const entryDateString = entryDate.toISOString().split('T')[0];
        matchesDate = entryDateString === dateFilter;
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesDate;
  }) : [];

  // Import functions
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);
    
    try {
      let data: any[] = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        data = await parseCSVFile(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        data = await parseExcelFile(file);
      } else if (fileName.endsWith('.json')) {
        data = await parseJSONFile(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV, XLSX, or JSON files.');
      }

      // Process and validate data
      const results = await processImportData(data);
      setImportResults(results);
      
      // Refresh DTR entries after successful import
      if (results.processed > 0) {
        await fetchDTREntries();
      }

    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const parseCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }
          
          // Parse CSV with proper quote handling
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            
            result.push(current.trim());
            return result;
          };
          
          const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').toLowerCase().trim());
          
          // Validate required headers
          const requiredHeaders = ['date', 'timein'];
          const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
          
          if (missingHeaders.length > 0) {
            reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}. Please ensure your CSV has columns: date, timeIn, timeOut (optional), accomplishment (optional)`));
            return;
          }
          
          const data = lines.slice(1).map((line, index) => {
            const values = parseCSVLine(line).map(v => v.replace(/"/g, '').trim());
            const row: any = {};
            
            headers.forEach((header, headerIndex) => {
              row[header] = values[headerIndex] || '';
            });
            
            return row;
          }).filter(row => row.date && row.timein); // Filter out empty rows
          
          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse CSV file. Please check the format and ensure it follows the specified structure.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file.'));
      reader.readAsText(file);
    });
  };

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      reject(new Error('Excel files are not currently supported in the browser. Please convert your Excel file to CSV format and try again. You can do this by opening your Excel file and using "Save As" → "CSV (Comma delimited)" format.'));
    });
  };

  const parseJSONFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (Array.isArray(data)) {
            resolve(data);
          } else {
            reject(new Error('JSON file must contain an array of DTR entries.'));
          }
        } catch (error) {
          reject(new Error('Invalid JSON format.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read JSON file.'));
      reader.readAsText(file);
    });
  };

  const processImportData = async (data: any[]): Promise<{processed: number, errors: string[]}> => {
    const errors: string[] = [];
    let processed = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      try {
        // Validate required fields - normalize field names
        const normalizedRow = {
          date: row.date,
          timeIn: row.timein || row.timeIn || row['time in'] || row['Time In'],
          timeOut: row.timeout || row.timeOut || row['time out'] || row['Time Out'],
          accomplishment: row.accomplishment || row.Accomplishment || row.notes || row.Notes || ''
        };

        if (!normalizedRow.date || !normalizedRow.timeIn) {
          errors.push(`Row ${rowNum}: Missing required fields (date or timeIn)`);
          continue;
        }

        // Parse and validate date
        let entryDate: Date;
        
        if (normalizedRow.date.includes('T')) {
          // ISO datetime string
          entryDate = new Date(normalizedRow.date);
        } else {
          // Date-only string (YYYY-MM-DD) - parse as local date to avoid timezone shift
          const dateStr = normalizedRow.date.toString().trim();
          const [year, month, day] = dateStr.split(/[-/]/).map(Number);
          
          if (year && month && day) {
            // Handle both YYYY-MM-DD and MM/DD/YYYY formats
            if (year > 31) {
              // YYYY-MM-DD format
              entryDate = new Date(year, month - 1, day);
            } else {
              // MM/DD/YYYY format (assume first number is month if <= 12)
              entryDate = new Date(day, year - 1, month);
            }
          } else {
            entryDate = new Date(normalizedRow.date);
          }
        }
        
        if (isNaN(entryDate.getTime())) {
          errors.push(`Row ${rowNum}: Invalid date format: ${normalizedRow.date}. Use YYYY-MM-DD format.`);
          continue;
        }

        // Parse times
        const timeIn = parseTimeString(normalizedRow.timeIn, entryDate);
        if (!timeIn) {
          errors.push(`Row ${rowNum}: Invalid timeIn format: ${normalizedRow.timeIn}. Use HH:MM AM/PM or HH:MM format.`);
          continue;
        }

        let timeOut = null;
        if (normalizedRow.timeOut) {
          timeOut = parseTimeString(normalizedRow.timeOut, entryDate);
          if (!timeOut) {
            errors.push(`Row ${rowNum}: Invalid timeOut format: ${normalizedRow.timeOut}. Use HH:MM AM/PM or HH:MM format.`);
            continue;
          }
        }

        // Calculate hours worked
        let hoursWorked = 0;
        if (timeOut && timeIn) {
          const diffMs = timeOut.getTime() - timeIn.getTime();
          hoursWorked = Math.max(0, diffMs / (1000 * 60 * 60));
        }

        // Create DTR entry via API
        const token = getToken();
        if (!token) {
          errors.push(`Row ${rowNum}: Authentication error`);
          continue;
        }

        const response = await fetch(`${API_BASE_URL}/dtr/import-entry`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: entryDate.toISOString(),
            timeIn: timeIn.toISOString(),
            timeOut: timeOut ? timeOut.toISOString() : null,
            hoursWorked: parseFloat(hoursWorked.toFixed(2)),
            accomplishment: normalizedRow.accomplishment || ''
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          errors.push(`Row ${rowNum}: ${errorData.message || 'Failed to create entry'}`);
          continue;
        }

        processed++;
      } catch (err: any) {
        errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }

    return { processed, errors };
  };

  const parseTimeString = (timeStr: string, baseDate: Date): Date | null => {
    try {
      // Handle AM/PM format
      const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
      if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = parseInt(ampmMatch[2]);
        const seconds = ampmMatch[3] ? parseInt(ampmMatch[3]) : 0;
        const ampm = ampmMatch[4].toUpperCase();
        
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        // Create new date using the same year, month, day as baseDate to avoid timezone issues
        const result = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, seconds, 0);
        return result;
      }

      // Handle 24-hour format
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
        
        // Create new date using the same year, month, day as baseDate to avoid timezone issues
        const result = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, seconds, 0);
        return result;
      }

      return null;
    } catch (error) {
      return null;
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">DTR History</h2>
          <p className="text-gray-400">View and edit accomplishments from your time records</p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all text-sm flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>Import DTR Data</span>
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
            placeholder="Search by accomplishment or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* DTR Entries List */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">All DTR Entries</h3>
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <p className="text-gray-400">
              {searchTerm || dateFilter ? 'No entries found matching your search criteria.' : 'No DTR entries found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry._id} className="bg-white/5 rounded-lg p-4 border border-white/5 hover:bg-white/10 transition-colors">
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
                    
                    {/* Accomplishment Section */}
                    <div className="mb-2">
                      <div className="text-gray-400 text-xs mb-1">Accomplishments:</div>
                      <p className="text-gray-300 text-sm bg-white/5 rounded p-2 min-h-[2rem] border border-white/10">
                        {entry.accomplishment || 'No accomplishments recorded'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-4">
                    {/* Hours worked display */}
                    <div className="text-right">
                      {entry.hoursWorked > 0 && (
                        <div className="text-blue-400 font-semibold">
                          {entry.hoursWorked.toFixed(1)}h
                        </div>
                      )}
                      {!entry.timeOut && (
                        <div className="text-yellow-400 text-xs">Active</div>
                      )}
                    </div>
                    
                    {/* Edit accomplishment button */}
                    <button
                      onClick={() => startEditingAccomplishment(entry)}
                      className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm flex items-center space-x-1"
                      title="Edit accomplishment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Accomplishment Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Edit Accomplishment - {formatDate(editingEntry.date)}
              </h3>
              <button
                onClick={() => {
                  setEditingEntry(null);
                  setEditAccomplishment('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center space-x-4 mb-4 text-sm text-gray-400">
                <span>Time In: {formatTime(editingEntry.timeIn)}</span>
                {editingEntry.timeOut && (
                  <span>Time Out: {formatTime(editingEntry.timeOut)}</span>
                )}
                {editingEntry.hoursWorked > 0 && (
                  <span>Hours: {editingEntry.hoursWorked.toFixed(1)}h</span>
                )}
              </div>
              
              <label className="block text-white text-sm font-medium mb-2">
                Accomplishment Notes
              </label>
              <textarea
                value={editAccomplishment}
                onChange={(e) => setEditAccomplishment(e.target.value)}
                rows={6}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what you accomplished during this work session..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setEditingEntry(null);
                  setEditAccomplishment('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAccomplishment}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import DTR Data Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Import DTR Data</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                  setError('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Instructions */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-white mb-4">📋 File Format Instructions</h4>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-blue-400 text-sm mb-2">
                  <strong>Important:</strong> Your file must follow the exact format below to avoid errors.
                </p>
                <p className="text-gray-300 text-sm">
                  Clean your data manually before importing. The system will not auto-correct formatting issues.
                </p>
              </div>

              {/* Format Tabs */}
              <div className="mb-4">
                <div className="flex space-x-2 mb-4">
                  {['CSV', 'JSON'].map((format) => (
                    <button
                      key={format}
                      className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm"
                    >
                      {format} Format
                    </button>
                  ))}
                </div>

                {/* CSV Format */}
                <div className="bg-white/5 rounded-lg p-4 mb-4">
                  <h5 className="text-white font-medium mb-2">CSV Format:</h5>
                  <div className="bg-gray-900 rounded p-3 text-sm font-mono overflow-x-auto">
                    <div className="text-green-400">date,timeIn,timeOut,accomplishment</div>
                    <div className="text-gray-300">2024-08-06,09:00 AM,05:30 PM,Completed project documentation</div>
                    <div className="text-gray-300">2024-08-07,08:30 AM,,Started new feature development</div>
                  </div>
                </div>

                {/* JSON Format */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h5 className="text-white font-medium mb-2">JSON Format:</h5>
                  <div className="bg-gray-900 rounded p-3 text-sm font-mono overflow-x-auto">
                    <pre className="text-gray-300">{`[
  {
    "date": "2024-08-06",
    "timeIn": "09:00 AM",
    "timeOut": "05:30 PM",
    "accomplishment": "Completed project documentation"
  },
  {
    "date": "2024-08-07",
    "timeIn": "08:30 AM",
    "timeOut": "",
    "accomplishment": "Started new feature development"
  }
]`}</pre>
                  </div>
                </div>
              </div>

              {/* Field Requirements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h5 className="text-white font-medium mb-2">Required Fields:</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• <strong>date:</strong> YYYY-MM-DD format</li>
                    <li>• <strong>timeIn:</strong> HH:MM AM/PM or HH:MM (24hr)</li>
                  </ul>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h5 className="text-white font-medium mb-2">Optional Fields:</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• <strong>timeOut:</strong> Same format as timeIn</li>
                    <li>• <strong>accomplishment:</strong> Text description</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* File Input */}
            <div className="mb-6">
              <label className="block text-white text-sm font-medium mb-2">
                Select File to Import
              </label>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileImport}
                disabled={importing}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:cursor-pointer hover:file:bg-blue-600 disabled:opacity-50"
              />
              <p className="text-gray-400 text-xs mt-2">
                Supported formats: CSV (recommended), JSON. For Excel files, please convert to CSV first.
              </p>
            </div>

            {/* Import Status */}
            {importing && (
              <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-400">Processing import...</span>
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <div className="mb-6">
                <div className={`rounded-lg p-4 border ${
                  importResults.processed > 0 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {importResults.processed > 0 ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                    <span className={`font-medium ${
                      importResults.processed > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      Import {importResults.processed > 0 ? 'Completed' : 'Failed'}
                    </span>
                  </div>
                  <p className="text-white text-sm mb-2">
                    Successfully processed: {importResults.processed} entries
                  </p>
                  
                  {importResults.errors.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-red-400 text-sm cursor-pointer hover:text-red-300">
                        View {importResults.errors.length} error(s)
                      </summary>
                      <div className="mt-2 bg-red-500/5 rounded p-2 max-h-32 overflow-y-auto">
                        {importResults.errors.map((error, index) => (
                          <p key={index} className="text-red-400 text-xs mb-1">{error}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                  setError('');
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

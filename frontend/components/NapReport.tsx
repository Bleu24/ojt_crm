'use client';

import { useState } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getToken } from '@/utils/auth';

interface NapRow {
  name: string;
  api: number;
  cc: number;
  credit: number;
  lapsed: boolean;
}

export default function NapReport() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<NapRow[]>([]);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE_URL}/nap-report/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`
      },
      body: form
    });
    if (res.ok) {
      const result = await res.json();
      setData(result.data);
      setMonth(result.month);
    }
    setLoading(false);
  };

  const exportExcel = () => {
    if (!month) return;
    const url = `${API_BASE_URL}/nap-report/export?month=${month}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
        />
        <button
          onClick={handleUpload}
          className="px-4 py-2 bg-purple-600 text-white rounded"
          disabled={loading || !file}
        >
          Summarize
        </button>
        {month && (
          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Export to Excel
          </button>
        )}
      </div>
      {data.length > 0 && (
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="px-2 py-1">Agent Name</th>
              <th className="px-2 py-1">Month</th>
              <th className="px-2 py-1">CC</th>
              <th className="px-2 py-1">SALE</th>
              <th className="px-2 py-1">LAPSED</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="text-center border-t">
                <td className="px-2 py-1">{row.name}</td>
                <td className="px-2 py-1">{month}</td>
                <td className="px-2 py-1">{row.cc}</td>
                <td className="px-2 py-1">{row.credit}</td>
                <td className="px-2 py-1">{row.lapsed ? 'YES' : 'NO'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

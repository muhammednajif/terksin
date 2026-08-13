import { useState, useEffect } from 'react';
import { fetchSafetyReports, updateSafetyReportStatus } from '@/lib/admin';
import type { SafetyReport } from '@/lib/admin';

export function AdminSafety() {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => { fetchSafetyReports(statusFilter || undefined).then(setReports); }, [statusFilter]);

  async function handleStatus(id: string, status: SafetyReport['status']) {
    await updateSafetyReportStatus(id, status);
    setReports(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Safety Reports</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-black/10 rounded-xl px-3 py-2 text-sm text-gray-900">
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="">All</option>
        </select>
      </div>
      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="bg-white rounded-xl p-4 border border-black/5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  r.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                  r.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {r.severity}
                </span>
                <span className="text-xs text-gray-400">{r.report_type.replace(/_/g, ' ')}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
              </div>
            </div>
            {r.location && <p className="text-sm text-gray-700 mb-1">📍 {r.location}</p>}
            <p className="text-sm text-gray-500 mb-3">{r.description}</p>
            <div className="flex gap-2">
              {r.status === 'pending' && (
                <>
                  <button onClick={() => handleStatus(r.id, 'resolved')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">Resolve</button>
                  <button onClick={() => handleStatus(r.id, 'dismissed')} className="px-3 py-1.5 bg-black/5 text-gray-600 rounded-lg text-xs font-medium hover:bg-black/10 transition-colors">Dismiss</button>
                </>
              )}
              {r.status === 'reviewed' && (
                <button onClick={() => handleStatus(r.id, 'resolved')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">Resolve</button>
              )}
            </div>
          </div>
        ))}
        {reports.length === 0 && <p className="text-gray-400 text-center py-12">No safety reports with this status.</p>}
      </div>
    </div>
  );
}

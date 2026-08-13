import { useState, useEffect } from 'react';
import { fetchPendingReports, updateReportStatus, deletePost, deleteComment } from '@/lib/admin';
import type { CommunityReport } from '@/lib/admin';

export function AdminModeration() {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchPendingReports().then(setReports); }, []);

  async function handleAction(reportId: string, action: 'resolved' | 'dismissed', note?: string) {
    if (action === 'resolved') {
      const report = reports.find(r => r.id === reportId);
      if (report?.post_id) await deletePost(report.post_id);
      if (report?.comment_id) await deleteComment(report.comment_id);
    }
    await updateReportStatus(reportId, action, note);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: action } : r));
  }

  const filtered = filter ? reports.filter(r => r.status === filter) : reports;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Community Moderation</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-white border border-black/10 rounded-xl px-3 py-2 text-sm text-gray-900">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>
      <div className="space-y-3">
        {filtered.map(report => (
          <div key={report.id} className="bg-white rounded-xl p-4 border border-black/5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-gray-400">Reported by </span>
                <span className="text-sm font-medium">{report.reporter?.display_name || report.reporter?.username || 'Unknown'}</span>
                <span className="text-xs text-gray-400 ml-2">{new Date(report.created_at).toLocaleString()}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                report.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {report.status}
              </span>
            </div>
            <p className="text-sm mb-1"><span className="text-gray-400">Reason:</span> {report.reason}</p>
            {report.description && <p className="text-sm text-gray-500 mb-3">{report.description}</p>}
            <div className="flex gap-2">
              {report.status === 'pending' && (
                <>
                  <button onClick={() => handleAction(report.id, 'resolved')} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors">
                    Remove & Resolve
                  </button>
                  <button onClick={() => handleAction(report.id, 'dismissed')} className="px-3 py-1.5 bg-black/5 text-gray-600 rounded-lg text-xs font-medium hover:bg-black/10 transition-colors">
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-gray-400 text-center py-12">No reports found.</p>}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { fetchAuditLog } from '@/lib/admin';
import type { AuditLogEntry } from '@/lib/admin';

export function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => { fetchAuditLog().then(setEntries); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audit Log</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-black/5">
              <th className="pb-3 pr-4 font-medium">Time</th>
              <th className="pb-3 pr-4 font-medium">Admin</th>
              <th className="pb-3 pr-4 font-medium">Action</th>
              <th className="pb-3 pr-4 font-medium">Entity</th>
              <th className="pb-3 pr-4 font-medium">Entity ID</th>
              <th className="pb-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-b border-black/[0.03] hover:bg-black/[0.02]">
                <td className="py-3 pr-4 text-xs text-gray-400 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                <td className="py-3 pr-4 text-xs">{e.admin?.display_name || e.admin?.username || '—'}</td>
                <td className="py-3 pr-4">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 text-gray-600 font-medium">{e.action}</span>
                </td>
                <td className="py-3 pr-4 text-gray-400">{e.entity_type}</td>
                <td className="py-3 pr-4 text-xs font-mono text-gray-400">{e.entity_id?.slice(0, 12) || '—'}...</td>
                <td className="py-3 text-xs text-gray-400 max-w-[200px] truncate">
                  {e.details ? JSON.stringify(e.details) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {entries.length === 0 && <p className="text-gray-400 text-center py-12">No audit log entries yet.</p>}
    </div>
  );
}

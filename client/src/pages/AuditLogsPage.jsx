import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { ShieldAlert, ShieldCheck, CheckCircle, RefreshCw, Hash, Search } from 'lucide-react';

export function AuditLogsPage() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Search & Filter
  const [actionFilter, setActionFilter] = useState('');

  const loadAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const url = actionFilter
        ? `/audit?page=${page}&action=${actionFilter}`
        : `/audit?page=${page}`;
      const res = await api.get(url);
      setEvents(res.data?.events || []);
      setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs(1);
  }, [actionFilter]);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.get('/audit/verify');
      setVerificationResult(res.data?.integrity || null);
    } catch (err) {
      alert('Failed to execute cryptographic verification.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-brand-600" />
            <span>Forensic Audit Trail & Cryptographic Verification</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident SHA-256 hash-chained security log of state mutations, logins, and authorization checks
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {verifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span>{verifying ? 'Verifying Hash Chain...' : 'Verify Cryptographic Integrity'}</span>
        </button>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
            verificationResult.isIntact
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {verificationResult.isIntact ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold">
              {verificationResult.isIntact
                ? 'Cryptographic Audit Chain Intact: No Data Tampering Detected'
                : 'SECURITY ALERT: Audit Chain Integrity Failure!'}
            </p>
            <p className="mt-0.5 font-mono text-[11px]">
              {verificationResult.reason} • {verificationResult.totalChecked} records checked from Genesis block.
            </p>
          </div>
        </div>
      )}

      {/* Table Card */}
      <Card
        title="Audit Events Log"
        subtitle={`Total Recorded Events: ${pagination.total}`}
        action={
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Filter by action..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-slate-50"
            />
          </div>
        }
      >
        {loading ? (
          <LoadingSpinner message="Loading audit trail..." />
        ) : events.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-8">No audit events match criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Seq</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">SHA-256 Hash</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((evt) => (
                  <tr key={evt._id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">#{evt.sequenceNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{evt.action}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{evt.actorEmail}</div>
                      <span className="text-[10px] text-slate-400 font-mono">Role: {evt.actorRole}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {evt.resourceType}
                      {evt.resourceId && <span className="block text-[10px] text-slate-400">{evt.resourceId}</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          evt.status === 'SUCCESS'
                            ? 'success'
                            : evt.status === 'DENIED'
                            ? 'danger'
                            : 'warning'
                        }
                        size="xs"
                      >
                        {evt.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 truncate max-w-[120px]" title={evt.hash}>
                      {evt.hash.slice(0, 12)}...
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

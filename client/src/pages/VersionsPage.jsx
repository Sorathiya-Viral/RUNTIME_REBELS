import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { History, GitCompare, CheckCircle, ArrowRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export function VersionsPage() {
  const { role } = useAuth();
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Version Comparison State
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const loadTimetables = async () => {
    setLoading(true);
    try {
      const res = await api.get('/timetable');
      const list = res.data?.timetables || [];
      setTimetables(list);
      if (list.length >= 2) {
        setVersionA(list[0]._id);
        setVersionB(list[1]._id);
      }
    } catch (err) {
      console.error('Error loading versions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetables();
  }, []);

  const handleCompareSubmit = async (e) => {
    e.preventDefault();
    if (!versionA || !versionB || versionA === versionB) {
      alert('Please select two distinct versions to compare.');
      return;
    }

    setCompareLoading(true);
    try {
      const res = await api.get(`/timetable/${versionA}/compare/${versionB}`);
      setCompareResult(res.data?.comparison || null);
    } catch (err) {
      alert('Failed to compare versions.');
    } finally {
      setCompareLoading(false);
    }
  };

  const handlePublish = async (id) => {
    if (!confirm('Are you sure you want to publish this timetable version? Previous published version will be archived.')) return;
    try {
      const res = await api.post(`/timetable/${id}/publish`);
      if (res.data?.success) {
        alert('Timetable published successfully!');
        loadTimetables();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Publication failed.');
    }
  };

  if (loading) return <LoadingSpinner message="Loading timetable versions..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Timetable Versions & Lifecycle</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit history of drafts, validated solutions, published schedules, and side-by-side version comparison
          </p>
        </div>

        {timetables.length >= 2 && (
          <button
            onClick={() => setCompareModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare Versions</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Version</th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Programme & Sem</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Quality Score</th>
              <th className="py-3 px-4">Last Updated</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {timetables.map((t) => (
              <tr key={t._id} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-bold font-mono text-slate-900">v{t.version}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{t.title}</td>
                <td className="py-3 px-4 text-slate-600">
                  {t.programmeCode} (Sem {t.semesterNumber})
                </td>
                <td className="py-3 px-4">
                  <Badge
                    variant={
                      t.status === 'published'
                        ? 'success'
                        : t.status === 'validated'
                        ? 'primary'
                        : t.status === 'archived'
                        ? 'default'
                        : 'warning'
                    }
                    size="xs"
                  >
                    {t.status.toUpperCase()}
                  </Badge>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-700">
                  {t.qualityMetrics?.softPreferenceScore || 100} / 100
                </td>
                <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                  {new Date(t.updatedAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <Link
                    to="/calendar"
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </Link>

                  {['admin', 'coordinator'].includes(role) && t.status !== 'published' && (
                    <button
                      onClick={() => handlePublish(t._id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-semibold"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Publish</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compare Modal */}
      <Modal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title="Side-by-Side Version Comparison"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          <form onSubmit={handleCompareSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block font-semibold text-slate-700">Version A (Baseline)</label>
              <select
                value={versionA}
                onChange={(e) => setVersionA(e.target.value)}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                {timetables.map((t) => (
                  <option key={t._id} value={t._id}>
                    v{t.version} - {t.title} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700">Version B (Compare To)</label>
              <select
                value={versionB}
                onChange={(e) => setVersionB(e.target.value)}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                {timetables.map((t) => (
                  <option key={t._id} value={t._id}>
                    v{t.version} - {t.title} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={compareLoading}
                className="w-full py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold shadow-xs"
              >
                {compareLoading ? 'Comparing...' : 'Compute Differences'}
              </button>
            </div>
          </form>

          {/* Comparison Result Diff View */}
          {compareResult && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Comparing Version {compareResult.versionA?.version} against Version {compareResult.versionB?.version}
                </span>
                <Badge variant={compareResult.differencesCount === 0 ? 'success' : 'warning'}>
                  {compareResult.differencesCount} Changed Sessions
                </Badge>
              </div>

              {compareResult.differencesCount === 0 ? (
                <div className="p-4 bg-emerald-50 rounded-lg text-emerald-800 text-center font-medium">
                  Both versions have identical session assignments.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Subject</th>
                        <th className="p-2.5">Change Type</th>
                        <th className="p-2.5">Version {compareResult.versionA?.version} Assignment</th>
                        <th className="p-2.5">Version {compareResult.versionB?.version} Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compareResult.differences.map((diff, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-800">{diff.subjectCode}</td>
                          <td className="p-2.5">
                            <Badge variant="indigo" size="xs">{diff.type}</Badge>
                          </td>
                          <td className="p-2.5 text-slate-600 font-mono">
                            {diff.v1 ? `${diff.v1.day} ${diff.v1.time} (${diff.v1.room})` : 'None'}
                          </td>
                          <td className="p-2.5 text-slate-800 font-mono font-medium">
                            {diff.v2 ? `${diff.v2.day} ${diff.v2.time} (${diff.v2.room})` : 'Removed'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

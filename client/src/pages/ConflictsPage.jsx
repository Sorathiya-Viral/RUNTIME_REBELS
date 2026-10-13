import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { AlertTriangle, CheckCircle, ShieldAlert, Lightbulb } from 'lucide-react';

export function ConflictsPage() {
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadList() {
      try {
        const res = await api.get('/timetable');
        const list = res.data?.timetables || [];
        setTimetables(list);
        if (list.length > 0) {
          setSelectedTimetableId(list[0]._id);
        }
      } catch (err) {
        console.error('Error loading timetables:', err);
      } finally {
        setLoading(false);
      }
    }
    loadList();
  }, []);

  useEffect(() => {
    if (!selectedTimetableId) return;
    async function loadDetail() {
      try {
        const res = await api.get(`/timetable/${selectedTimetableId}`);
        setTimetable(res.data?.timetable || null);
      } catch (err) {
        console.error('Error loading detail:', err);
      }
    }
    loadDetail();
  }, [selectedTimetableId]);

  if (loading) return <LoadingSpinner message="Checking conflict validations..." />;

  const diagnostics = timetable?.diagnostics || {};
  const hasConflicts =
    timetable?.qualityMetrics?.hardConstraintViolations > 0 ||
    diagnostics.status === 'infeasible' ||
    (diagnostics.conflictMessages?.length || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Conflicts & Infeasibility Validation</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Diagnostic reports on unassigned sessions, resource collisions, and impossible scheduling configurations
          </p>
        </div>

        {timetables.length > 0 && (
          <select
            value={selectedTimetableId}
            onChange={(e) => setSelectedTimetableId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium"
          >
            {timetables.map((t) => (
              <option key={t._id} value={t._id}>
                v{t.version} - {t.title} ({t.status})
              </option>
            ))}
          </select>
        )}
      </div>

      {!hasConflicts ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center space-y-3">
          <div className="inline-flex p-3 bg-emerald-100 rounded-full text-emerald-600">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-emerald-900">0 Scheduling Conflicts Detected</h3>
          <p className="text-xs text-emerald-700 max-w-md mx-auto">
            This timetable version satisfies all 15 mandatory institutional hard constraints with no detected collisions across faculty, rooms, or student batches.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-rose-200 bg-rose-50/20">
            <div className="flex items-start space-x-3 text-rose-800">
              <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-900">Constraint Violations & Infeasibility Summary</h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  The solver encountered blocking constraints. Review the root causes and actionable recommendations below:
                </p>
              </div>
            </div>
          </Card>

          {/* Conflict details */}
          {diagnostics.conflictMessages?.length > 0 && (
            <Card title="Detected Bottlenecks & Explanations">
              <ul className="space-y-2 text-xs text-rose-800">
                {diagnostics.conflictMessages.map((msg, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Actionable suggestions */}
          {diagnostics.suggestions?.length > 0 && (
            <Card title="Actionable Input Recommendations">
              <ul className="space-y-2 text-xs text-amber-800">
                {diagnostics.suggestions.map((sug, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sliders,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
  Cpu,
} from 'lucide-react';

export function GenerateTimetablePage() {
  const navigate = useNavigate();

  const [programmes, setProgrammes] = useState([]);
  const [selectedProgramme, setSelectedProgramme] = useState('M.Sc. DFIS');
  const [semesterNumber, setSemesterNumber] = useState(1);
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [title, setTitle] = useState('');

  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadProgrammes() {
      try {
        const res = await api.get('/programmes');
        const progs = res.data?.programmes || [];
        setProgrammes(progs);
        if (progs.length > 0) {
          setSelectedProgramme(progs[0].code);
        }
      } catch (err) {
        console.error('Error loading programmes:', err);
      }
    }
    loadProgrammes();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setErrorMsg('');
    setGenerationResult(null);

    try {
      const res = await api.post('/timetable/generate', {
        programmeCode: selectedProgramme,
        semesterNumber: parseInt(semesterNumber, 10),
        academicYear,
        title: title || `${selectedProgramme} - Sem ${semesterNumber} Schedule`,
      });

      if (res.data?.success) {
        setGenerationResult(res.data.timetable);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Server error occurred during timetable generation.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
          <Sparkles className="w-6 h-6 text-brand-600" />
          <span>Intelligent Timetable Generation</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Constraint-Satisfaction Engine using Minimum Remaining Values (MRV), Forward Checking, and Backtracking search.
        </p>
      </div>

      {/* Generation Parameters Form */}
      <Card title="Academic Generation Parameters" subtitle="Configure scope and requirements">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Academic Programme
              </label>
              <select
                value={selectedProgramme}
                onChange={(e) => setSelectedProgramme(e.target.value)}
                className="mt-1.5 w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                required
              >
                {programmes.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Semester
              </label>
              <select
                value={semesterNumber}
                onChange={(e) => setSemesterNumber(e.target.value)}
                className="mt-1.5 w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                required
              >
                <option value={1}>Semester I</option>
                <option value={2}>Semester II</option>
                <option value={3}>Semester III</option>
                <option value={4}>Semester IV</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-2027"
                className="mt-1.5 w-full p-2.5 border border-slate-300 rounded-lg text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Custom Schedule Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. M.Sc. DFIS Autumn 2026 Term"
                className="mt-1.5 w-full p-2.5 border border-slate-300 rounded-lg text-sm font-medium"
              />
            </div>
          </div>

          {/* Solver Rules Info Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
            <div className="flex items-center space-x-2 font-bold text-slate-800">
              <Cpu className="w-4 h-4 text-brand-600" />
              <span>Solver Engine Guarantees</span>
            </div>
            <p>
              The solver strictly satisfies 15 hard constraints: zero faculty collisions, zero room overlaps, zero student-group conflicts, practical laboratory verification, continuous practical sessions, lunch break exclusion, and preservation of all locked sessions.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={generating}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <LoadingSpinner size="sm" message="" />
                  <span>Solving Constraint Satisfaction Problem...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Timetable Generation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generation Result Outcome */}
      {generationResult && (
        <div className="space-y-6">
          {generationResult.qualityMetrics?.hardConstraintViolations === 0 ? (
            /* Successful Result Card */
            <Card className="border-emerald-200 bg-emerald-50/20">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-slate-900">Valid Timetable Generated!</h3>
                    <Badge variant="success">0 Violations</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    All mandatory constraints satisfied. Timetable version {generationResult.version} created and ready for review.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-500 font-medium">Scheduled Sessions</p>
                      <p className="text-lg font-bold text-slate-900">{generationResult.sessions?.length}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-500 font-medium">Preference Score</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {generationResult.qualityMetrics?.softPreferenceScore} / 100
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-500 font-medium">Search Iterations</p>
                      <p className="text-lg font-bold text-slate-900 font-mono">
                        {generationResult.diagnostics?.iterationsCount || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-500 font-medium">Solve Duration</p>
                      <p className="text-lg font-bold text-slate-900 font-mono">
                        {generationResult.diagnostics?.timeTakenMs || 0} ms
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center space-x-3">
                    <button
                      onClick={() => navigate('/calendar')}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      <span>Open in Timetable Calendar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            /* Infeasible / Constraint Bottleneck Diagnostics Card */
            <Card className="border-rose-200 bg-rose-50/20">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-rose-100 rounded-full text-rose-600">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-rose-900">
                      Scheduling Constraints Bottleneck Detected
                    </h3>
                    <p className="text-xs text-rose-700 mt-1">
                      The constraint solver proved that no valid timetable satisfies all mandatory constraints under current institutional inputs.
                    </p>
                  </div>

                  {/* Conflict Messages */}
                  {generationResult.diagnostics?.conflictMessages?.length > 0 && (
                    <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-2">
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Conflict Diagnostics:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-rose-700">
                        {generationResult.diagnostics.conflictMessages.map((msg, i) => (
                          <li key={i}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actionable Recommendations */}
                  {generationResult.diagnostics?.suggestions?.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span>Actionable Resolution Steps:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-amber-800">
                        {generationResult.diagnostics.suggestions.map((sug, i) => (
                          <li key={i}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

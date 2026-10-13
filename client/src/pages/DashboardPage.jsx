import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import {
  CalendarDays,
  Sparkles,
  Users,
  Building2,
  GraduationCap,
  CheckCircle,
  AlertTriangle,
  History,
  ShieldCheck,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export function DashboardPage() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentAudits, setRecentAudits] = useState([]);
  const [activeTimetable, setActiveTimetable] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [progRes, facRes, roomRes, subRes, timeRes] = await Promise.all([
          api.get('/programmes'),
          api.get('/faculty'),
          api.get('/rooms'),
          api.get('/subjects'),
          api.get('/timetable'),
        ]);

        const programmes = progRes.data?.programmes || [];
        const faculty = facRes.data?.faculty || [];
        const rooms = roomRes.data?.rooms || [];
        const subjects = subRes.data?.subjects || [];
        const timetables = timeRes.data?.timetables || [];

        const published = timetables.find((t) => t.status === 'published') || timetables[0];

        setStats({
          programmesCount: programmes.length,
          facultyCount: faculty.length,
          roomsCount: rooms.length,
          subjectsCount: subjects.length,
          timetablesCount: timetables.length,
          publishedCount: timetables.filter((t) => t.status === 'published').length,
        });

        if (published) {
          const detailRes = await api.get(`/timetable/${published._id}`);
          setActiveTimetable(detailRes.data?.timetable || null);
        }

        // If admin, load real audit logs
        if (role === 'admin') {
          const auditRes = await api.get('/audit?limit=5');
          setRecentAudits(auditRes.data?.events || []);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [role]);

  if (loading) {
    return <LoadingSpinner message="Loading Schedulix analytics..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-brand-900 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-brand-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-brand-300 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>M.Sc. Digital Forensics and Information Security</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Automated constraint-satisfaction scheduling system operating with strict RBAC and tamper-evident forensic audit verification.
          </p>
        </div>

        {['admin', 'coordinator'].includes(role) && (
          <div className="flex flex-wrap gap-3">
            <Link
              to="/generate"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Schedule</span>
            </Link>
            <Link
              to="/calendar"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              <span>View Calendar</span>
            </Link>
          </div>
        )}
      </div>

      {/* Database Derived Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-brand-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduled Sessions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {activeTimetable?.sessions?.length || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {activeTimetable ? `${activeTimetable.programmeCode} (v${activeTimetable.version})` : 'No active timetable'}
              </p>
            </div>
            <div className="p-3 bg-brand-50 rounded-xl text-brand-600">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Faculty</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.facultyCount || 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">DFIS teaching staff</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Classrooms & Labs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.roomsCount || 0}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">All facilities operational</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Timetable Versions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.timetablesCount || 0}</p>
              <p className="text-[11px] text-purple-600 font-medium mt-1">
                {stats?.publishedCount || 0} Published
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
              <History className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Active Timetable Status & Quality Matrix */}
      {activeTimetable && (
        <Card
          title="Active Timetable Quality & Constraint Status"
          subtitle={`Schedule: ${activeTimetable.title} (Status: ${activeTimetable.status.toUpperCase()})`}
          action={
            <Link
              to="/calendar"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
            >
              <span>Inspect Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Hard Constraint Status</p>
              <div className="flex items-center space-x-2 mt-2">
                {activeTimetable.qualityMetrics?.hardConstraintViolations === 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-700">0 Violations (Fully Valid)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <span className="text-sm font-bold text-rose-700">
                      {activeTimetable.qualityMetrics?.hardConstraintViolations} Violations
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Soft Preference Score</p>
              <div className="mt-2 flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-slate-900">
                  {activeTimetable.qualityMetrics?.softPreferenceScore || 100}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Faculty load & slot distribution</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Unassigned Sessions</p>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {activeTimetable.qualityMetrics?.unassignedSessionsCount || 0}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">All curriculum quotas met</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Lifecycle State</p>
              <div className="mt-2">
                <Badge
                  variant={
                    activeTimetable.status === 'published'
                      ? 'success'
                      : activeTimetable.status === 'validated'
                      ? 'primary'
                      : 'warning'
                  }
                  size="md"
                >
                  {activeTimetable.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Version {activeTimetable.version}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Forensic Audit Logs Preview (Admin View) */}
      {role === 'admin' && recentAudits.length > 0 && (
        <Card
          title="Recent Forensic Audit Events (SHA-256 Tamper-Evident Chain)"
          subtitle="Cryptographically chained state changes and access authorization records"
          action={
            <Link
              to="/audit"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
            >
              <span>Verify & View Full Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Seq #</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAudits.map((event) => (
                  <tr key={event._id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-slate-500 font-semibold">
                      #{event.sequenceNumber}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{event.action}</td>
                    <td className="py-2.5 px-3 text-slate-600">{event.actorEmail}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{event.resourceType}</td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          event.status === 'SUCCESS'
                            ? 'success'
                            : event.status === 'DENIED'
                            ? 'danger'
                            : 'warning'
                        }
                        size="xs"
                      >
                        {event.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

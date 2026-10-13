import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { FileSpreadsheet, Printer, Download, Users, Building2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function ReportsPage() {
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadList() {
      try {
        const res = await api.get('/timetable');
        const list = res.data?.timetables || [];
        setTimetables(list);
        const def = list.find((t) => t.status === 'published') || list[0];
        if (def) setSelectedTimetableId(def._id);
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
    async function loadAnalytics() {
      try {
        const res = await api.get(`/timetable/${selectedTimetableId}/analytics`);
        setAnalytics(res.data?.analytics || null);
      } catch (err) {
        console.error('Error loading analytics:', err);
      }
    }
    loadAnalytics();
  }, [selectedTimetableId]);

  if (loading) return <LoadingSpinner message="Calculating academic workloads and utilization analytics..." />;

  const facultyData = analytics?.facultyWorkload || [];
  const roomData = analytics?.roomUtilization || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Workload & Facility Utilization Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">Faculty teaching quotas, classroom utilization density, and export summaries</p>
        </div>

        <div className="flex items-center space-x-2">
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

          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {analytics ? (
        <div className="space-y-6">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Scheduled Sessions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.totalSessions}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Weekly Teaching Hours</p>
              <p className="text-2xl font-bold text-brand-600 mt-1">{analytics.totalTeachingHours} Hours</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold text-slate-500 uppercase">Active Instructors Assigned</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{facultyData.length}</p>
            </Card>
          </div>

          {/* Faculty Workload Section */}
          <Card
            title="Faculty Weekly Teaching Workload Distribution"
            subtitle="Calculated weekly hours committed per faculty member"
          >
            <div className="space-y-6">
              {/* Recharts Bar Chart */}
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={facultyData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="facultyName" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="totalHours" name="Weekly Hours" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Faculty Code</th>
                      <th className="p-3">Faculty Name</th>
                      <th className="p-3">Weekly Assigned Sessions</th>
                      <th className="p-3">Total Teaching Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facultyData.map((f) => (
                      <tr key={f.facultyCode} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-brand-700">{f.facultyCode}</td>
                        <td className="p-3 font-semibold text-slate-800">{f.facultyName}</td>
                        <td className="p-3 text-slate-600">{f.sessions} sessions</td>
                        <td className="p-3 font-bold text-slate-900">{f.totalHours} hrs / week</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Room Utilization Section */}
          <Card
            title="Classroom & Laboratory Weekly Utilization"
            subtitle="Hourly density across lecture halls and forensic laboratories"
          >
            <div className="space-y-6">
              {/* Recharts Bar Chart */}
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roomData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="roomNumber" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="totalHours" name="Occupied Hours" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Room / Lab</th>
                      <th className="p-3">Scheduled Sessions</th>
                      <th className="p-3">Total Occupied Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roomData.map((r) => (
                      <tr key={r.roomNumber} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-800">{r.roomNumber}</td>
                        <td className="p-3 text-slate-600">{r.sessions} sessions</td>
                        <td className="p-3 font-bold text-emerald-700">{r.totalHours} hrs / week</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <p className="text-xs text-slate-500">No analytics data available for this timetable.</p>
      )}
    </div>
  );
}

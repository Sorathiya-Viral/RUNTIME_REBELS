import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import {
  CalendarDays,
  Lock,
  Unlock,
  Printer,
  Download,
  Filter,
  CheckCircle,
  AlertTriangle,
  MoveRight,
  Sparkles,
} from 'lucide-react';

function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
  return hours * 60 + (minutes || 0);
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function intervalsOverlap(startA, endA, startB, endB) {
  const aStart = typeof startA === 'number' ? startA : timeToMinutes(startA);
  const aEnd = typeof endA === 'number' ? endA : timeToMinutes(endA);
  const bStart = typeof startB === 'number' ? startB : timeToMinutes(startB);
  const bEnd = typeof endB === 'number' ? endB : timeToMinutes(endB);
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

export function TimetableCalendarPage() {
  const { role } = useAuth();
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [settings, setSettings] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [selectedRoom, setSelectedRoom] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState('ALL'); // 'ALL' or specific day
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'

  // Manual Move Modal State
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [sessionToMove, setSessionToMove] = useState(null);
  const [moveTargetDay, setMoveTargetDay] = useState('Monday');
  const [moveTargetStartTime, setMoveTargetStartTime] = useState('09:00');
  const [moveTargetEndTime, setMoveTargetEndTime] = useState('10:00');
  const [moveTargetRoom, setMoveTargetRoom] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState(null);
  const [moveSuccess, setMoveSuccess] = useState('');

  // Load available timetables and institution settings
  useEffect(() => {
    async function loadInitial() {
      try {
        const [timeRes, setRes, roomRes] = await Promise.all([
          api.get('/timetable'),
          api.get('/settings'),
          api.get('/rooms'),
        ]);

        const list = timeRes.data?.timetables || [];
        setTimetables(list);
        setSettings(setRes.data?.settings || null);
        setRooms(roomRes.data?.rooms || []);

        // Default to published or first timetable
        const defaultT = list.find((t) => t.status === 'published') || list[0];
        if (defaultT) {
          setSelectedTimetableId(defaultT._id);
        }
      } catch (err) {
        console.error('Error loading timetables:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Load selected timetable details
  useEffect(() => {
    if (!selectedTimetableId) return;

    async function loadTimetableDetails() {
      setLoading(true);
      try {
        const res = await api.get(`/timetable/${selectedTimetableId}`);
        setTimetable(res.data?.timetable || null);
      } catch (err) {
        console.error('Error loading timetable details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTimetableDetails();
  }, [selectedTimetableId]);

  // Handle Lock Toggle
  const handleToggleLock = async (sessionId) => {
    if (!['admin', 'coordinator'].includes(role)) return;
    try {
      const res = await api.patch(`/timetable/${timetable._id}/sessions/${sessionId}/lock`);
      if (res.data?.success) {
        setTimetable((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) =>
            (s.sessionId === sessionId || s._id === sessionId) ? { ...s, isLocked: res.data.isLocked } : s
          ),
        }));
      }
    } catch (err) {
      alert('Failed to update session lock state.');
    }
  };

  // Open Move Modal
  const openMoveModal = (session) => {
    if (!['admin', 'coordinator'].includes(role)) return;
    setSessionToMove(session);
    setMoveTargetDay(session.day);
    setMoveTargetStartTime(session.startTime);
    setMoveTargetEndTime(session.endTime);
    setMoveTargetRoom(session.roomNumber);
    setMoveError(null);
    setMoveSuccess('');
    setMoveModalOpen(true);
  };

  // Submit Move Session
  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    if (!sessionToMove) return;

    setMoveLoading(true);
    setMoveError(null);
    setMoveSuccess('');

    try {
      const sId = sessionToMove.sessionId || sessionToMove._id;
      const res = await api.patch(`/timetable/${timetable._id}/sessions/${sId}/move`, {
        newDay: moveTargetDay,
        newStartTime: moveTargetStartTime,
        newEndTime: moveTargetEndTime,
        newRoomNumber: moveTargetRoom,
      });

      if (res.data?.success) {
        setMoveSuccess('Session moved successfully!');
        setTimetable(res.data.timetable);
        setTimeout(() => setMoveModalOpen(false), 900);
      }
    } catch (err) {
      const violations = err.response?.data?.violations || [];
      const msg = err.response?.data?.message || 'Conflict validation failed.';
      setMoveError({ message: msg, violations });
    } finally {
      setMoveLoading(false);
    }
  };

  // Handle Publish
  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish this timetable? This will archive any previous published version.')) return;
    try {
      const res = await api.post(`/timetable/${timetable._id}/publish`);
      if (res.data?.success) {
        alert('Timetable published successfully!');
        setTimetable(res.data.timetable);
        setTimetables((prev) =>
          prev.map((t) => (t._id === timetable._id ? { ...t, status: 'published' } : t))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Publication failed.');
    }
  };

  // Handle Create Draft Revision
  const handleCreateRevision = async () => {
    if (!timetable) return;
    try {
      const res = await api.post(`/timetable/${timetable._id}/revision`);
      if (res.data?.success) {
        const newT = res.data.timetable;
        setTimetables((prev) => [newT, ...prev]);
        setSelectedTimetableId(newT._id);
        setTimetable(newT);
        alert(`Draft revision v${newT.version} created! You can now freely edit, optimize, and move sessions.`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create revision.');
    }
  };

  // Handle Revert / Unpublish to Draft
  const handleUnpublish = async () => {
    if (!timetable) return;
    if (!confirm('Revert this timetable to draft status?')) return;
    try {
      const res = await api.post(`/timetable/${timetable._id}/unpublish`);
      if (res.data?.success) {
        setTimetable(res.data.timetable);
        setTimetables((prev) =>
          prev.map((t) => (t._id === timetable._id ? { ...t, status: 'draft' } : t))
        );
        alert('Timetable reverted to draft status.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revert timetable.');
    }
  };

  // CSV Export Download
  const handleCsvExport = () => {
    if (!timetable) return;
    window.open(`/api/timetable/${timetable._id}/export/csv`, '_blank');
  };

  // Working Days & Slots
  const workingDays = settings?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const slots = React.useMemo(() => {
    if (!settings?.dayStartTime || !settings?.dayEndTime) {
      return [
        { startTime: '10:30', endTime: '11:30', isBreak: false },
        { startTime: '11:30', endTime: '12:30', isBreak: false },
        { startTime: '12:30', endTime: '13:30', isBreak: false },
        { startTime: '13:30', endTime: '14:30', isBreak: true, breakName: 'Lunch Break' },
        { startTime: '14:30', endTime: '15:30', isBreak: false },
        { startTime: '15:30', endTime: '16:30', isBreak: false },
        { startTime: '16:30', endTime: '17:30', isBreak: false },
      ];
    }
    const dayStartMins = timeToMinutes(settings.dayStartTime);
    const dayEndMins = timeToMinutes(settings.dayEndTime);
    const duration = settings.periodDurationMinutes || 60;
    const breakPeriods = settings.breakPeriods || [];

    const res = [];
    let cur = dayStartMins;
    let idx = 0;
    while (cur + duration <= dayEndMins) {
      const sStart = minutesToTime(cur);
      const sEnd = minutesToTime(cur + duration);
      const overlappingBreak = breakPeriods.find((bp) =>
        intervalsOverlap(sStart, sEnd, bp.startTime, bp.endTime)
      );
      res.push({
        slotIndex: idx,
        startTime: sStart,
        endTime: sEnd,
        isBreak: Boolean(overlappingBreak),
        breakName: overlappingBreak ? overlappingBreak.name : null,
      });
      cur += duration;
      idx++;
    }
    return res;
  }, [settings]);

  // Filter sessions
  const sessions = timetable?.sessions || [];
  const filteredSessions = sessions.filter((s) => {
    if (selectedFaculty !== 'ALL' && s.facultyCode !== selectedFaculty) return false;
    if (selectedRoom !== 'ALL' && s.roomNumber !== selectedRoom) return false;
    if (selectedDay !== 'ALL' && s.day !== selectedDay) return false;
    return true;
  });

  // Unique faculty and rooms from current timetable
  const uniqueFaculties = Array.from(new Set(sessions.map((s) => s.facultyCode))).map((code) => {
    const item = sessions.find((s) => s.facultyCode === code);
    return { code, name: item?.facultyName || code };
  });

  const uniqueRooms = Array.from(new Set(sessions.map((s) => s.roomNumber)));

  if (loading && !timetable) {
    return <LoadingSpinner message="Loading academic timetable calendar..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              {timetable ? timetable.title : 'Timetable Calendar'}
            </h1>
            {timetable && (
              <Badge
                variant={
                  timetable.status === 'published'
                    ? 'success'
                    : timetable.status === 'validated'
                    ? 'primary'
                    : 'warning'
                }
              >
                {timetable.status.toUpperCase()}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {timetable?.programmeCode} • Sem {timetable?.semesterNumber} • Version {timetable?.version}
          </p>
        </div>

        {/* Timetable Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {timetables.length > 0 && (
            <select
              value={selectedTimetableId}
              onChange={(e) => setSelectedTimetableId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            >
              {timetables.map((t) => (
                <option key={t._id} value={t._id}>
                  v{t.version} - {t.title} ({t.status})
                </option>
              ))}
            </select>
          )}

          {['admin', 'coordinator'].includes(role) && (
            <>
              <button
                onClick={handleCreateRevision}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                title="Create a new draft revision cloned from this timetable"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Create Draft Revision</span>
              </button>

              {timetable?.status === 'published' ? (
                <button
                  onClick={handleUnpublish}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold border border-amber-200 transition-colors cursor-pointer"
                  title="Revert timetable status to draft for unconstrained revisions"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Revert to Draft</span>
                </button>
              ) : (
                <button
                  onClick={handlePublish}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Publish Schedule</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={handleCsvExport}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs no-print">
        <div className="flex items-center space-x-1.5 text-slate-500 font-semibold">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>

        {/* Faculty Filter */}
        <div className="flex items-center space-x-1.5">
          <label className="text-slate-600 font-medium">Faculty:</label>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-slate-50 text-slate-800"
          >
            <option value="ALL">All Faculty</option>
            {uniqueFaculties.map((f) => (
              <option key={f.code} value={f.code}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Room Filter */}
        <div className="flex items-center space-x-1.5">
          <label className="text-slate-600 font-medium">Room/Lab:</label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-slate-50 text-slate-800"
          >
            <option value="ALL">All Rooms</option>
            {uniqueRooms.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Day Filter */}
        <div className="flex items-center space-x-1.5">
          <label className="text-slate-600 font-medium">Day:</label>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-slate-50 text-slate-800"
          >
            <option value="ALL">Full Week</option>
            {workingDays.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-xs bg-indigo-50 border border-indigo-200"></span>
            <span className="text-slate-600">Theory (Full Class)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-xs bg-emerald-50 border border-emerald-300"></span>
            <span className="text-slate-600">Practical (Batches)</span>
          </div>
          <div className="flex items-center space-x-1">
            <Lock className="w-3 h-3 text-slate-500" />
            <span className="text-slate-600">Locked</span>
          </div>
        </div>
      </div>

      {/* Timetable Grid View */}
      {filteredSessions.length === 0 ? (
        <EmptyState
          title="No sessions found"
          description="There are no sessions matching your selected filters for this timetable version."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px] text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600">
                <th className="p-3 text-left w-24 border-r border-slate-200 uppercase font-semibold">Day</th>
                {slots.map((slot) => (
                  <th
                    key={`${slot.startTime}-${slot.endTime}`}
                    className={`p-2.5 text-center border-r border-slate-200 font-semibold font-mono ${
                      slot.isBreak ? 'bg-amber-50/70 text-amber-800' : ''
                    }`}
                  >
                    {slot.startTime} - {slot.endTime}
                    {slot.isBreak && (
                      <span className="block text-[10px] font-sans font-normal">
                        ({slot.breakName || 'Break'})
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(selectedDay === 'ALL' ? workingDays : [selectedDay]).map((day) => {
                const daySessions = filteredSessions.filter((s) => s.day === day);

                return (
                  <tr key={day} className="hover:bg-slate-50/40">
                    <td className="p-3 font-bold text-slate-800 bg-slate-50/60 border-r border-slate-200">
                      {day}
                    </td>

                    {slots.map((slot) => {
                      if (slot.isBreak) {
                        return (
                          <td
                            key={`${slot.startTime}-${slot.endTime}`}
                            className="p-1.5 text-center border-r border-slate-200 bg-amber-50/40 text-amber-600 text-[11px] italic font-medium"
                          >
                            {slot.breakName || 'Lunch Break'}
                          </td>
                        );
                      }

                      // Find sessions that overlap with this slot
                      const matchedSessions = daySessions.filter((s) =>
                        intervalsOverlap(s.startTime, s.endTime, slot.startTime, slot.endTime)
                      );

                      return (
                        <td
                          key={`${slot.startTime}-${slot.endTime}`}
                          className="p-1.5 border-r border-slate-200 align-top h-24 min-w-[130px]"
                        >
                          {matchedSessions.map((session) => {
                            const isTheory = session.sessionType === 'theory';

                            return (
                              <div
                                key={session.sessionId || session._id}
                                className={`p-2 mb-1 rounded-lg border text-left shadow-xs transition-all relative group ${
                                  isTheory
                                    ? 'bg-indigo-50/90 border-indigo-200 hover:border-indigo-400 text-indigo-950'
                                    : 'bg-emerald-50/90 border-emerald-300 hover:border-emerald-400 text-emerald-950'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <span className="font-bold text-xs truncate block max-w-[90px]">
                                    {session.subjectCode}
                                  </span>

                                  {/* Lock Toggle Button */}
                                  {['admin', 'coordinator'].includes(role) && (
                                    <button
                                      onClick={() => handleToggleLock(session.sessionId || session._id)}
                                      className="p-0.5 text-slate-400 hover:text-slate-700"
                                      title={session.isLocked ? 'Click to Unlock' : 'Click to Lock'}
                                    >
                                      {session.isLocked ? (
                                        <Lock className="w-3 h-3 text-amber-600" />
                                      ) : (
                                        <Unlock className="w-3 h-3 opacity-40 hover:opacity-100" />
                                      )}
                                    </button>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-600 truncate mt-0.5" title={session.facultyName}>
                                  {session.facultyName}
                                </p>

                                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1 border-t border-slate-200/60 font-mono">
                                  <span className="font-semibold text-slate-700">{session.roomNumber}</span>
                                  {session.batchCode ? (
                                    <span className="px-1 py-0.2 bg-emerald-200/70 text-emerald-800 rounded-xs font-bold">
                                      {session.batchCode}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Class</span>
                                  )}
                                </div>

                                {/* Reassign / Move Action Trigger */}
                                {['admin', 'coordinator'].includes(role) && (
                                  <button
                                    onClick={() => openMoveModal(session)}
                                    className="hidden group-hover:block absolute bottom-1 right-1 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[9px] font-semibold text-brand-600 shadow-xs hover:bg-brand-50"
                                  >
                                    Move
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Move Modal with Conflict Explainer */}
      <Modal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title={`Move Session: ${sessionToMove?.subjectCode} (${sessionToMove?.sessionType})`}
      >
        {sessionToMove && (
          <form onSubmit={handleMoveSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-700">
              <p>
                <span className="font-semibold">Subject:</span> {sessionToMove.subjectName}
              </p>
              <p>
                <span className="font-semibold">Faculty:</span> {sessionToMove.facultyName}
              </p>
              <p>
                <span className="font-semibold">Target Group:</span> {sessionToMove.groupCode}{' '}
                {sessionToMove.batchCode ? `(${sessionToMove.batchCode})` : '(Full Class)'}
              </p>
            </div>

            {/* Error / Conflict Explainer Box */}
            {moveError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-800">
                <div className="flex items-center space-x-2 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Conflict Validation Rejection</span>
                </div>
                <p className="font-medium">{moveError.message}</p>
                {moveError.violations?.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px] text-rose-700">
                    {moveError.violations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {moveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{moveSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Target Day</label>
                <select
                  value={moveTargetDay}
                  onChange={(e) => setMoveTargetDay(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {workingDays.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Target Room</label>
                <select
                  value={moveTargetRoom}
                  onChange={(e) => setMoveTargetRoom(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {rooms.map((r) => (
                    <option key={r.roomNumber} value={r.roomNumber}>
                      {r.roomNumber} ({r.roomType}, Cap: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Start Time</label>
                <input
                  type="time"
                  value={moveTargetStartTime}
                  onChange={(e) => setMoveTargetStartTime(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">End Time</label>
                <input
                  type="time"
                  value={moveTargetEndTime}
                  onChange={(e) => setMoveTargetEndTime(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setMoveModalOpen(false)}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={moveLoading}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {moveLoading ? 'Validating Conflicts...' : 'Validate & Save Move'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

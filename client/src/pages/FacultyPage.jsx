import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Users, Plus, Calendar, Clock, AlertCircle } from 'lucide-react';

export function FacultyPage() {
  const { role } = useAuth();
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    facultyId: '',
    name: '',
    email: '',
    department: 'Digital Forensics & Information Security',
    designation: 'Assistant Professor',
    maxDailyTeachingHours: 4,
    maxWeeklyTeachingHours: 16,
  });

  const loadFaculty = async () => {
    setLoading(true);
    try {
      const res = await api.get('/faculty');
      setFaculty(res.data?.faculty || []);
    } catch (err) {
      console.error('Error loading faculty:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaculty();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/faculty', {
        ...formData,
        facultyId: formData.facultyId.toUpperCase(),
        email: formData.email.toLowerCase(),
        maxDailyTeachingHours: parseInt(formData.maxDailyTeachingHours, 10),
        maxWeeklyTeachingHours: parseInt(formData.maxWeeklyTeachingHours, 10),
      });
      setCreateModalOpen(false);
      loadFaculty();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create faculty');
    }
  };

  if (loading) return <LoadingSpinner message="Loading faculty profiles..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Faculty & Availability Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage teaching loads, available working days, and institutional commitments</p>
        </div>
        {['admin', 'coordinator'].includes(role) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {faculty.map((f) => (
          <Card key={f._id} title={f.name} subtitle={`${f.designation} • ${f.department}`}>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Faculty ID:</span>
                <span className="font-mono font-bold text-brand-700">{f.facultyId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Email:</span>
                <span className="text-slate-700">{f.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Teaching Limits:</span>
                <span className="text-slate-700 font-medium">
                  {f.maxDailyTeachingHours} hrs/day • {f.maxWeeklyTeachingHours} hrs/week
                </span>
              </div>

              {/* Available Days */}
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Available Working Days:</span>
                <div className="flex flex-wrap gap-1">
                  {f.availableDays?.map((d) => (
                    <Badge key={d} variant="default" size="xs">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Unavailable Slots / Fixed Commitments */}
              {((f.unavailableSlots?.length || 0) > 0 || (f.fixedCommitments?.length || 0) > 0) && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-slate-500 font-semibold block">Commitments & Unavailability:</span>
                  {f.unavailableSlots?.map((u, idx) => (
                    <div key={idx} className="p-1.5 bg-amber-50 rounded border border-amber-200 text-amber-800 text-[11px]">
                      <span className="font-bold">{u.day} ({u.startTime}-{u.endTime}):</span> {u.reason}
                    </div>
                  ))}
                  {f.fixedCommitments?.map((fc, idx) => (
                    <div key={idx} className="p-1.5 bg-indigo-50 rounded border border-indigo-200 text-indigo-800 text-[11px]">
                      <span className="font-bold">{fc.day} ({fc.startTime}-{fc.endTime}):</span> {fc.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Register Faculty Member">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Faculty ID</label>
              <input
                type="text"
                required
                value={formData.facultyId}
                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                placeholder="e.g. FAC-DFIS-05"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Dr. Priya Nair"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Institutional Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="priya.nair@schedulix.local"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Max Daily Teaching Hours</label>
              <input
                type="number"
                min={1}
                max={8}
                value={formData.maxDailyTeachingHours}
                onChange={(e) => setFormData({ ...formData, maxDailyTeachingHours: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Max Weekly Teaching Hours</label>
              <input
                type="number"
                min={1}
                max={30}
                value={formData.maxWeeklyTeachingHours}
                onChange={(e) => setFormData({ ...formData, maxWeeklyTeachingHours: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Save Faculty
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

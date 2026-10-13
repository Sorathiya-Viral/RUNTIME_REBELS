import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { BookOpen, Plus, Clock, Users, Building } from 'lucide-react';

export function SubjectsPage() {
  const { role } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    programmeCode: 'M.Sc. DFIS',
    semesterNumber: 1,
    subjectType: 'theory',
    primaryFaculty: '',
    theoryPeriodsPerWeek: 3,
    practicalSessionsPerWeek: 0,
    practicalConsecutivePeriods: 2,
    requiredRoomType: 'lecture_hall',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [subRes, facRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/faculty'),
      ]);
      setSubjects(subRes.data?.subjects || []);
      const fList = facRes.data?.faculty || [];
      setFacultyList(fList);
      if (fList.length > 0 && !formData.primaryFaculty) {
        setFormData((prev) => ({ ...prev, primaryFaculty: fList[0]._id }));
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/subjects', {
        ...formData,
        code: formData.code.toUpperCase(),
        semesterNumber: parseInt(formData.semesterNumber, 10),
        theoryPeriodsPerWeek: parseInt(formData.theoryPeriodsPerWeek, 10),
        practicalSessionsPerWeek: parseInt(formData.practicalSessionsPerWeek, 10),
        practicalConsecutivePeriods: parseInt(formData.practicalConsecutivePeriods, 10),
      });
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create subject');
    }
  };

  if (loading) return <LoadingSpinner message="Loading academic curriculum subjects..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Curriculum Subjects & Practical Batches</h1>
          <p className="text-xs text-slate-500 mt-0.5">Define weekly theory quotas, consecutive lab periods, and faculty assignments</p>
        </div>
        {['admin', 'coordinator'].includes(role) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Subject Code</th>
              <th className="py-3 px-4">Course Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Assigned Faculty</th>
              <th className="py-3 px-4">Weekly Requirements</th>
              <th className="py-3 px-4">Room Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subjects.map((sub) => (
              <tr key={sub._id} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-mono font-bold text-brand-700">{sub.code}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{sub.name}</td>
                <td className="py-3 px-4">
                  <Badge variant={sub.subjectType === 'practical' ? 'success' : 'primary'} size="xs">
                    {sub.subjectType.toUpperCase()}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {sub.primaryFaculty?.name || 'Unassigned'}
                  <span className="block text-[10px] text-slate-400 font-mono">
                    {sub.primaryFaculty?.facultyId}
                  </span>
                </td>
                <td className="py-3 px-4 font-medium text-slate-600">
                  {sub.subjectType === 'theory' ? (
                    <span>{sub.theoryPeriodsPerWeek} periods / week</span>
                  ) : (
                    <span>
                      {sub.practicalSessionsPerWeek} session/batch ({sub.practicalConsecutivePeriods} consecutive hrs)
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={sub.requiredRoomType === 'laboratory' ? 'warning' : 'default'} size="xs">
                    {sub.requiredRoomType}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add Curriculum Subject">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Subject Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. DFIS106"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Subject Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cloud Security Architecture"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Subject Type</label>
              <select
                value={formData.subjectType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subjectType: e.target.value,
                    requiredRoomType: e.target.value === 'practical' ? 'laboratory' : 'lecture_hall',
                    theoryPeriodsPerWeek: e.target.value === 'practical' ? 0 : 3,
                    practicalSessionsPerWeek: e.target.value === 'practical' ? 1 : 0,
                  })
                }
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="theory">Theory Lecture</option>
                <option value="practical">Practical Laboratory</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Primary Faculty</label>
              <select
                value={formData.primaryFaculty}
                onChange={(e) => setFormData({ ...formData, primaryFaculty: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
                required
              >
                {facultyList.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name} ({f.facultyId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.subjectType === 'theory' ? (
            <div>
              <label className="block font-semibold text-slate-700">Theory Periods Per Week</label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.theoryPeriodsPerWeek}
                onChange={(e) => setFormData({ ...formData, theoryPeriodsPerWeek: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700">Sessions Per Batch / Week</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.practicalSessionsPerWeek}
                  onChange={(e) => setFormData({ ...formData, practicalSessionsPerWeek: e.target.value })}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Consecutive Periods</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={formData.practicalConsecutivePeriods}
                  onChange={(e) => setFormData({ ...formData, practicalConsecutivePeriods: e.target.value })}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          )}

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
              Save Subject
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

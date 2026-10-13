import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { GraduationCap, Plus, Users, Layers } from 'lucide-react';

export function ProgrammesPage() {
  const { role } = useAuth();
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Programme Form
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    academicYear: '2026-2027',
    department: 'Digital Forensics & Information Security',
    groupName: 'Section A',
    groupCode: '',
    totalStrength: 40,
    batch1Name: 'Batch 1',
    batch1Code: 'B1',
    batch1Strength: 20,
    batch2Name: 'Batch 2',
    batch2Code: 'B2',
    batch2Strength: 20,
  });

  const loadProgrammes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/programmes');
      setProgrammes(res.data?.programmes || []);
    } catch (err) {
      console.error('Error loading programmes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgrammes();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        academicYear: formData.academicYear,
        department: formData.department,
        semesters: [
          {
            semesterNumber: 1,
            academicGroups: [
              {
                name: formData.groupName,
                groupCode: (formData.groupCode || `${formData.code}-S1-A`).toUpperCase(),
                totalStrength: parseInt(formData.totalStrength, 10),
                practicalBatches: [
                  { batchName: formData.batch1Name, batchCode: formData.batch1Code.toUpperCase(), strength: parseInt(formData.batch1Strength, 10) },
                  { batchName: formData.batch2Name, batchCode: formData.batch2Code.toUpperCase(), strength: parseInt(formData.batch2Strength, 10) },
                ],
              },
            ],
          },
        ],
      };

      await api.post('/programmes', payload);
      setCreateModalOpen(false);
      loadProgrammes();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create programme');
    }
  };

  if (loading) return <LoadingSpinner message="Loading academic programmes..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Programmes & Academic Groups</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage cohorts, student strengths, and practical batch partitions</p>
        </div>
        {['admin', 'coordinator'].includes(role) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Programme</span>
          </button>
        )}
      </div>

      {programmes.length === 0 ? (
        <EmptyState title="No programmes found" description="Create a programme to define academic groups and batches." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programmes.map((prog) => (
            <Card key={prog._id} title={prog.name} subtitle={`Code: ${prog.code} • Year: ${prog.academicYear}`}>
              <div className="space-y-4">
                <div className="text-xs text-slate-600 font-medium">
                  <span>Department: </span>
                  <span className="font-semibold text-slate-800">{prog.department}</span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configured Semesters & Groups:</h4>
                  {prog.semesters?.map((sem) => (
                    <div key={sem._id || sem.semesterNumber} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Semester {sem.semesterNumber}</span>
                        <Badge size="xs" variant="primary">{sem.academicGroups?.length || 0} Groups</Badge>
                      </div>

                      {sem.academicGroups?.map((grp) => (
                        <div key={grp._id || grp.groupCode} className="text-xs bg-white p-2 rounded-md border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-brand-700">{grp.name} ({grp.groupCode})</span>
                            <span className="text-slate-600 font-mono text-[11px] font-semibold">{grp.totalStrength} Students</span>
                          </div>

                          {grp.practicalBatches?.length > 0 && (
                            <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1.5">
                              {grp.practicalBatches.map((batch) => (
                                <span key={batch.batchCode} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                                  {batch.batchName} [{batch.batchCode}]: {batch.strength} students
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Programme & Cohort">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Programme Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. M.Sc. Cyber Security"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Programme Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. M.SC. CS"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Academic Year</label>
              <input
                type="text"
                required
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Total Student Strength</label>
              <input
                type="number"
                required
                min={1}
                value={formData.totalStrength}
                onChange={(e) => setFormData({ ...formData, totalStrength: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Practical Batches (Laboratory Split):</h5>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600">Batch 1 Name</label>
                <input
                  type="text"
                  value={formData.batch1Name}
                  onChange={(e) => setFormData({ ...formData, batch1Name: e.target.value })}
                  className="mt-1 w-full p-1.5 border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600">Batch 1 Code</label>
                <input
                  type="text"
                  value={formData.batch1Code}
                  onChange={(e) => setFormData({ ...formData, batch1Code: e.target.value })}
                  className="mt-1 w-full p-1.5 border border-slate-300 rounded-md bg-white uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600">Batch 1 Strength</label>
                <input
                  type="number"
                  value={formData.batch1Strength}
                  onChange={(e) => setFormData({ ...formData, batch1Strength: e.target.value })}
                  className="mt-1 w-full p-1.5 border border-slate-300 rounded-md bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600">Batch 2 Name</label>
                <input
                  type="text"
                  value={formData.batch2Name}
                  onChange={(e) => setFormData({ ...formData, batch2Name: e.target.value })}
                  className="mt-1 w-full p-1.5 border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600">Batch 2 Code</label>
                <input
                  type="text"
                  value={formData.batch2Code}
                  onChange={(e) => setFormData({ ...formData, batch2Code: e.target.value })}
                  className="mt-1 w-full p-1.5 border border-slate-300 rounded-md bg-white uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600">Batch 2 Strength</label>
                <input
                  type="number"
                  value={formData.batch2Strength}
                  onChange={(e) => setFormData({ ...formData, batch2Strength: e.target.value })}
                  className="mt-1 w-full p-1.5 border border-slate-300 rounded-md bg-white"
                />
              </div>
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
              Save Programme
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

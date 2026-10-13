import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Building2, Plus, Users, Cpu } from 'lucide-react';

export function RoomsPage() {
  const { role } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    roomNumber: '',
    name: '',
    roomType: 'lecture_hall',
    capacity: 40,
    building: 'Cyber Forensic Complex',
    floor: 1,
    labEquipmentStr: '',
  });

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rooms');
      setRooms(res.data?.rooms || []);
    } catch (err) {
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const equipment = formData.labEquipmentStr
        ? formData.labEquipmentStr.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      await api.post('/rooms', {
        roomNumber: formData.roomNumber.toUpperCase(),
        name: formData.name,
        roomType: formData.roomType,
        capacity: parseInt(formData.capacity, 10),
        building: formData.building,
        floor: parseInt(formData.floor, 10),
        labEquipment: equipment,
      });

      setCreateModalOpen(false);
      loadRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create room');
    }
  };

  if (loading) return <LoadingSpinner message="Loading institutional facilities..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Classrooms & Laboratories</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage seating capacities, forensic laboratory hardware, and facility availability</p>
        </div>
        {['admin', 'coordinator'].includes(role) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Facility</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rooms.map((room) => (
          <Card
            key={room._id}
            title={room.roomNumber}
            subtitle={room.name}
            action={
              <Badge variant={room.roomType === 'laboratory' ? 'indigo' : 'default'} size="xs">
                {room.roomType.replace('_', ' ').toUpperCase()}
              </Badge>
            }
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Seating Capacity:</span>
                <span className="font-bold text-slate-800">{room.capacity} Students</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Location:</span>
                <span className="text-slate-700">{room.building}, Floor {room.floor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Operational Status:</span>
                <Badge variant={room.isAvailable ? 'success' : 'danger'} size="xs">
                  {room.isAvailable ? 'Available' : 'Maintenance'}
                </Badge>
              </div>

              {room.labEquipment?.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">Equipment / Forensic Tools:</span>
                  <div className="flex flex-wrap gap-1">
                    {room.labEquipment.map((eq, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px]">
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add Classroom or Laboratory">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Room Code / Number</label>
              <input
                type="text"
                required
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                placeholder="e.g. LAB-303"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Facility Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cloud & Virtualization Lab"
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Facility Type</label>
              <select
                value={formData.roomType}
                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="lecture_hall">Lecture Hall</option>
                <option value="laboratory">Laboratory</option>
                <option value="seminar_hall">Seminar Hall</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Seating Capacity</label>
              <input
                type="number"
                required
                min={5}
                max={500}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Building</label>
              <input
                type="text"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Floor</label>
              <input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700">Forensic Tools & Equipment (Comma-separated)</label>
            <input
              type="text"
              value={formData.labEquipmentStr}
              onChange={(e) => setFormData({ ...formData, labEquipmentStr: e.target.value })}
              placeholder="e.g. EnCase, FTK, Hardware Write Blockers, Cellebrite"
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
            />
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
              Save Facility
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

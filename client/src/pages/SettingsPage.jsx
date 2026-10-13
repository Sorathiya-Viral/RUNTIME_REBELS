import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Settings, Save, CheckCircle, Clock } from 'lucide-react';

export function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings');
        setSettings(res.data?.settings || null);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleDayToggle = (day) => {
    if (!settings) return;
    const current = settings.workingDays || [];
    const nextDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setSettings({ ...settings, workingDays: nextDays });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await api.put('/settings', settings);
      if (res.data?.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update institution settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading institution settings..." />;

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Institution & Working Hours Policy</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure operating hours, duration of teaching periods, breaks, and academic year policies
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Operational Hours & Time Policy">
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700">Institution Name</label>
                <input
                  type="text"
                  required
                  value={settings?.institutionName || ''}
                  onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Academic Year</label>
                <input
                  type="text"
                  required
                  value={settings?.academicYear || ''}
                  onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700">Opening Time</label>
                <input
                  type="time"
                  required
                  value={settings?.dayStartTime || '09:00'}
                  onChange={(e) => setSettings({ ...settings, dayStartTime: e.target.value })}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Closing Time</label>
                <input
                  type="time"
                  required
                  value={settings?.dayEndTime || '17:00'}
                  onChange={(e) => setSettings({ ...settings, dayEndTime: e.target.value })}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Period Duration (Minutes)</label>
                <input
                  type="number"
                  min={30}
                  max={120}
                  required
                  value={settings?.periodDurationMinutes || 60}
                  onChange={(e) => setSettings({ ...settings, periodDurationMinutes: parseInt(e.target.value, 10) })}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Working Days Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-2">Institutional Working Days</label>
              <div className="flex flex-wrap gap-2">
                {allDays.map((day) => {
                  const isChecked = settings?.workingDays?.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scheduled Breaks */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block font-semibold text-slate-700">Scheduled Lunch / Recess Windows</label>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                <span className="font-bold">Lunch Break: 13:00 - 14:00</span> (Strictly excluded from lecture & laboratory scheduling)
              </div>
            </div>
          </div>
        </Card>

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Institution policy updated and audited successfully.</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Updating Policy...' : 'Save Institution Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

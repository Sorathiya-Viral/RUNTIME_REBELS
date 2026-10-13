import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Sliders, Shield, Award, CheckCircle } from 'lucide-react';

export function ConstraintsPage() {
  const [constraints, setConstraints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConstraints() {
      try {
        const res = await api.get('/constraints');
        setConstraints(res.data?.constraints || []);
      } catch (err) {
        console.error('Error loading constraints:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConstraints();
  }, []);

  if (loading) return <LoadingSpinner message="Loading scheduling constraints..." />;

  const hardConstraints = constraints.filter((c) => c.constraintType === 'hard');
  const softConstraints = constraints.filter((c) => c.constraintType === 'soft');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Scheduling Constraints & Preferences</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Engine rules enforced during automatic timetable generation and manual editing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hard Constraints */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-slate-800">Mandatory Hard Constraints (Priority 10)</h2>
          </div>
          <p className="text-xs text-slate-500">
            Hard constraints must never be violated. Any proposed assignment violating these rules is mathematically rejected.
          </p>

          <div className="space-y-3">
            {hardConstraints.map((c) => (
              <Card key={c._id} className="border-l-4 border-l-rose-500">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                    <p className="text-[11px] text-slate-600 mt-1">{c.description}</p>
                  </div>
                  <Badge variant="danger" size="xs">HARD</Badge>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Category: {c.category}</span>
                  <span>Target: {c.targetEntity}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Soft Preferences */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-800">Soft Quality Preferences</h2>
          </div>
          <p className="text-xs text-slate-500">
            Soft preferences guide candidate-slot value ranking and contribute to the overall quality score (0 to 100).
          </p>

          <div className="space-y-3">
            {softConstraints.map((c) => (
              <Card key={c._id} className="border-l-4 border-l-brand-500">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                    <p className="text-[11px] text-slate-600 mt-1">{c.description}</p>
                  </div>
                  <Badge variant="primary" size="xs">SOFT (Pri: {c.priority})</Badge>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Category: {c.category}</span>
                  <span>Target: {c.targetEntity}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

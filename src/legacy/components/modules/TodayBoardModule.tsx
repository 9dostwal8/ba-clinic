// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, UserCheck, Armchair, Receipt, CheckCircle2, RefreshCw,
  Stethoscope, CreditCard, FileText, Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { canSetAppointmentStatus, isReception, statusPermissionMessage } from '../../utils/appointmentStatusPermissions';

const STAGES = [
  { key: 'scheduled', label: 'Booked', icon: Clock, tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'arrived', label: 'Arrived', icon: UserCheck, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'in_chair', label: 'In chair', icon: Armchair, tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'ready_to_pay', label: 'Ready to pay', icon: Receipt, tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'completed', label: 'Closed', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const normalize = (s: string) => (s === 'confirmed' ? 'scheduled' : s);

export function TodayBoardModule({ onNavigate }: { onNavigate?: (page: string, params?: any) => void }) {
  const { profile } = useAuth();
  const isDoctor = profile?.role === 'doctor';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (profile?.clinic_id) load();
  }, [profile?.clinic_id]);

  const load = async () => {
    setLoading(true);
    try {
      const day = new Date();
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString();
      const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).toISOString();

      let query = supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, appointment_date, status, appointment_type, notes, patient:patients(full_name, phone), doctor:users!appointments_doctor_id_fkey(full_name)')
        .eq('clinic_id', profile.clinic_id)
        .gte('appointment_date', start)
        .lt('appointment_date', end)
        .order('appointment_date', { ascending: true });

      if (isDoctor) query = query.eq('doctor_id', profile.id);

      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      console.error('Today board load failed', e);
    } finally {
      setLoading(false);
    }
  };

  const setStage = async (row: any, next: string) => {
    if (!canSetAppointmentStatus(profile, row, next)) {
      setNotice(statusPermissionMessage(profile));
      setTimeout(() => setNotice(''), 3500);
      return;
    }
    setBusyId(row.id);
    const patch: Record<string, any> = { status: next };
    if (next === 'arrived') patch.arrived_at = new Date().toISOString();
    if (next === 'in_chair') patch.seated_at = new Date().toISOString();
    if (next === 'completed') patch.completed_at = new Date().toISOString();
    try {
      const { error } = await supabase.from('appointments').update(patch).eq('id', row.id);
      if (error) throw error;
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, ...patch } : r)));
    } catch (e) {
      console.error('Stage update failed', e);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => (r.patient?.full_name || '').toLowerCase().includes(q));
  }, [rows, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of STAGES) map[s.key] = 0;
    for (const r of rows) {
      const k = normalize(r.status);
      if (map[k] !== undefined) map[k] += 1;
    }
    return map;
  }, [rows]);

  const nextAction = (status: string) => {
    switch (normalize(status)) {
      case 'scheduled': return { next: 'arrived', label: 'Check in' };
      case 'arrived': return { next: 'in_chair', label: 'Seat patient' };
      case 'in_chair': return { next: 'ready_to_pay', label: 'Finish treatment' };
      case 'ready_to_pay': return { next: 'completed', label: 'Close visit' };
      default: return null;
    }
  };

  return (
    <div className="space-y-5">
      {notice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {notice}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            {isDoctor ? ' — your chair' : ' — clinic floor'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Find patient"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={load}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STAGES.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.key} className={`rounded-xl border px-3 py-2.5 ${s.tone}`}>
              <div className="flex items-center gap-2 text-xs font-medium">
                <Icon className="w-4 h-4" />
                {s.label}
              </div>
              <div className="text-2xl font-bold mt-1">{counts[s.key] ?? 0}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {loading && <div className="p-6 text-sm text-gray-500">Loading today's visits…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">No visits scheduled today.</div>
        )}
        {!loading && filtered.map(row => {
          const stage = STAGES.find(s => s.key === normalize(row.status));
          const action = nextAction(row.status);
          const time = new Date(row.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={row.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 truncate">{row.patient?.full_name || 'Patient'}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${stage?.tone || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {stage?.label || row.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {time} · {row.doctor?.full_name || '—'} {row.appointment_type ? `· ${row.appointment_type}` : ''}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isDoctor ? (
                  <>
                    <button onClick={() => onNavigate?.(`treatment-plans?patientId=${row.patient_id}`)}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                      <Stethoscope className="w-3.5 h-3.5" /> Plan
                    </button>
                    <button onClick={() => onNavigate?.(`prescriptions?patientId=${row.patient_id}`)}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                      <FileText className="w-3.5 h-3.5" /> Prescription
                    </button>
                  </>
                ) : (
                  <button onClick={() => onNavigate?.(`receptionist-payments?patientId=${row.patient_id}`)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                    <CreditCard className="w-3.5 h-3.5" /> Payment
                  </button>
                )}

                {action && canSetAppointmentStatus(profile, row, action.next) ? (
                  <button
                    disabled={busyId === row.id}
                    onClick={() => setStage(row, action.next)}
                    className="text-xs px-3 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ) : action ? (
                  <span className="text-[11px] px-3 py-2 rounded-lg bg-gray-50 text-gray-400 border border-gray-200">
                    {isReception(profile) ? 'Dentist updates this' : 'Assigned dentist only'}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TodayBoardModule;

// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock,
  Activity, Stethoscope, Pill, User, RefreshCw, X, CalendarDays,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ToothSelector } from '../ToothSelector';
import { DentalChart, type LegendItem, type ToothStatus } from '../DentalChart';

const PLAN_TOOTH_STATUS: Record<string, ToothStatus> = {
  planned: 'cavity',
  in_progress: 'previous_visit',
  completed: 'filled',
  cancelled: 'missing',
};

const PLAN_CHART_LEGEND: LegendItem[] = [
  { status: 'cavity', label: 'Planned work' },
  { status: 'previous_visit', label: 'In progress' },
  { status: 'filled', label: 'Completed' },
  { status: 'missing', label: 'Cancelled' },
  { status: 'healthy', label: 'Not in plan' },
];

type Step = 1 | 2 | 3;

const STATUS_META: Record<string, { label: string; tone: string }> = {
  planned: { label: 'Planned', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In progress', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  completed: { label: 'Completed', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export function DoctorTreatmentPlansModule({ onNavigate, patientId }: { onNavigate?: (page: string, params?: any) => void; patientId?: string }) {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [todayPatientIds, setTodayPatientIds] = useState<string[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [search, setSearch] = useState('');
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<any>({ patient_id: patientId || '', treatment_type_id: '', teeth: [], visits: 1, notes: '', discount: '', discountType: 'amount' });
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitForm, setVisitForm] = useState<any>(null);
  const [nextForm, setNextForm] = useState<any>(null);

  useEffect(() => { if (profile?.clinic_id) load(); }, [profile?.clinic_id]);
  useEffect(() => { if (patientId) { setForm(f => ({ ...f, patient_id: patientId })); } }, [patientId]);

  const load = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const [plansRes, patientsRes, typesRes, apptRes] = await Promise.all([
        supabase.from('treatment_plans')
          .select('*, patients(full_name, patient_number, phone)')
          .eq('clinic_id', profile.clinic_id)
          .eq('doctor_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase.from('patients').select('id, full_name, patient_number, phone').eq('clinic_id', profile.clinic_id).order('full_name'),
        supabase.from('treatment_types').select('id, name, name_ar, category, cost').eq('is_active', true).order('name'),
        supabase.from('appointments').select('patient_id').eq('clinic_id', profile.clinic_id).eq('doctor_id', profile.id).gte('appointment_date', start).lt('appointment_date', end),
      ]);

      setPlans(plansRes.data || []);
      setPatients(patientsRes.data || []);
      setTypes(typesRes.data || []);
      setTodayPatientIds([...new Set((apptRes.data || []).map((a: any) => a.patient_id))]);
    } catch (e) {
      console.error('Load treatment plans failed', e);
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans
      .filter(p => (tab === 'completed' ? p.status === 'completed' : p.status !== 'completed'))
      .filter(p => !q || (p.patients?.full_name || '').toLowerCase().includes(q) || (p.treatment_category || '').toLowerCase().includes(q));
  }, [plans, tab, search]);

  const orderedPatients = useMemo(() => {
    const today = patients.filter(p => todayPatientIds.includes(p.id));
    const rest = patients.filter(p => !todayPatientIds.includes(p.id));
    return { today, rest };
  }, [patients, todayPatientIds]);

  const selectedType = types.find(t => t.id === form.treatment_type_id);

  const resetWizard = () => {
    setForm({ patient_id: patientId || '', treatment_type_id: '', teeth: [], visits: 1, notes: '', discount: '', discountType: 'amount' });
    setStep(1); setError(''); setWizard(false);
  };

  const savePlan = async () => {
    setError('');
    if (!form.patient_id || !form.treatment_type_id) { setError('Pick a patient and a treatment.'); return; }
    setBusy('save');
    try {
      const teethCount = Math.max(form.teeth.length, 1);
      const gross = Number(selectedType?.cost || 0) * teethCount;
      const discountValue = form.discountType === 'percent'
        ? Math.min(gross, (gross * (Number(form.discount) || 0)) / 100)
        : Math.min(gross, Number(form.discount) || 0);
      const total = Math.max(0, gross - discountValue);
      const notes = [form.notes, discountValue > 0 ? `Discount applied: ${discountValue.toLocaleString()}` : null]
        .filter(Boolean).join('\n');
      const visitCount = Math.max(1, Number(form.visits) || 1);
      const { data: created, error: err } = await supabase.from('treatment_plans').insert({
        clinic_id: profile.clinic_id,
        patient_id: form.patient_id,
        doctor_id: profile.id,
        treatment_type_id: form.treatment_type_id,
        treatment_category: selectedType?.category || 'general',
        total_planned_visits: visitCount,
        completed_visits: 0,
        status: 'in_progress',
        start_date: new Date().toISOString().slice(0, 10),
        total_cost: total,
        paid_amount: 0,
        tooth_numbers: form.teeth,
        notes: notes || null,
        created_by: profile.id,
      }).select('id').single();
      if (err) throw err;

      // Split the agreed price across the planned visits (remainder on the last visit)
      const share = Math.floor((total / visitCount) * 100) / 100;
      const rows = Array.from({ length: visitCount }, (_, i) => ({
        clinic_id: profile.clinic_id,
        treatment_plan_id: created.id,
        patient_id: form.patient_id,
        doctor_id: profile.id,
        visit_number: i + 1,
        visit_date: i === 0 ? new Date().toISOString().slice(0, 10) : null,
        visit_type: selectedType?.name || 'Treatment',
        tooth_numbers: (form.teeth || []).map((t: any) => String(t)),
        visit_cost: i === visitCount - 1 ? Math.max(0, Number((total - share * (visitCount - 1)).toFixed(2))) : share,
        // The plan-creation session itself is visit #1: it already happened today,
        // so it is counted as done and payable. Everything after it is scheduled.
        status: i === 0 ? 'completed' : 'scheduled',
        procedure_performed: i === 0 ? (selectedType?.name || 'Initial visit') : null,
        created_by: profile.id,
      }));
      const { error: vErr } = await supabase.from('treatment_visits').insert(rows);
      if (vErr) throw vErr;

      resetWizard();
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Could not save the plan.');
    } finally {
      setBusy(null);
    }
  };

  const openPlan = async (plan: any) => {
    setDetail(plan);
    setVisitsLoading(true);
    setVisitForm(null);
    setNextForm(null);
    try {
      const { data } = await supabase.from('treatment_visits')
        .select('*').eq('treatment_plan_id', plan.id).order('visit_number');
      setVisits(data || []);
    } finally { setVisitsLoading(false); }
  };

  const refreshDetail = async (planId: string) => {
    const [{ data: v }, { data: p }] = await Promise.all([
      supabase.from('treatment_visits').select('*').eq('treatment_plan_id', planId).order('visit_number'),
      supabase.from('treatment_plans').select('*, patients(full_name, patient_number, phone)').eq('id', planId).single(),
    ]);
    setVisits(v || []);
    if (p) { setDetail(p); setPlans(prev => prev.map(x => (x.id === planId ? { ...x, ...p } : x))); }
  };

  const saveVisitWork = async (visit: any, complete: boolean) => {
    setBusy(visit.id);
    try {
      const payload: any = {
        procedure_performed: visitForm.procedure || null,
        complications: visitForm.complications || null,
        next_visit_notes: visitForm.next_notes || null,
        visit_cost: Number(visitForm.cost) || 0,
        visit_date: visitForm.date || new Date().toISOString().slice(0, 10),
      };
      if (complete) payload.status = 'completed';
      const { error: err } = await supabase.from('treatment_visits').update(payload).eq('id', visit.id);
      if (err) throw err;
      if (complete) {
        await supabase.from('treatment_plans')
          .update({ status: 'in_progress' })
          .eq('id', visit.treatment_plan_id)
          .eq('status', 'planned');
      }
      setVisitForm(null);
      await refreshDetail(visit.treatment_plan_id);
    } catch (e: any) { console.error(e); alert(e.message || 'Could not save visit'); }
    finally { setBusy(null); }
  };

  const scheduleVisit = async (visit: any) => {
    if (!nextForm?.datetime) return;
    setBusy(visit.id);
    try {
      const iso = new Date(nextForm.datetime).toISOString();
      const { error: err } = await supabase.from('appointments').insert({
        clinic_id: profile.clinic_id,
        patient_id: visit.patient_id,
        doctor_id: profile.id,
        appointment_date: iso,
        duration_minutes: Number(nextForm.duration) || 30,
        status: 'scheduled',
        appointment_type: detail?.treatment_category || 'treatment',
        notes: `Treatment plan visit ${visit.visit_number}${nextForm.notes ? ` — ${nextForm.notes}` : ''}`,
        treatment_plan_id: visit.treatment_plan_id,
        visit_number: visit.visit_number,
        created_by: profile.id,
      });
      if (err) throw err;
      await supabase.from('treatment_visits')
        .update({ visit_date: nextForm.datetime.slice(0, 10) })
        .eq('id', visit.id);
      setNextForm(null);
      await refreshDetail(visit.treatment_plan_id);
    } catch (e: any) { console.error(e); alert(e.message || 'Could not schedule visit'); }
    finally { setBusy(null); }
  };

  const addExtraVisit = async (plan: any) => {
    setBusy(plan.id);
    try {
      const nextNo = (visits[visits.length - 1]?.visit_number || visits.length) + 1;
      await supabase.from('treatment_visits').insert({
        clinic_id: profile.clinic_id,
        treatment_plan_id: plan.id,
        patient_id: plan.patient_id,
        doctor_id: profile.id,
        visit_number: nextNo,
        visit_type: 'Follow-up',
        visit_cost: 0,
        status: 'scheduled',
        created_by: profile.id,
      });
      // Adding a visit re-opens a plan that was already sent to reception
      await supabase.from('treatment_plans')
        .update({ total_planned_visits: nextNo, status: 'in_progress' }).eq('id', plan.id);
      await refreshDetail(plan.id);
    } catch (e: any) { console.error(e); } finally { setBusy(null); }
  };

  const completePlan = async (plan: any) => {
    setBusy(plan.id);
    try {
      const { error: err } = await supabase.from('treatment_plans')
        .update({
          status: 'completed',
          completion_date: new Date().toISOString().slice(0, 10),
        })
        .eq('id', plan.id);
      if (err) throw err;
      setDetail(null);
      await load();
    } catch (e) { console.error(e); } finally { setBusy(null); }
  };


  if (wizard) {
    const selectedPatient = patients.find(p => p.id === form.patient_id);
    const teethCount = Math.max(form.teeth.length, 1);
    const unit = Number(selectedType?.cost || 0);
    const gross = unit * teethCount;
    const discount = form.discountType === 'percent'
      ? Math.min(gross, (gross * (Number(form.discount) || 0)) / 100)
      : Math.min(gross, Number(form.discount) || 0);
    const net = Math.max(0, gross - discount);

    const SectionHeader = ({ n, title, done, hint }: any) => (
      <div className="flex items-center gap-3">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-sky-600 text-white'}`}>
          {done ? <Check className="w-4 h-4" /> : n}
        </span>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {hint && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
      </div>
    );

    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <button onClick={resetWizard} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <span className="text-sm text-gray-500">New treatment plan</span>
        </div>

        {/* Step 1 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <SectionHeader n={1} title="Patient" done={!!form.patient_id} hint={selectedPatient ? selectedPatient.full_name : 'Pick who you are treating'} />
          {orderedPatients.today.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Today's patients</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {orderedPatients.today.map(p => (
                  <button key={p.id} onClick={() => { setForm(f => ({ ...f, patient_id: p.id })); setStep(2); }}
                    className={`text-left px-4 py-3 rounded-xl border-2 transition ${form.patient_id === p.id ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-sky-300'}`}>
                    <div className="font-semibold text-sm text-gray-900">{p.full_name}</div>
                    <div className="text-xs text-gray-500">{p.patient_number}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">All patients</p>
            <select value={form.patient_id} onChange={e => { setForm(f => ({ ...f, patient_id: e.target.value })); if (e.target.value) setStep(2); }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
              <option value="">Select patient…</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} · {p.patient_number}</option>)}
            </select>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`bg-white rounded-2xl border border-gray-200 p-5 space-y-4 transition ${form.patient_id ? '' : 'opacity-50 pointer-events-none'}`}>
          <SectionHeader n={2} title="Treatment & teeth" done={!!form.treatment_type_id} hint={selectedType ? selectedType.name : 'Choose the procedure and affected teeth'} />
          <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-0.5">
            {types.map(tt => (
              <button key={tt.id} onClick={() => { setForm(f => ({ ...f, treatment_type_id: tt.id })); setStep(3); }}
                className={`text-left px-4 py-3 rounded-xl border-2 transition ${form.treatment_type_id === tt.id ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-sky-300'}`}>
                <div className="font-semibold text-sm text-gray-900">{tt.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{tt.category}</span>
                  <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">{Number(tt.cost || 0).toLocaleString()}</span>
                </div>
              </button>
            ))}
            {types.length === 0 && <p className="text-sm text-gray-500">No treatment catalog yet — ask your clinic admin.</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Teeth (optional)</p>
            <ToothSelector selectedTeeth={form.teeth} onChange={(teeth) => setForm(f => ({ ...f, teeth }))} />
          </div>
        </div>

        {/* Step 3 */}
        <div className={`bg-white rounded-2xl border border-gray-200 p-5 space-y-4 transition ${form.treatment_type_id ? '' : 'opacity-50 pointer-events-none'}`}>
          <SectionHeader n={3} title="Visits, price & notes" done={false} hint="Set visits, apply a discount if needed" />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Planned visits</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, visits: n }))}
                  className={`w-12 h-12 rounded-xl border-2 font-semibold ${form.visits === n ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-700'}`}>{n}</button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{selectedType?.name || 'Treatment'} × {teethCount} {form.teeth.length > 0 ? 'teeth' : 'unit'}</span>
              <span className="font-semibold text-gray-900">{gross.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 flex-1">Discount</span>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                {(['amount', 'percent'] as const).map(k => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, discountType: k }))}
                    className={`px-3 py-1.5 text-xs font-medium ${form.discountType === k ? 'bg-sky-600 text-white' : 'text-gray-600'}`}>
                    {k === 'amount' ? 'Amount' : '%'}
                  </button>
                ))}
              </div>
              <input type="number" min={0} value={form.discount}
                onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-right" placeholder="0" />
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-semibold text-gray-700">Total for patient</span>
              <span className="text-xl font-bold text-emerald-600">{net.toLocaleString()}</span>
            </div>
            {discount > 0 && <p className="text-xs text-gray-500">Discount applied: −{discount.toLocaleString()}</p>}
          </div>

          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Clinical notes / diagnosis" rows={4}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          <p className="text-xs text-gray-500">Reception collects the money — completing this plan sends the invoice to them automatically.</p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button disabled={busy === 'save' || !form.patient_id || !form.treatment_type_id} onClick={savePlan}
            className="w-full py-3 rounded-xl bg-sky-600 text-white font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Save plan
          </button>
        </div>
      </div>
    );
  }

  if (detail) {
    const totalVisits = visits.length || detail.total_planned_visits || 1;
    const doneVisits = visits.filter(v => v.status === 'completed').length;
    const allDone = totalVisits > 0 && doneVisits >= totalVisits;
    const plannedSum = visits.reduce((s, v) => s + Number(v.visit_cost || 0), 0);

    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <button onClick={() => { setDetail(null); setVisits([]); }} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to plans
          </button>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${(STATUS_META[detail.status] || STATUS_META.planned).tone}`}>
            {(STATUS_META[detail.status] || STATUS_META.planned).label}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{detail.patients?.full_name || 'Patient'}</h1>
              <p className="text-sm text-gray-500">{detail.patients?.patient_number} · {detail.treatment_category}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Plan total</div>
              <div className="text-2xl font-bold text-emerald-600">{Number(detail.total_cost || 0).toLocaleString()}</div>
              <div className="text-[11px] text-gray-500">split over {totalVisits} visits</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Visits completed</span><span>{doneVisits}/{totalVisits}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-sky-600" style={{ width: `${Math.min(100, (doneVisits / totalVisits) * 100)}%` }} />
            </div>
            {Math.abs(plannedSum - Number(detail.total_cost || 0)) > 0.5 && (
              <p className="text-[11px] text-amber-600 mt-2">Visit amounts total {plannedSum.toLocaleString()} — plan price is {Number(detail.total_cost || 0).toLocaleString()}.</p>
            )}
          </div>
        </div>

        {Array.isArray(detail.tooth_numbers) && detail.tooth_numbers.length > 0 && (
          <DentalChart
            statuses={Object.fromEntries(
              detail.tooth_numbers.map((t: number) => [t, PLAN_TOOTH_STATUS[detail.status] || 'cavity'])
            )}
            legendItems={PLAN_CHART_LEGEND}
            chartedBadge={`${detail.tooth_numbers.length} ${detail.tooth_numbers.length === 1 ? 'tooth' : 'teeth'} in plan`}
          />
        )}

        <div className="space-y-3">
          {visitsLoading && <p className="text-sm text-gray-500">Loading visits…</p>}
          {visits.map(v => {
            const isDone = v.status === 'completed';
            const editing = visitForm?.id === v.id;
            const scheduling = nextForm?.id === v.id;
            return (
              <div key={v.id} className={`bg-white rounded-2xl border p-4 space-y-3 ${isDone ? 'border-emerald-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {isDone ? <Check className="w-4 h-4" /> : v.visit_number}
                    </span>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">Visit {v.visit_number}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {v.visit_date ? new Date(v.visit_date).toLocaleDateString() : 'Not scheduled'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">{Number(v.visit_cost || 0).toLocaleString()}</div>
                    <div className="text-[11px] text-gray-500">visit share</div>
                  </div>
                </div>

                {v.procedure_performed && <p className="text-xs text-gray-600 whitespace-pre-wrap">{v.procedure_performed}</p>}

                {!editing && !scheduling && (
                  <div className="flex flex-wrap gap-2">
                    {!isDone && (
                      <button onClick={() => setVisitForm({
                        id: v.id, procedure: v.procedure_performed || '', complications: v.complications || '',
                        next_notes: v.next_visit_notes || '', cost: v.visit_cost || 0,
                        date: v.visit_date || new Date().toISOString().slice(0, 10),
                      })}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700">
                        <Stethoscope className="w-3.5 h-3.5" /> Record work
                      </button>
                    )}
                    <button onClick={() => setNextForm({ id: v.id, datetime: '', duration: 30, notes: '' })}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                      <CalendarDays className="w-3.5 h-3.5" /> Schedule this visit
                    </button>
                  </div>
                )}

                {editing && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <label className="text-xs text-gray-500">Visit date
                        <input type="date" value={visitForm.date} onChange={e => setVisitForm(f => ({ ...f, date: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                      </label>
                      <label className="text-xs text-gray-500">Amount for this visit
                        <input type="number" min={0} value={visitForm.cost} onChange={e => setVisitForm(f => ({ ...f, cost: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right" />
                      </label>
                    </div>
                    <textarea rows={3} value={visitForm.procedure} onChange={e => setVisitForm(f => ({ ...f, procedure: e.target.value }))}
                      placeholder="Part of the treatment done today" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <input value={visitForm.next_notes} onChange={e => setVisitForm(f => ({ ...f, next_notes: e.target.value }))}
                      placeholder="Plan for next visit" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy === v.id} onClick={() => saveVisitWork(v, false)}
                        className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">Save draft</button>
                      <button disabled={busy === v.id} onClick={() => saveVisitWork(v, true)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete visit
                      </button>
                      <button onClick={() => setVisitForm(null)} className="text-xs px-3 py-2 rounded-lg text-gray-500">Cancel</button>
                    </div>
                  </div>
                )}

                {scheduling && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <label className="text-xs text-gray-500">Date & time
                        <input type="datetime-local" value={nextForm.datetime} onChange={e => setNextForm(f => ({ ...f, datetime: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                      </label>
                      <label className="text-xs text-gray-500">Duration (min)
                        <input type="number" min={10} step={5} value={nextForm.duration} onChange={e => setNextForm(f => ({ ...f, duration: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                      </label>
                    </div>
                    <input value={nextForm.notes} onChange={e => setNextForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Note for reception" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <div className="flex gap-2">
                      <button disabled={busy === v.id || !nextForm.datetime} onClick={() => scheduleVisit(v)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-sky-600 text-white font-medium disabled:opacity-40">
                        <CalendarDays className="w-3.5 h-3.5" /> Book appointment
                      </button>
                      <button onClick={() => setNextForm(null)} className="text-xs px-3 py-2 rounded-lg text-gray-500">Cancel</button>
                    </div>
                    <p className="text-[11px] text-gray-500">Reception sees this booking on the schedule immediately.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {detail.status !== 'completed' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <button onClick={() => addExtraVisit(detail)} disabled={busy === detail.id}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" /> Add another visit
            </button>
            <button disabled={busy === detail.id || !allDone} onClick={() => completePlan(detail)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-40">
              <CheckCircle2 className="w-4 h-4" /> Finish plan & send invoice to reception
            </button>
            {!allDone && <p className="text-xs text-gray-500 text-center">Complete all {totalVisits} visits first — the plan stays open between visits.</p>}
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment plans</h1>
          <p className="text-sm text-gray-500">Plan care, log visits, hand billing to reception.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700">
            <Plus className="w-4 h-4" /> New plan
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-white">
          {(['active', 'completed'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm rounded-lg font-medium capitalize ${tab === k ? 'bg-sky-600 text-white' : 'text-gray-600'}`}>{k}</button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find patient or treatment"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {loading && <div className="p-6 text-sm text-gray-500">Loading plans…</div>}
        {!loading && visible.length === 0 && (
          <div className="md:col-span-2 p-10 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <Stethoscope className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No {tab} plans yet.</p>
          </div>
        )}
        {!loading && visible.map(plan => {
          const meta = STATUS_META[plan.status] || STATUS_META.planned;
          const total = plan.total_planned_visits || 1;
          const done = plan.completed_visits || 0;
          return (
            <div key={plan.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{plan.patients?.full_name || 'Patient'}</div>
                  <div className="text-xs text-gray-500">{plan.patients?.patient_number} · {plan.treatment_category}</div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">{Number(plan.total_cost || 0).toLocaleString()}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${meta.tone}`}>{meta.label}</span>
              </div>

              {Array.isArray(plan.tooth_numbers) && plan.tooth_numbers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {plan.tooth_numbers.map((t: number) => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">#{t}</span>
                  ))}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Visits</span><span>{done}/{total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-sky-600" style={{ width: `${Math.min(100, (done / total) * 100)}%` }} />
                </div>
              </div>

              {plan.notes && <p className="text-xs text-gray-600 line-clamp-2">{plan.notes}</p>}

              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => openPlan(plan)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700">
                  <Activity className="w-3.5 h-3.5" /> Open visits ({done}/{total})
                </button>
                <button onClick={() => onNavigate?.(`prescriptions?patientId=${plan.patient_id}`)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                  <Pill className="w-3.5 h-3.5" /> Prescribe
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DoctorTreatmentPlansModule;

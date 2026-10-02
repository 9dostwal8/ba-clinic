// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import {
  CreditCard, Plus, Edit2, Trash2, CheckCircle, XCircle, Calendar, Users, Building2,
  Search, TrendingUp, AlertTriangle, Layers, X, RefreshCw, Wallet, Clock, ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ClinicTypesModule from './ClinicTypesModule';

const money = (n: number) => `${Number(n || 0).toLocaleString()} IQD`;

const BILLING_MODES = [
  { key: 'per_month', label: 'Per month', hint: 'Flat monthly subscription fee' },
  { key: 'per_treatment', label: 'Per treatment', hint: 'Clinic pays X IQD for every treatment done' },
  { key: 'per_patient', label: 'Per patient', hint: 'Clinic pays X IQD per unique patient billed' },
];

const modeLabel = (m: string) => BILLING_MODES.find(b => b.key === m)?.label || 'Per month';

const FEATURE_CATALOG = [
  { key: 'whatsapp', name: 'WhatsApp reminders' },
  { key: 'prescriptions', name: 'Prescriptions & drug library' },
  { key: 'treatment_plans', name: 'Treatment plans' },
  { key: 'commissions', name: 'Doctor commissions' },
  { key: 'accounting', name: 'Accounting & payroll' },
  { key: 'inventory', name: 'Inventory' },
  { key: 'analytics', name: 'Advanced analytics' },
  { key: 'templates', name: 'Custom document templates' },
  { key: 'backup', name: 'Backups & Google Drive' },
  { key: 'multi_branch', name: 'Multi-branch / center mode' },
];

const emptyPlanForm = {
  name: '',
  display_name: '',
  display_name_ar: '',
  description: '',
  description_ar: '',
  tier_level: 1,
  billing_mode: 'per_month',
  price_monthly: 0,
  price_yearly: 0,
  price_per_treatment: 0,
  price_per_patient: 0,
  currency: 'IQD',
  max_dentists: 1,
  max_staff: 5,
  max_receptionists: 2,
  max_workers: 2,
  max_patients: 100,
  max_appointments_per_month: 500,
  color: '#0f2f4f',
  icon: '⭐',
  is_custom: false,
};


export default function SubscriptionManagementModule() {
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'subscriptions' | 'clinictypes'>('overview');
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [features, setFeatures] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'suspended'>('all');

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState<any>(emptyPlanForm);
  const [planFeatures, setPlanFeatures] = useState<Record<string, boolean>>({});


  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<any>({
    clinic_id: '', plan_id: '', status: 'active',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '', auto_renew: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadPlans(), loadSubscriptions(), loadClinics()]);
    setLoading(false);
  };

  const loadClinics = async () => {
    const { data } = await supabase.from('clinics').select('id, name').order('name');
    setClinics(data || []);
  };

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans').select('*').order('tier_level', { ascending: true });
    if (error) { console.error(error); return; }
    setPlans(data || []);
    const { data: feats } = await supabase.from('subscription_features').select('*');
    const grouped: Record<string, any[]> = {};
    (feats || []).forEach(f => { (grouped[f.plan_id] ||= []).push(f); });
    setFeatures(grouped);
  };

  const loadSubscriptions = async () => {
    const { data, error } = await supabase
      .from('clinic_subscriptions')
      .select('*, clinics (name), subscription_plans (display_name, color, price_monthly, price_yearly)')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setSubscriptions(data || []);
  };

  const daysRemaining = (endDate?: string | null) =>
    endDate ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000) : null;

  const derivedStatus = (sub: any) => {
    const d = daysRemaining(sub.end_date);
    if (sub.status === 'suspended' || sub.status === 'cancelled') return 'suspended';
    if (d !== null && d < 0) return 'expired';
    if (d !== null && d <= 30) return 'expiring';
    return 'active';
  };

  const stats = useMemo(() => {
    const byStatus = { active: 0, expiring: 0, expired: 0, suspended: 0 };
    let mrr = 0;
    subscriptions.forEach(s => {
      const st = derivedStatus(s);
      byStatus[st] += 1;
      if (st !== 'expired' && st !== 'suspended') mrr += Number(s.subscription_plans?.price_monthly || 0);
    });
    return { ...byStatus, mrr, total: subscriptions.length };
  }, [subscriptions]);

  const filteredSubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subscriptions.filter(s => {
      if (statusFilter !== 'all' && derivedStatus(s) !== statusFilter) return false;
      if (!q) return true;
      return (
        (s.clinics?.name || '').toLowerCase().includes(q) ||
        (s.subscription_plans?.display_name || '').toLowerCase().includes(q)
      );
    });
  }, [subscriptions, search, statusFilter]);

  const planUsage = useMemo(() => {
    const map: Record<string, number> = {};
    subscriptions.forEach(s => { map[s.plan_id] = (map[s.plan_id] || 0) + 1; });
    return map;
  }, [subscriptions]);

  const openPlanModal = (plan: any | null) => {
    setEditingPlan(plan);
    setPlanForm(plan ? { ...emptyPlanForm, ...plan } : emptyPlanForm);
    const current: Record<string, boolean> = {};
    if (plan) (features[plan.id] || []).forEach((f: any) => { current[f.feature_key] = !!f.feature_value; });
    setPlanFeatures(current);
    setShowPlanModal(true);
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      const payload = { ...emptyPlanForm, ...planForm };
      delete (payload as any).id;
      delete (payload as any).created_at;
      delete (payload as any).updated_at;
      let planId = editingPlan?.id;
      if (editingPlan) {
        const { error } = await supabase.from('subscription_plans').update(payload).eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('subscription_plans').insert([payload]).select('id').single();
        if (error) throw error;
        planId = data?.id;
      }

      if (planId) {
        await supabase.from('subscription_features').delete().eq('plan_id', planId);
        const rows = FEATURE_CATALOG
          .filter(f => planFeatures[f.key])
          .map(f => ({ plan_id: planId, feature_key: f.key, feature_name: f.name, feature_value: true }));
        if (rows.length) {
          const { error: fErr } = await supabase.from('subscription_features').insert(rows);
          if (fErr) throw fErr;
        }
      }

      setShowPlanModal(false); setEditingPlan(null); setPlanForm(emptyPlanForm); setPlanFeatures({});
      await loadPlans();
    } catch (e: any) { alert('Error saving plan: ' + e.message); }
    setSaving(false);
  };


  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
    if (error) return alert('Error: ' + error.message);
    loadPlans();
  };

  const togglePlanActive = async (plan: any) => {
    const { error } = await supabase.from('subscription_plans')
      .update({ is_active: !plan.is_active }).eq('id', plan.id);
    if (error) return alert('Error: ' + error.message);
    loadPlans();
  };

  const saveAssignment = async () => {
    if (!assignForm.clinic_id || !assignForm.plan_id) return alert('Pick a clinic and a plan.');
    setSaving(true);
    try {
      const plan = plans.find(p => p.id === assignForm.plan_id);
      const mode = assignForm.billing_mode || plan?.billing_mode || 'per_month';
      // only one active subscription per clinic
      if (assignForm.status === 'active') {
        await supabase.from('clinic_subscriptions')
          .update({ status: 'cancelled' })
          .eq('clinic_id', assignForm.clinic_id)
          .eq('status', 'active');
      }
      const { error } = await supabase.from('clinic_subscriptions').insert([{
        clinic_id: assignForm.clinic_id,
        plan_id: assignForm.plan_id,
        status: assignForm.status,
        start_date: assignForm.start_date,
        end_date: assignForm.end_date || null,
        auto_renew: assignForm.auto_renew,
        billing_mode: mode,
        custom_price_monthly: assignForm.custom_price_monthly !== '' && assignForm.custom_price_monthly != null
          ? Number(assignForm.custom_price_monthly) : null,
        custom_price_per_treatment: assignForm.custom_price_per_treatment !== '' && assignForm.custom_price_per_treatment != null
          ? Number(assignForm.custom_price_per_treatment) : null,
        custom_price_per_patient: assignForm.custom_price_per_patient !== '' && assignForm.custom_price_per_patient != null
          ? Number(assignForm.custom_price_per_patient) : null,
      }]);
      if (error) throw error;
      setShowAssignModal(false);
      await loadSubscriptions();
    } catch (e: any) { alert('Error assigning subscription: ' + e.message); }
    setSaving(false);
  };


  const updateSubStatus = async (sub: any, status: string) => {
    const { error } = await supabase.from('clinic_subscriptions').update({ status }).eq('id', sub.id);
    if (error) return alert('Error: ' + error.message);
    loadSubscriptions();
  };

  const extendSub = async (sub: any, months: number) => {
    const base = sub.end_date && new Date(sub.end_date) > new Date() ? new Date(sub.end_date) : new Date();
    base.setMonth(base.getMonth() + months);
    const { error } = await supabase.from('clinic_subscriptions')
      .update({ end_date: base.toISOString().slice(0, 10), status: 'active' }).eq('id', sub.id);
    if (error) return alert('Error: ' + error.message);
    loadSubscriptions();
  };

  const statusChip = (st: string) => {
    const map: any = {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      expiring: 'bg-amber-50 text-amber-700 border-amber-200',
      expired: 'bg-rose-50 text-rose-700 border-rose-200',
      suspended: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const label: any = { active: 'Active', expiring: 'Renewing soon', expired: 'Expired', suspended: 'Suspended' };
    return <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${map[st]}`}>{label[st]}</span>;
  };

  const kpis = [
    { label: 'Monthly recurring', value: money(stats.mrr), icon: Wallet, tone: 'dark' },
    { label: 'Active clinics', value: stats.active + stats.expiring, icon: ShieldCheck, tone: 'emerald' },
    { label: 'Renewing ≤30 days', value: stats.expiring, icon: Clock, tone: 'amber' },
    { label: 'Expired / suspended', value: stats.expired + stats.suspended, icon: AlertTriangle, tone: 'rose' },
  ];

  const toneClass: any = {
    dark: 'bg-slate-900 text-white border-slate-900',
    emerald: 'bg-white text-slate-900 border-slate-200',
    amber: 'bg-white text-slate-900 border-slate-200',
    rose: 'bg-white text-slate-900 border-slate-200',
  };
  const iconTone: any = {
    dark: 'bg-white/10 text-lime-300',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-lime-300 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Subscriptions</h1>
            <p className="text-sm text-slate-500">Plans, clinic subscriptions and recurring revenue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setAssignForm({ ...assignForm, clinic_id: '', plan_id: '' }); setShowAssignModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" /> Assign subscription
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${toneClass[k.tone]}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${k.tone === 'dark' ? 'text-white/60' : 'text-slate-400'}`}>{k.label}</span>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconTone[k.tone]}`}><k.icon className="w-4 h-4" /></span>
            </div>
            <p className="mt-2 text-xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-slate-50/90 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview', icon: TrendingUp, count: null },
            { key: 'plans', label: 'Plans', icon: Layers, count: plans.length },
            { key: 'subscriptions', label: 'Clinic subscriptions', icon: Users, count: subscriptions.length },
            { key: 'clinictypes', label: 'Clinic types', icon: Building2, count: null },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition ${
                activeTab === t.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
              {t.count !== null && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === t.key ? 'bg-white/15' : 'bg-slate-100'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Plan distribution</h3>
            <div className="space-y-3">
              {plans.map(p => {
                const count = planUsage[p.id] || 0;
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{p.icon} {p.display_name}</span>
                      <span className="text-slate-500">{count} clinic{count === 1 ? '' : 's'} · {pct}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color || '#0f2f4f' }} />
                    </div>
                  </div>
                );
              })}
              {plans.length === 0 && <p className="text-sm text-slate-500">No plans yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Needs attention</h3>
            <div className="space-y-2">
              {subscriptions
                .filter(s => ['expiring', 'expired', 'suspended'].includes(derivedStatus(s)))
                .slice(0, 6)
                .map(s => {
                  const d = daysRemaining(s.end_date);
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{s.clinics?.name}</p>
                        <p className="text-xs text-slate-500">
                          {s.subscription_plans?.display_name}
                          {d !== null && ` · ${d < 0 ? `${Math.abs(d)} days overdue` : `${d} days left`}`}
                        </p>
                      </div>
                      <button onClick={() => extendSub(s, 1)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800">
                        Renew +1m
                      </button>
                    </div>
                  );
                })}
              {subscriptions.filter(s => ['expiring', 'expired', 'suspended'].includes(derivedStatus(s))).length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  Everything is up to date.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{plans.length} plans · pricing controlled by you</p>
            <button onClick={() => openPlanModal(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-400 text-slate-900 text-sm font-bold hover:bg-lime-300">
              <Plus className="w-4 h-4" /> New plan
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map(plan => (
              <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
                <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${plan.color || '#0f2f4f'}, #0f172a)` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{plan.icon}</span>
                      <div>
                        <h3 className="font-bold leading-tight">{plan.display_name}</h3>
                        <p className="text-xs text-white/70">{plan.display_name_ar || `Tier ${plan.tier_level}`}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${plan.is_active ? 'bg-lime-400 text-slate-900' : 'bg-white/20'}`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wide">
                    <Layers className="w-3 h-3" /> {modeLabel(plan.billing_mode)}
                  </div>
                  {plan.billing_mode === 'per_treatment' ? (
                    <>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-2xl font-bold">{Number(plan.price_per_treatment || 0).toLocaleString()}</span>
                        <span className="text-xs text-white/70 mb-1">IQD / treatment</span>
                      </div>
                      <p className="text-[11px] text-white/70">Billed monthly on treatment volume</p>
                    </>
                  ) : plan.billing_mode === 'per_patient' ? (
                    <>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-2xl font-bold">{Number(plan.price_per_patient || 0).toLocaleString()}</span>
                        <span className="text-xs text-white/70 mb-1">IQD / patient</span>
                      </div>
                      <p className="text-[11px] text-white/70">Billed monthly on unique patients</p>
                    </>
                  ) : (
                    <>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-2xl font-bold">{Number(plan.price_monthly || 0).toLocaleString()}</span>
                        <span className="text-xs text-white/70 mb-1">IQD / month</span>
                      </div>
                      <p className="text-[11px] text-white/70">or {money(plan.price_yearly)} / year</p>
                    </>
                  )}
                </div>

                <div className="p-4 flex-1 space-y-3">
                  {plan.description && <p className="text-xs text-slate-500">{plan.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Dentists', plan.max_dentists],
                      ['Reception', plan.max_receptionists],
                      ['Staff', plan.max_staff],
                      ['Patients', plan.max_patients],
                      ['Appts / mo', plan.max_appointments_per_month],
                      ['Workers', plan.max_workers],
                    ].map(([label, val]) => (
                      <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] uppercase text-slate-400 font-semibold">{label}</p>
                        <p className="font-bold text-slate-800">{Number(val || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>


                  {features[plan.id]?.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {features[plan.id].slice(0, 4).map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-xs">
                          {f.feature_value
                            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                          <span className={f.feature_value ? 'text-slate-700' : 'text-slate-400'}>{f.feature_name}</span>
                        </div>
                      ))}
                      {features[plan.id].length > 4 && (
                        <p className="text-[11px] text-slate-400">+{features[plan.id].length - 4} more features</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{planUsage[plan.id] || 0} clinic(s) subscribed</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => togglePlanActive(plan)} title="Toggle active"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
                      {plan.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => openPlanModal(plan)}
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"><Edit2 className="w-4 h-4" /></button>
                    {plan.is_custom && (
                      <button onClick={() => deletePlan(plan.id)}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search clinic or plan…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-slate-900" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {[
                ['all', 'All', stats.total],
                ['active', 'Active', stats.active],
                ['expiring', 'Renewing soon', stats.expiring],
                ['expired', 'Expired', stats.expired],
                ['suspended', 'Suspended', stats.suspended],
              ].map(([key, label, count]: any) => (
                <button key={key} onClick={() => setStatusFilter(key)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    statusFilter === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredSubs.map(sub => {
              const st = derivedStatus(sub);
              const d = daysRemaining(sub.end_date);
              return (
                <div key={sub.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: sub.subscription_plans?.color || '#0f2f4f' }}>
                      {(sub.clinics?.name || '?').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 truncate">{sub.clinics?.name}</h3>
                          <p className="text-xs text-slate-500">
                            {sub.subscription_plans?.display_name} · {money(sub.subscription_plans?.price_monthly)}/mo
                          </p>
                        </div>
                        {statusChip(st)}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                          <p className="text-slate-400 font-semibold uppercase">Start</p>
                          <p className="font-semibold text-slate-700">{sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '—'}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                          <p className="text-slate-400 font-semibold uppercase">Renews</p>
                          <p className="font-semibold text-slate-700">{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '—'}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                          <p className="text-slate-400 font-semibold uppercase">Remaining</p>
                          <p className={`font-semibold ${d === null ? 'text-slate-700' : d < 0 ? 'text-rose-600' : d <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {d === null ? 'Open' : d < 0 ? `${Math.abs(d)}d over` : `${d} days`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => extendSub(sub, 1)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800">Extend 1 month</button>
                        <button onClick={() => extendSub(sub, 12)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50">Extend 1 year</button>
                        {sub.status === 'suspended'
                          ? <button onClick={() => updateSubStatus(sub, 'active')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">Reactivate</button>
                          : <button onClick={() => updateSubStatus(sub, 'suspended')}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">Suspend</button>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSubs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
                <CreditCard className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No subscriptions found</p>
                <p className="text-xs text-slate-500 mt-1">Assign a plan to a clinic to start billing.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'clinictypes' && <ClinicTypesModule />}

      {/* Plan modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingPlan ? 'Edit plan' : 'New plan'}</h2>
              <button onClick={() => { setShowPlanModal(false); setEditingPlan(null); }} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-5">
              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Identity</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Key" value={planForm.name} onChange={v => setPlanForm({ ...planForm, name: v })} placeholder="silver / gold" />
                  <Field label="Tier level" type="number" value={planForm.tier_level} onChange={v => setPlanForm({ ...planForm, tier_level: parseInt(v) || 1 })} />
                  <Field label="Display name" value={planForm.display_name} onChange={v => setPlanForm({ ...planForm, display_name: v })} />
                  <Field label="Display name (AR)" value={planForm.display_name_ar} onChange={v => setPlanForm({ ...planForm, display_name_ar: v })} />
                  <Field label="Description" value={planForm.description} onChange={v => setPlanForm({ ...planForm, description: v })} />
                  <Field label="Description (AR)" value={planForm.description_ar} onChange={v => setPlanForm({ ...planForm, description_ar: v })} />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Billing mode</h3>
                <div className="grid sm:grid-cols-3 gap-2">
                  {BILLING_MODES.map(m => {
                    const active = (planForm.billing_mode || 'per_month') === m.key;
                    return (
                      <button key={m.key} type="button" onClick={() => setPlanForm({ ...planForm, billing_mode: m.key })}
                        className={`text-left rounded-xl border p-3 transition ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <p className="text-sm font-bold">{m.label}</p>
                        <p className={`text-[11px] mt-0.5 ${active ? 'text-white/70' : 'text-slate-500'}`}>{m.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Pricing (IQD)</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(planForm.billing_mode || 'per_month') === 'per_month' && (<>
                    <Field label="Monthly price" type="number" value={planForm.price_monthly} onChange={v => setPlanForm({ ...planForm, price_monthly: Number(v) || 0 })} />
                    <Field label="Yearly price" type="number" value={planForm.price_yearly} onChange={v => setPlanForm({ ...planForm, price_yearly: Number(v) || 0 })} />
                  </>)}
                  {planForm.billing_mode === 'per_treatment' && (
                    <Field label="Price per treatment" type="number" value={planForm.price_per_treatment} onChange={v => setPlanForm({ ...planForm, price_per_treatment: Number(v) || 0 })} />
                  )}
                  {planForm.billing_mode === 'per_patient' && (
                    <Field label="Price per patient" type="number" value={planForm.price_per_patient} onChange={v => setPlanForm({ ...planForm, price_per_patient: Number(v) || 0 })} />
                  )}
                </div>
                {planForm.billing_mode === 'per_treatment' && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                    Example: 5 dentists × 5 treatments = 25 treatments ×{' '}
                    {Number(planForm.price_per_treatment || 0).toLocaleString()} IQD ={' '}
                    <span className="font-bold text-slate-800">{money((planForm.price_per_treatment || 0) * 25)}</span> for the month.
                  </p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Limits</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Max dentists" type="number" value={planForm.max_dentists} onChange={v => setPlanForm({ ...planForm, max_dentists: parseInt(v) || 0 })} />
                  <Field label="Max receptionists" type="number" value={planForm.max_receptionists} onChange={v => setPlanForm({ ...planForm, max_receptionists: parseInt(v) || 0 })} />
                  <Field label="Max staff" type="number" value={planForm.max_staff} onChange={v => setPlanForm({ ...planForm, max_staff: parseInt(v) || 0 })} />
                  <Field label="Max workers" type="number" value={planForm.max_workers} onChange={v => setPlanForm({ ...planForm, max_workers: parseInt(v) || 0 })} />
                  <Field label="Max patients" type="number" value={planForm.max_patients} onChange={v => setPlanForm({ ...planForm, max_patients: parseInt(v) || 0 })} />
                  <Field label="Appointments / month" type="number" value={planForm.max_appointments_per_month} onChange={v => setPlanForm({ ...planForm, max_appointments_per_month: parseInt(v) || 0 })} />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Features included</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {FEATURE_CATALOG.map(f => {
                    const on = !!planFeatures[f.key];
                    return (
                      <button key={f.key} type="button"
                        onClick={() => setPlanFeatures({ ...planFeatures, [f.key]: !on })}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${on ? 'border-emerald-300 bg-emerald-50 text-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        {on ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                        <span className="font-medium">{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>


              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Appearance</h3>
                <div className="grid sm:grid-cols-3 gap-3 items-end">
                  <Field label="Icon (emoji)" value={planForm.icon} onChange={v => setPlanForm({ ...planForm, icon: v })} placeholder="⭐ 🥈 🥇 💎" />
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Color</label>
                    <input type="color" value={planForm.color || '#0f2f4f'} onChange={e => setPlanForm({ ...planForm, color: e.target.value })}
                      className="w-full h-[42px] rounded-xl border border-slate-200 bg-white" />
                  </div>
                  <label className="flex items-center gap-2 h-[42px] px-3 rounded-xl border border-slate-200">
                    <input type="checkbox" checked={!!planForm.is_custom} onChange={e => setPlanForm({ ...planForm, is_custom: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm font-medium text-slate-700">Custom plan</span>
                  </label>
                </div>
              </section>
            </div>
            <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => { setShowPlanModal(false); setEditingPlan(null); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold">Cancel</button>
              <button onClick={savePlan} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-60">
                {editingPlan ? 'Save plan' : 'Create plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Assign subscription</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Clinic</label>
                <select value={assignForm.clinic_id} onChange={e => setAssignForm({ ...assignForm, clinic_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
                  <option value="">Select clinic…</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Plan</label>
                <div className="grid gap-2">
                  {plans.filter(p => p.is_active !== false).map(p => (
                    <button key={p.id} onClick={() => setAssignForm({ ...assignForm, plan_id: p.id, billing_mode: p.billing_mode || 'per_month' })}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left ${
                        assignForm.plan_id === p.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                      }`}>
                      <span className="text-sm font-semibold text-slate-800">{p.icon} {p.display_name}</span>
                      <span className="text-xs text-slate-500">
                        {p.billing_mode === 'per_treatment' ? `${money(p.price_per_treatment)}/treatment`
                          : p.billing_mode === 'per_patient' ? `${money(p.price_per_patient)}/patient`
                          : `${money(p.price_monthly)}/mo`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {assignForm.plan_id && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500">Billing mode for this clinic</label>
                  <div className="grid grid-cols-3 gap-2">
                    {BILLING_MODES.map(m => (
                      <button key={m.key} type="button" onClick={() => setAssignForm({ ...assignForm, billing_mode: m.key })}
                        className={`px-2 py-2 rounded-xl border text-xs font-semibold ${assignForm.billing_mode === m.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {assignForm.billing_mode === 'per_treatment' && (
                      <Field label="Custom price / treatment (optional)" type="number" value={assignForm.custom_price_per_treatment ?? ''} onChange={v => setAssignForm({ ...assignForm, custom_price_per_treatment: v })} />
                    )}
                    {assignForm.billing_mode === 'per_patient' && (
                      <Field label="Custom price / patient (optional)" type="number" value={assignForm.custom_price_per_patient ?? ''} onChange={v => setAssignForm({ ...assignForm, custom_price_per_patient: v })} />
                    )}
                    {(assignForm.billing_mode === 'per_month' || !assignForm.billing_mode) && (
                      <Field label="Custom monthly price (optional)" type="number" value={assignForm.custom_price_monthly ?? ''} onChange={v => setAssignForm({ ...assignForm, custom_price_monthly: v })} />
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date" type="date" value={assignForm.start_date} onChange={v => setAssignForm({ ...assignForm, start_date: v })} />
                <Field label="End date" type="date" value={assignForm.end_date} onChange={v => setAssignForm({ ...assignForm, end_date: v })} />
              </div>
              <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200">
                <input type="checkbox" checked={assignForm.auto_renew} onChange={e => setAssignForm({ ...assignForm, auto_renew: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm font-medium text-slate-700">Auto renew</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowAssignModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-700">Cancel</button>
              <button onClick={saveAssignment} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-60">Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input type={type} value={value ?? ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-900" />
    </div>
  );
}

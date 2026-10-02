// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCircle, Plus, Edit2, Trash2, Save, X, Search, Percent, DollarSign, Users,
  AlertCircle, Shield, Stethoscope, ClipboardList, RotateCcw, Phone, Eye, EyeOff,
  Sparkles, Check, IdCard, Filter, Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { createStaffAccount } from '@/lib/accounts.functions';

interface Staff {
  id: string;
  full_name: string;
  full_name_ar: string;
  role: 'clinic_admin' | 'doctor' | 'receptionist' | 'cleaner' | 'worker';
  phone: string;
  specialization: string;
  is_active: boolean;
  created_at: string;
}

interface StaffCount {
  role: string;
  current_count: number;
  min_allowed: number;
  max_allowed: number;
  can_add_more: boolean;
}

interface TreatmentType {
  id: string;
  name: string;
  name_ar: string;
  category: string;
  cost: number;
}

interface TreatmentCommissionRate {
  id?: string;
  treatment_type_id: string | null;
  commission_rate: number;
  treatment_name?: string;
}

const BASE_PERMISSIONS = {
  can_view_appointments: true,
  can_edit_appointments: true,
  can_view_patients: true,
  can_edit_patients: true,
  can_view_treatments: true,
  can_edit_treatments: true,
  can_view_treatment_plans: true,
  can_edit_treatment_plans: false,
  can_view_invoices: true,
  can_edit_invoices: false,
  can_view_inventory: false,
  can_edit_inventory: false,
  can_view_accounting: false,
  can_view_staff: false,
  can_edit_staff: false,
  can_view_settings: false,
  view_all_patients: true,
  view_all_appointments: true,
  view_all_invoices: true,
  view_all_treatment_plans: false,
  commission_rate: 30,
};

const PRESETS: Record<string, Partial<typeof BASE_PERMISSIONS>> = {
  dentist: {
    can_view_appointments: true, can_edit_appointments: true,
    can_view_patients: true, can_edit_patients: true,
    can_view_treatments: true, can_edit_treatments: true,
    can_view_treatment_plans: true, can_edit_treatment_plans: true,
    can_view_invoices: true, can_edit_invoices: false,
    can_view_inventory: true, can_edit_inventory: false,
    can_view_accounting: false, can_view_staff: false, can_edit_staff: false,
    can_view_settings: false,
    view_all_patients: false, view_all_appointments: false,
    view_all_invoices: false, view_all_treatment_plans: false,
  },
  reception: {
    can_view_appointments: true, can_edit_appointments: true,
    can_view_patients: true, can_edit_patients: true,
    can_view_treatments: true, can_edit_treatments: false,
    can_view_treatment_plans: true, can_edit_treatment_plans: false,
    can_view_invoices: true, can_edit_invoices: true,
    can_view_inventory: true, can_edit_inventory: false,
    can_view_accounting: false, can_view_staff: false, can_edit_staff: false,
    can_view_settings: false,
    view_all_patients: true, view_all_appointments: true,
    view_all_invoices: true, view_all_treatment_plans: true,
  },
  readonly: {
    can_view_appointments: true, can_edit_appointments: false,
    can_view_patients: true, can_edit_patients: false,
    can_view_treatments: true, can_edit_treatments: false,
    can_view_treatment_plans: true, can_edit_treatment_plans: false,
    can_view_invoices: true, can_edit_invoices: false,
    can_view_inventory: false, can_edit_inventory: false,
    can_view_accounting: false, can_view_staff: false, can_edit_staff: false,
    can_view_settings: false,
    view_all_patients: true, view_all_appointments: true,
    view_all_invoices: true, view_all_treatment_plans: true,
  },
  support: {
    can_view_appointments: true, can_edit_appointments: false,
    can_view_patients: false, can_edit_patients: false,
    can_view_treatments: false, can_edit_treatments: false,
    can_view_treatment_plans: false, can_edit_treatment_plans: false,
    can_view_invoices: false, can_edit_invoices: false,
    can_view_inventory: true, can_edit_inventory: true,
    can_view_accounting: false, can_view_staff: false, can_edit_staff: false,
    can_view_settings: false,
    view_all_patients: false, view_all_appointments: true,
    view_all_invoices: false, view_all_treatment_plans: false,
  },
};

const ROLE_META: Record<string, { label: string; icon: any; tone: string }> = {
  clinic_admin: { label: 'Clinic Admin', icon: Shield, tone: 'bg-primary/10 text-primary border-primary/20' },
  doctor: { label: 'Dentist', icon: Stethoscope, tone: 'bg-accent text-primary border-primary/20' },
  receptionist: { label: 'Receptionist', icon: ClipboardList, tone: 'bg-success/10 text-success border-success/20' },
  cleaner: { label: 'Cleaner', icon: Users, tone: 'bg-warning/15 text-warning border-warning/30' },
  worker: { label: 'Worker', icon: Users, tone: 'bg-muted text-muted-foreground border-border' },
};

function Toggle({ checked, onChange, label, hint, disabled }: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        checked ? 'border-primary/30 bg-accent/60' : 'border-border bg-card hover:bg-muted/60'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-card shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

export function StaffModule() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffCounts, setStaffCounts] = useState<StaffCount[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [formTab, setFormTab] = useState<'profile' | 'access' | 'commission'>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', full_name_ar: '', role: 'doctor' as Staff['role'],
    phone: '', specialization: '', email: '', password: '',
  });
  const [treatmentCommissionRates, setTreatmentCommissionRates] = useState<TreatmentCommissionRate[]>([]);
  const [permissions, setPermissions] = useState({ ...BASE_PERMISSIONS });

  useEffect(() => {
    loadStaff();
    loadStaffCounts();
    loadTreatmentTypes();
  }, [profile?.clinic_id]);

  const loadStaff = async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .in('role', ['clinic_admin', 'doctor', 'receptionist', 'cleaner', 'worker'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffCounts = async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data, error } = await supabase.rpc('get_clinic_staff_counts', { p_clinic_id: profile.clinic_id });
      if (error) throw error;
      setStaffCounts(data || []);
    } catch (error) {
      console.error('Error loading staff counts:', error);
    }
  };

  const loadTreatmentTypes = async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data, error } = await supabase
        .from('treatment_types')
        .select('id, name, name_ar, category, cost')
        .eq('clinic_id', profile.clinic_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setTreatmentTypes(data || []);
    } catch (error) {
      console.error('Error loading treatment types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id) return;
    setSaving(true);
    try {
      let staffUserId: string;

      if (editingId) {
        staffUserId = editingId;
        const { error: userError } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            full_name_ar: formData.full_name_ar,
            role: formData.role,
            phone: formData.phone,
            specialization: formData.specialization,
          })
          .eq('id', editingId);
        if (userError) throw userError;

        const { data: existingPermissions } = await supabase
          .from('staff_permissions')
          .select('user_id')
          .eq('user_id', editingId)
          .maybeSingle();

        if (existingPermissions) {
          const { error: permError } = await supabase
            .from('staff_permissions')
            .update({ ...permissions, updated_at: new Date().toISOString() })
            .eq('user_id', editingId);
          if (permError) throw permError;
        } else {
          const { error: permError } = await supabase
            .from('staff_permissions')
            .insert({ user_id: editingId, ...permissions });
          if (permError) throw permError;
        }
      } else {
        const result = await createStaffAccount({
          data: {
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            full_name_ar: formData.full_name_ar,
            role: formData.role,
            phone: formData.phone,
            specialization: formData.specialization,
            clinic_id: profile.clinic_id,
            permissions: permissions,
          },
        });
        staffUserId = result.user_id;
      }

      if (formData.role === 'doctor' && treatmentCommissionRates.length > 0) {
        await saveTreatmentCommissionRates(staffUserId);
      }

      const createdEmail = formData.email;
      await loadStaff();
      await loadStaffCounts();
      const wasCreate = !editingId;
      resetForm();
      if (wasCreate) {
        alert(`Staff member created successfully!\n\nLogin credentials:\nEmail: ${createdEmail}\nPassword: (as provided)\n\nPlease share these credentials with the staff member securely.`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (member: Staff) => {
    setEditingId(member.id);
    setFormTab('profile');
    setFormData({
      full_name: member.full_name,
      full_name_ar: member.full_name_ar || '',
      role: member.role,
      phone: member.phone || '',
      specialization: member.specialization || '',
      email: '',
      password: '',
    });

    const { data } = await supabase
      .from('staff_permissions')
      .select('*')
      .eq('user_id', member.id)
      .maybeSingle();

    if (data) {
      const next = { ...BASE_PERMISSIONS };
      Object.keys(next).forEach((key) => {
        if (data[key] !== null && data[key] !== undefined) next[key] = data[key];
      });
      setPermissions(next);
    } else {
      setPermissions({ ...BASE_PERMISSIONS, view_all_patients: false, view_all_appointments: false, view_all_invoices: false });
    }

    if (member.role === 'doctor') {
      await loadTreatmentCommissionRates(member.id);
    } else {
      setTreatmentCommissionRates([]);
    }

    setShowForm(true);
  };

  const loadTreatmentCommissionRates = async (doctorId: string) => {
    if (!profile?.clinic_id) return;
    try {
      const { data, error } = await supabase
        .from('doctor_commission_rates')
        .select(`id, treatment_type_id, commission_rate, treatment_types(name, name_ar)`)
        .eq('doctor_id', doctorId)
        .order('treatment_type_id', { nullsFirst: true });
      if (error) throw error;
      if (data) {
        setTreatmentCommissionRates(
          data.map((rate: any) => ({
            id: rate.id,
            treatment_type_id: rate.treatment_type_id,
            commission_rate: rate.commission_rate,
            treatment_name: rate.treatment_types ? rate.treatment_types.name : 'Default Rate',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading commission rates:', error);
    }
  };

  const addTreatmentCommissionRate = () => {
    setTreatmentCommissionRates([
      ...treatmentCommissionRates,
      { treatment_type_id: '', commission_rate: 30, treatment_name: '' },
    ]);
  };

  const removeTreatmentCommissionRate = (index: number) => {
    setTreatmentCommissionRates(treatmentCommissionRates.filter((_, i) => i !== index));
  };

  const updateTreatmentCommissionRate = (index: number, field: string, value: any) => {
    const updated = [...treatmentCommissionRates];
    updated[index] = { ...updated[index], [field]: value };
    setTreatmentCommissionRates(updated);
  };

  const saveTreatmentCommissionRates = async (doctorId: string) => {
    if (!profile?.clinic_id) return;
    try {
      await supabase.from('doctor_commission_rates').delete().eq('doctor_id', doctorId);
      const ratesToInsert = treatmentCommissionRates
        .filter((rate) => rate.treatment_type_id !== '')
        .map((rate) => ({
          clinic_id: profile.clinic_id,
          doctor_id: doctorId,
          treatment_type_id: rate.treatment_type_id,
          commission_rate: rate.commission_rate,
          is_default: rate.treatment_type_id === null,
        }));
      if (ratesToInsert.length > 0) {
        const { error } = await supabase.from('doctor_commission_rates').insert(ratesToInsert);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving commission rates:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this staff member? They will lose access immediately.')) return;
    try {
      const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      await loadStaff();
      await loadStaffCounts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const { error } = await supabase.from('users').update({ is_active: true }).eq('id', id);
      if (error) throw error;
      await loadStaff();
      await loadStaffCounts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const resetForm = () => {
    setFormData({ full_name: '', full_name_ar: '', role: 'doctor', phone: '', specialization: '', email: '', password: '' });
    setPermissions({ ...BASE_PERMISSIONS });
    setTreatmentCommissionRates([]);
    setEditingId(null);
    setShowForm(false);
    setFormTab('profile');
    setShowPassword(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const applyPreset = (key: string) => {
    setPermissions((prev) => ({ ...prev, ...PRESETS[key] }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#%';
    let out = '';
    const rnd = new Uint32Array(12);
    (globalThis.crypto || window.crypto).getRandomValues(rnd);
    for (let i = 0; i < 12; i++) out += chars[rnd[i] % chars.length];
    setFormData((f) => ({ ...f, password: out }));
    setShowPassword(true);
  };

  const filteredStaff = useMemo(
    () =>
      staff.filter((member) => {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !q ||
          member.full_name?.toLowerCase().includes(q) ||
          member.full_name_ar?.includes(searchTerm) ||
          member.phone?.includes(searchTerm) ||
          member.specialization?.toLowerCase().includes(q);
        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
        const matchesStatus =
          statusFilter === 'all' || (statusFilter === 'active' ? member.is_active : !member.is_active);
        return matchesSearch && matchesRole && matchesStatus;
      }),
    [staff, searchTerm, roleFilter, statusFilter]
  );

  const activeStaff = staff.filter((s) => s.is_active);
  const stats = [
    { label: 'Active team', value: activeStaff.length, icon: Users },
    { label: 'Dentists', value: activeStaff.filter((s) => s.role === 'doctor').length, icon: Stethoscope },
    { label: 'Reception', value: activeStaff.filter((s) => s.role === 'receptionist').length, icon: ClipboardList },
    { label: 'Deactivated', value: staff.length - activeStaff.length, icon: Lock },
  ];

  const roleTabs = [
    { key: 'all', label: 'All' },
    { key: 'doctor', label: 'Dentists' },
    { key: 'receptionist', label: 'Reception' },
    { key: 'clinic_admin', label: 'Admins' },
    { key: 'cleaner', label: 'Cleaners' },
    { key: 'worker', label: 'Workers' },
  ];

  const initials = (name: string) =>
    (name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');

  const inputClass =
    'w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">{t('loading')}</div>
    );
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-border bg-primary text-primary-foreground">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/70">Clinic team</p>
            <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">Staff management</h1>
            <p className="mt-1 text-sm text-primary-foreground/80">
              Create accounts, tune permissions and commissions in one place.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-card px-4 py-3 text-sm font-semibold text-primary shadow-sm transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            {t('addStaff') || 'Add staff'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-px bg-primary-foreground/15 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-primary p-4">
              <div className="flex items-center gap-2 text-primary-foreground/70">
                <s.icon className="h-4 w-4" />
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone or specialization…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {roleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                roleFilter === tab.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {(['active', 'inactive', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-2.5 py-1 capitalize transition-colors ${
                statusFilter === s ? 'bg-accent font-semibold text-primary' : 'hover:bg-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Capacity */}
      {staffCounts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t('clinicTypes.staffLimits') || 'Staff capacity'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('clinicTypes.currentPlanLimits') || 'Based on your current clinic type'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {staffCounts.map((count) => {
              const progress = count.max_allowed ? (count.current_count / count.max_allowed) * 100 : 0;
              const isNearLimit = progress >= 80;
              const isAtLimit = count.current_count >= count.max_allowed;
              return (
                <div
                  key={count.role}
                  className={`rounded-xl border p-4 ${
                    isAtLimit ? 'border-destructive/40 bg-destructive/5' : isNearLimit ? 'border-warning/40 bg-warning/5' : 'border-border bg-muted/40'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {ROLE_META[count.role]?.label || count.role}
                    </span>
                    {isAtLimit && <AlertCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="mb-2 flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${isAtLimit ? 'text-destructive' : 'text-foreground'}`}>
                      {count.current_count}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {count.max_allowed}</span>
                  </div>
                  <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isAtLimit
                      ? t('clinicTypes.limitReached') || 'Limit reached'
                      : `${count.max_allowed - count.current_count} ${t('clinicTypes.slotsAvailable') || 'slots available'}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="grid gap-3 lg:grid-cols-2">
        {filteredStaff.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center lg:col-span-2">
            <UserCircle className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">{t('noStaffMembers') || 'No staff found'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Adjust your filters or add a new team member.</p>
          </div>
        ) : (
          filteredStaff.map((member) => {
            const meta = ROLE_META[member.role] || ROLE_META.worker;
            const RoleIcon = meta.icon;
            return (
              <div
                key={member.id}
                className={`rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${
                  member.is_active ? 'border-border' : 'border-dashed border-border opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-primary">
                    {initials(member.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-foreground">{member.full_name}</h3>
                      {member.full_name_ar && (
                        <span className="text-sm text-muted-foreground" dir="rtl">
                          {member.full_name_ar}
                        </span>
                      )}
                      {!member.is_active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Deactivated
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.tone}`}>
                        <RoleIcon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      {member.specialization && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <IdCard className="h-3 w-3" />
                          {member.specialization}
                        </span>
                      )}
                      {member.phone && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <button
                    onClick={() => handleEdit(member)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Manage
                  </button>
                  {member.role !== 'clinic_admin' &&
                    (member.is_active ? (
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(member.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-success/30 px-3 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/10"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reactivate
                      </button>
                    ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border bg-primary px-5 py-4 text-primary-foreground">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">
                  {editingId ? 'Manage staff member' : 'Add new staff member'}
                </h2>
                <p className="truncate text-xs text-primary-foreground/75">
                  {editingId ? formData.full_name : 'Profile, access rights and commissions'}
                </p>
              </div>
              <button onClick={resetForm} className="rounded-lg p-2 hover:bg-primary-foreground/15">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border bg-muted/50 px-3 py-2">
              {[
                { key: 'profile', label: 'Profile', icon: UserCircle },
                ...(formData.role !== 'clinic_admin' ? [{ key: 'access', label: 'Access', icon: Shield }] : []),
                ...(formData.role === 'doctor' ? [{ key: 'commission', label: 'Commission', icon: Percent }] : []),
              ].map((tab: any) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFormTab(tab.key)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    formTab === tab.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/60'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                {formTab === 'profile' && (
                  <>
                    {!editingId && (
                      <div className="rounded-xl border border-primary/20 bg-accent/60 p-3 text-xs text-primary">
                        Each staff member gets their own login. Share the credentials securely after creation.
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Full name (English) *</label>
                        <input type="text" required value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Full name (Arabic)</label>
                        <input type="text" dir="rtl" value={formData.full_name_ar}
                          onChange={(e) => setFormData({ ...formData, full_name_ar: e.target.value })}
                          className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-muted-foreground">Role *</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {Object.entries(ROLE_META).map(([key, meta]) => {
                          const Icon = meta.icon;
                          const active = formData.role === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setFormData({ ...formData, role: key as Staff['role'] })}
                              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                                active ? 'border-primary bg-accent text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{meta.label}</span>
                              {active && <Check className="ml-auto h-3.5 w-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Phone</label>
                        <input type="tel" value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Specialization / position</label>
                        <input type="text" list="specializations" value={formData.specialization}
                          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                          placeholder="e.g. Orthodontist" className={inputClass} />
                        <datalist id="specializations">
                          <option value="General Dentistry" />
                          <option value="Orthodontist" />
                          <option value="Oral Surgeon" />
                          <option value="Endodontist (Root Canal Specialist)" />
                          <option value="Periodontist (Gum Specialist)" />
                          <option value="Prosthodontist (Restorative)" />
                          <option value="Pediatric Dentist" />
                          <option value="Cosmetic Dentist" />
                          <option value="Dental Hygienist" />
                          <option value="Dental Assistant" />
                          <option value="Front Desk / Reception" />
                          <option value="Office Manager" />
                          <option value="Dental Technician" />
                        </datalist>
                      </div>
                    </div>

                    {!editingId && (
                      <div className="rounded-xl border border-border bg-muted/40 p-4">
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Login credentials</h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email *</label>
                            <input type="email" required value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className={inputClass} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Password *</label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <input type={showPassword ? 'text' : 'password'} required minLength={6}
                                  value={formData.password}
                                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                  className={`${inputClass} pr-10`} />
                                <button type="button" onClick={() => setShowPassword((v) => !v)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted">
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                              <button type="button" onClick={generatePassword}
                                className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-accent px-3 text-xs font-semibold text-primary">
                                <Sparkles className="h-3.5 w-3.5" />
                                Generate
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {formTab === 'access' && formData.role !== 'clinic_admin' && (
                  <div className="space-y-5">
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Quick presets</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'dentist', label: 'Dentist preset' },
                          { key: 'reception', label: 'Reception preset' },
                          { key: 'support', label: 'Support staff' },
                          { key: 'readonly', label: 'Read only' },
                        ].map((p) => (
                          <button key={p.key} type="button" onClick={() => applyPreset(p.key)}
                            className="rounded-full border border-primary/30 bg-accent px-3 py-1.5 text-xs font-semibold text-primary hover:bg-accent/70">
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {[
                      {
                        title: t('appointments') || 'Appointments',
                        items: [
                          ['can_view_appointments', 'View appointments'],
                          ['can_edit_appointments', 'Create / edit appointments'],
                          ['view_all_appointments', 'See all appointments', 'Otherwise only assigned'],
                        ],
                      },
                      {
                        title: t('patients') || 'Patients',
                        items: [
                          ['can_view_patients', 'View patients'],
                          ['can_edit_patients', 'Create / edit patients'],
                          ['view_all_patients', 'See all patients', 'Otherwise only assigned'],
                        ],
                      },
                      {
                        title: t('treatments') || 'Treatments',
                        items: [
                          ['can_view_treatments', 'View treatments'],
                          ['can_edit_treatments', 'Add / edit treatments'],
                        ],
                      },
                      {
                        title: 'Treatment plans',
                        items: [
                          ['can_view_treatment_plans', 'View treatment plans'],
                          ['can_edit_treatment_plans', 'Create / edit treatment plans'],
                          ['view_all_treatment_plans', 'See all treatment plans'],
                        ],
                      },
                      {
                        title: t('invoices') || 'Invoices & payments',
                        items: [
                          ['can_view_invoices', 'View invoices'],
                          ['can_edit_invoices', 'Create invoices / collect payments'],
                          ['view_all_invoices', 'See all invoices'],
                        ],
                      },
                      {
                        title: t('administrative') || 'Administrative',
                        items: [
                          ['can_view_inventory', 'View inventory'],
                          ['can_edit_inventory', 'Manage inventory'],
                          ['can_view_accounting', 'View accounting'],
                        ],
                      },
                      {
                        title: t('system') || 'System',
                        items: [
                          ['can_view_staff', 'View staff'],
                          ['can_edit_staff', 'Add / edit staff'],
                          ['can_view_settings', 'View & edit settings'],
                        ],
                      },
                    ].map((group) => {
                      const keys = group.items.map((i: any) => i[0]);
                      const allOn = keys.every((k) => permissions[k]);
                      return (
                        <div key={group.title} className="rounded-xl border border-border p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-bold text-foreground">{group.title}</h4>
                            <button type="button"
                              onClick={() => {
                                const next = { ...permissions };
                                keys.forEach((k) => (next[k] = !allOn));
                                setPermissions(next);
                              }}
                              className="text-xs font-semibold text-primary hover:underline">
                              {allOn ? 'Disable all' : 'Enable all'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {group.items.map(([key, label, hint]: any) => (
                              <Toggle key={key} label={label} hint={hint} checked={!!permissions[key]}
                                onChange={(v: boolean) => setPermissions({ ...permissions, [key]: v })} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {formTab === 'commission' && formData.role === 'doctor' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border p-4">
                      <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <DollarSign className="h-4 w-4 text-primary" />
                        General rate (default for all treatments)
                      </label>
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={(() => {
                            const general = treatmentCommissionRates.find((r) => !r.treatment_type_id);
                            return general ? general.commission_rate : 30;
                          })()}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            const generalIndex = treatmentCommissionRates.findIndex((r) => !r.treatment_type_id);
                            if (generalIndex >= 0) {
                              updateTreatmentCommissionRate(generalIndex, 'commission_rate', value);
                            } else {
                              setTreatmentCommissionRates([
                                { treatment_type_id: null, commission_rate: value },
                                ...treatmentCommissionRates,
                              ]);
                            }
                          }}
                          className="w-24 rounded-xl border border-primary/30 bg-card px-3 py-2 text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                        />
                        <span className="text-lg font-semibold text-foreground">%</span>
                        <span className="text-xs text-muted-foreground">Applied unless overridden below</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Treatment-specific rates</h4>
                          <p className="text-xs text-muted-foreground">Override the general rate per treatment</p>
                        </div>
                        <button type="button" onClick={addTreatmentCommissionRate}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      </div>

                      {treatmentCommissionRates.filter((r) => r.treatment_type_id !== null).length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                          No exceptions — general rate applies to all treatments.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {treatmentCommissionRates
                            .filter((r) => r.treatment_type_id !== null)
                            .map((rate, index) => {
                              const actualIndex = treatmentCommissionRates.findIndex((r) => r === rate);
                              return (
                                <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2.5">
                                  <select
                                    value={rate.treatment_type_id || ''}
                                    onChange={(e) => updateTreatmentCommissionRate(actualIndex, 'treatment_type_id', e.target.value || '')}
                                    className="min-w-[10rem] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                                  >
                                    <option value="">Select treatment…</option>
                                    {treatmentTypes.map((tt) => (
                                      <option key={tt.id} value={tt.id}>
                                        {tt.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex items-center gap-1">
                                    <input type="number" min="0" max="100" step="0.5" value={rate.commission_rate}
                                      onChange={(e) => updateTreatmentCommissionRate(actualIndex, 'commission_rate', parseFloat(e.target.value) || 0)}
                                      className="w-20 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
                                    <span className="text-sm font-medium text-muted-foreground">%</span>
                                  </div>
                                  <button type="button" onClick={() => removeTreatmentCommissionRate(actualIndex)}
                                    className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 border-t border-border bg-card px-5 py-4">
                <button type="button" onClick={resetForm}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

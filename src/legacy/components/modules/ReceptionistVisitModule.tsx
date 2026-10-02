// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  Printer,
  Clock,
  FileText,
  CheckCircle,
  RefreshCw,
  Phone,
  Stethoscope,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { canSetAppointmentStatus, isReception, statusPermissionMessage } from '../../utils/appointmentStatusPermissions';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { useCurrency } from '../../hooks/useCurrency';
import { generateVisitAppointmentPDF, VisitAppointmentData } from '../../utils/visitAppointmentPdfGenerator';

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-slate-100 text-slate-700 ring-slate-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
  arrived: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  no_show: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const PAY_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  partial: 'bg-amber-50 text-amber-700 ring-amber-200',
  unpaid: 'bg-rose-50 text-rose-700 ring-rose-200',
  pending: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function ReceptionistVisitModule() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const ar = language === 'ar';

  const [appointments, setAppointments] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'appointments' | 'visits'>('appointments');
  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'completed' | 'cancelled'>('all');
  const [dueOnly, setDueOnly] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.clinic_id) loadData();
  }, [profile?.clinic_id, dateFilter]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const loadData = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      let appointmentQuery = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(full_name, full_name_ar, phone, date_of_birth),
          doctor:users!appointments_doctor_id_fkey(full_name, full_name_ar),
          treatment_plan:treatment_plans(treatment_category, total_cost, paid_amount, status, treatment_types(id, name, name_ar))
        `)
        .eq('clinic_id', profile.clinic_id);

      if (dateFilter === 'today') {
        appointmentQuery = appointmentQuery
          .gte('appointment_date', `${today}T00:00:00`)
          .lte('appointment_date', `${today}T23:59:59`);
      } else if (dateFilter === 'upcoming') {
        appointmentQuery = appointmentQuery.gte('appointment_date', today);
      }

      const { data: appointmentData } = await appointmentQuery.order('appointment_date', { ascending: true });
      setAppointments(appointmentData || []);

      let visitQuery = supabase
        .from('treatment_visits')
        .select(`
          *,
          patient:patients(full_name, full_name_ar, phone, date_of_birth),
          doctor:users!treatment_visits_doctor_id_fkey(full_name, full_name_ar),
          treatment_plan:treatment_plans(treatment_category, total_cost, paid_amount, treatment_types(id, name, name_ar))
        `)
        .eq('clinic_id', profile.clinic_id);

      if (dateFilter === 'today') visitQuery = visitQuery.eq('visit_date', today);
      else if (dateFilter === 'upcoming') visitQuery = visitQuery.gte('visit_date', today);

      const { data: visitData } = await visitQuery.order('visit_date', { ascending: dateFilter !== 'all' });
      setVisits(visitData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const patientName = (p: any) => (ar && p?.full_name_ar ? p.full_name_ar : p?.full_name || '—');
  const doctorName = (d: any) => (ar && d?.full_name_ar ? d.full_name_ar : d?.full_name || '—');
  const treatmentName = (plan: any) =>
    (ar && plan?.treatment_types?.name_ar ? plan.treatment_types.name_ar : plan?.treatment_types?.name) ||
    plan?.treatment_category ||
    (ar ? 'علاج' : 'Treatment');

  const dayKey = (iso: string) => new Date(iso).toISOString().split('T')[0];
  const dayLabel = (key: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (key === today) return ar ? 'اليوم' : 'Today';
    if (key === tomorrow) return ar ? 'غداً' : 'Tomorrow';
    return new Date(key).toLocaleDateString(ar ? 'ar' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString(ar ? 'ar' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  const matchesSearch = (row: any) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return [row.patient?.full_name, row.patient?.full_name_ar, row.patient?.phone, row.doctor?.full_name]
      .filter(Boolean)
      .some((v: string) => v.toLowerCase().includes(q));
  };

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((a) => {
        if (!matchesSearch(a)) return false;
        if (statusFilter === 'completed') return a.status === 'completed';
        if (statusFilter === 'cancelled') return a.status === 'cancelled' || a.status === 'no_show';
        if (statusFilter === 'open') return !['completed', 'cancelled', 'no_show'].includes(a.status);
        return true;
      }),
    [appointments, searchTerm, statusFilter, language]
  );

  const filteredVisits = useMemo(
    () =>
      visits.filter((v) => {
        if (!matchesSearch(v)) return false;
        const due = Number(v.visit_cost || 0) - Number(v.payment_received || 0);
        if (dueOnly && due <= 0.001) return false;
        return true;
      }),
    [visits, searchTerm, dueOnly, language]
  );

  const groupedAppointments = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredAppointments.forEach((a) => {
      const k = dayKey(a.appointment_date);
      map.set(k, [...(map.get(k) || []), a]);
    });
    return Array.from(map.entries());
  }, [filteredAppointments]);

  const groupedVisits = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredVisits.forEach((v) => {
      const k = (v.visit_date || '').split('T')[0];
      map.set(k, [...(map.get(k) || []), v]);
    });
    return Array.from(map.entries());
  }, [filteredVisits]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppts = appointments.filter((a) => dayKey(a.appointment_date) === todayStr);
    const outstanding = visits.reduce(
      (sum, v) => sum + Math.max(0, Number(v.visit_cost || 0) - Number(v.payment_received || 0)),
      0
    );
    return {
      today: todayAppts.length,
      pending: appointments.filter((a) => !['completed', 'cancelled', 'no_show'].includes(a.status)).length,
      visits: visits.length,
      outstanding,
    };
  }, [appointments, visits]);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!canSetAppointmentStatus(profile, appt, newStatus)) {
      setToast(statusPermissionMessage(profile, ar));
      return;
    }
    try {
      setBusyId(appointmentId);
      const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appointmentId);
      if (error) throw error;
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a)));
      setToast(ar ? 'تم تحديث حالة الموعد' : 'Appointment status updated');
    } catch (error: any) {
      console.error(error);
      setToast(`Error: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const clinicHeader = async () => {
    const { data } = await supabase
      .from('clinics')
      .select('name, name_ar, address, phone')
      .eq('id', profile.clinic_id)
      .single();
    return data;
  };

  const handlePrintAppointment = async (appointment: any) => {
    try {
      setPrintingId(appointment.id);
      const clinicData = await clinicHeader();
      const pdfData: VisitAppointmentData = {
        clinicId: profile.clinic_id,
        patientName: appointment.patient?.full_name,
        patientNameAr: appointment.patient?.full_name_ar,
        patientPhone: appointment.patient?.phone,
        patientAge: appointment.patient?.date_of_birth
          ? new Date().getFullYear() - new Date(appointment.patient.date_of_birth).getFullYear()
          : undefined,
        doctorName: appointment.doctor?.full_name,
        doctorNameAr: appointment.doctor?.full_name_ar,
        clinicName: clinicData?.name || 'Clinic',
        clinicNameAr: clinicData?.name_ar,
        clinicAddress: clinicData?.address,
        clinicPhone: clinicData?.phone,
        appointmentDate: appointment.appointment_date.split('T')[0],
        appointmentTime: timeLabel(appointment.appointment_date),
        treatmentCategory: appointment.treatment_plan?.treatment_category,
        notes: appointment.notes,
      };
      await generateVisitAppointmentPDF(pdfData);
    } catch (error: any) {
      console.error(error);
      setToast(`Error: ${error.message}`);
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrintVisit = async (visit: any) => {
    try {
      setPrintingId(visit.id);
      const clinicData = await clinicHeader();
      const { data: nextVisit } = await supabase
        .from('treatment_visits')
        .select('visit_date')
        .eq('treatment_plan_id', visit.treatment_plan_id)
        .gt('visit_date', visit.visit_date)
        .order('visit_date')
        .limit(1)
        .maybeSingle();

      const pdfData: VisitAppointmentData = {
        clinicId: profile.clinic_id,
        patientName: visit.patient?.full_name,
        patientNameAr: visit.patient?.full_name_ar,
        patientPhone: visit.patient?.phone,
        patientAge: visit.patient?.date_of_birth
          ? new Date().getFullYear() - new Date(visit.patient.date_of_birth).getFullYear()
          : undefined,
        doctorName: visit.doctor?.full_name,
        doctorNameAr: visit.doctor?.full_name_ar,
        clinicName: clinicData?.name || 'Clinic',
        clinicNameAr: clinicData?.name_ar,
        clinicAddress: clinicData?.address,
        clinicPhone: clinicData?.phone,
        appointmentDate: visit.visit_date,
        appointmentTime: '---',
        treatmentCategory: treatmentName(visit.treatment_plan),
        visitNumber: visit.visit_number,
        procedurePerformed: visit.procedure_performed,
        visitCost: visit.visit_cost,
        paymentReceived: visit.payment_received,
        notes: visit.notes,
        nextVisitDate: nextVisit?.visit_date,
      };
      await generateVisitAppointmentPDF(pdfData);
    } catch (error: any) {
      console.error(error);
      setToast(`Error: ${error.message}`);
    } finally {
      setPrintingId(null);
    }
  };

  const Segmented = ({ value, onChange, options }: any) => (
    <div className="flex w-full gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto">
      {options.map((o: any) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:flex-none ${
            value === o.value ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const StatCard = ({ icon: Icon, label, value, tone }: any) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className="mt-2 truncate text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-slate-900 sm:text-3xl">
            {ar ? 'المواعيد والزيارات' : 'Appointments & Visits'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {ar ? 'إدارة وطباعة المواعيد وتفاصيل الزيارات' : 'Manage, track and print appointments and visit details'}
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{ar ? 'تحديث' : 'Refresh'}</span>
        </button>
      </header>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Calendar} label={ar ? 'مواعيد اليوم' : "Today"} value={stats.today} tone="bg-blue-50 text-blue-600" />
        <StatCard icon={Clock} label={ar ? 'قيد الانتظار' : 'Pending'} value={stats.pending} tone="bg-amber-50 text-amber-600" />
        <StatCard icon={FileText} label={ar ? 'الزيارات' : 'Visits'} value={stats.visits} tone="bg-indigo-50 text-indigo-600" />
        <StatCard
          icon={AlertCircle}
          label={ar ? 'مستحقات' : 'Outstanding'}
          value={`${formatNumber(stats.outstanding)} ${currencySymbol}`}
          tone="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Controls */}
      <div className="sticky top-0 z-20 mt-5 space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={ar ? 'بحث باسم المريض أو الهاتف أو الطبيب...' : 'Search patient, phone or doctor...'}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            value={selectedTab}
            onChange={setSelectedTab}
            options={[
              { value: 'appointments', label: `${ar ? 'المواعيد' : 'Appointments'} (${filteredAppointments.length})` },
              { value: 'visits', label: `${ar ? 'الزيارات' : 'Visits'} (${filteredVisits.length})` },
            ]}
          />
          <Segmented
            value={dateFilter}
            onChange={setDateFilter}
            options={[
              { value: 'today', label: ar ? 'اليوم' : 'Today' },
              { value: 'upcoming', label: ar ? 'القادمة' : 'Upcoming' },
              { value: 'all', label: ar ? 'الكل' : 'All' },
            ]}
          />
        </div>

        {selectedTab === 'appointments' ? (
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: ar ? 'الكل' : 'All' },
              { value: 'open', label: ar ? 'نشطة' : 'Open' },
              { value: 'completed', label: ar ? 'مكتملة' : 'Completed' },
              { value: 'cancelled', label: ar ? 'ملغاة' : 'Cancelled' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value as any)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                  statusFilter === f.value
                    ? 'bg-slate-900 text-white ring-slate-900'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setDueOnly((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
              dueOnly ? 'bg-rose-600 text-white ring-rose-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {ar ? 'غير مدفوعة فقط' : 'Unpaid only'}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : selectedTab === 'appointments' ? (
        groupedAppointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={ar ? 'لا توجد مواعيد' : 'No appointments'}
            hint={ar ? 'جرب تغيير الفلاتر أو البحث' : 'Try changing the filters or search'}
          />
        ) : (
          <div className="mt-6 space-y-6">
            {groupedAppointments.map(([day, rows]) => (
              <section key={day}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{dayLabel(day)}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {rows.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {rows.map((a: any) => {
                    const plan = a.treatment_plan;
                    const due = plan ? Number(plan.total_cost || 0) - Number(plan.paid_amount || 0) : 0;
                    return (
                      <article
                        key={a.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
                      >
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                          <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-900 px-2 py-2 text-white">
                            <span className="text-sm font-bold leading-tight">{timeLabel(a.appointment_date)}</span>
                            <span className="text-[10px] uppercase tracking-wide text-slate-300">
                              {new Date(a.appointment_date).toLocaleDateString(ar ? 'ar' : 'en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <h3 className="min-w-0 truncate text-base font-bold text-slate-900">
                                {patientName(a.patient)}
                              </h3>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ring-1 ${
                                  STATUS_STYLES[a.status] || STATUS_STYLES.scheduled
                                }`}
                              >
                                {a.status?.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                              {a.patient?.phone && (
                                <a href={`tel:${a.patient.phone}`} className="inline-flex items-center gap-1 hover:text-slate-900">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{a.patient.phone}</span>
                                </a>
                              )}
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{doctorName(a.doctor)}</span>
                              </span>
                            </div>

                            {plan && (
                              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                                <span className="font-semibold text-slate-800">{treatmentName(plan)}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600">
                                  {ar ? 'الإجمالي' : 'Total'} {formatNumber(plan.total_cost)} {currencySymbol}
                                </span>
                                <span
                                  className={`font-semibold ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                                >
                                  {due > 0
                                    ? `${ar ? 'المتبقي' : 'Due'} ${formatNumber(due)} ${currencySymbol}`
                                    : ar
                                      ? 'مدفوع بالكامل'
                                      : 'Fully paid'}
                                </span>
                              </div>
                            )}

                            {a.notes && (
                              <p className="mt-2 line-clamp-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                {a.notes}
                              </p>
                            )}

                            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                              <select
                                value={a.status}
                                disabled={busyId === a.id}
                                onChange={(e) => handleStatusChange(a.id, e.target.value)}
                                className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                              >
                                {[
                                  { v: 'scheduled', l: ar ? 'مجدول' : 'Scheduled' },
                                  { v: 'confirmed', l: ar ? 'مؤكد' : 'Confirmed' },
                                  { v: 'arrived', l: ar ? 'حضر' : 'Arrived' },
                                  { v: 'completed', l: ar ? 'مكتمل' : 'Completed' },
                                  { v: 'cancelled', l: ar ? 'ملغي' : 'Cancelled' },
                                  { v: 'no_show', l: ar ? 'لم يحضر' : 'No show' },
                                ]
                                  .filter((o) => o.v === a.status || canSetAppointmentStatus(profile, a, o.v))
                                  .map((o) => (
                                    <option key={o.v} value={o.v}>{o.l}</option>
                                  ))}
                              </select>
                              <button
                                onClick={() => handlePrintAppointment(a)}
                                disabled={printingId === a.id}
                                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                              >
                                <Printer className="h-4 w-4" />
                                <span className="hidden sm:inline">{ar ? 'طباعة' : 'Print'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )
      ) : groupedVisits.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={ar ? 'لا توجد زيارات' : 'No visits'}
          hint={ar ? 'جرب تغيير الفلاتر أو البحث' : 'Try changing the filters or search'}
        />
      ) : (
        <div className="mt-6 space-y-6">
          {groupedVisits.map(([day, rows]) => (
            <section key={day}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{dayLabel(day)}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {rows.length}
                </span>
              </div>
              <div className="space-y-3">
                {rows.map((v: any) => {
                  const cost = Number(v.visit_cost || 0);
                  const paid = Number(v.payment_received || 0);
                  const due = Math.max(0, cost - paid);
                  const payState = due <= 0.001 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
                  const pct = cost > 0 ? Math.min(100, (paid / cost) * 100) : 0;
                  return (
                    <article
                      key={v.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
                    >
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                          <span className="text-[10px] font-semibold uppercase">{ar ? 'زيارة' : 'Visit'}</span>
                          <span className="text-base font-bold leading-none">{v.visit_number}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="min-w-0 truncate text-base font-bold text-slate-900">{patientName(v.patient)}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ring-1 ${PAY_STYLES[payState]}`}>
                              {payState}
                            </span>
                            {v.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                                {ar ? 'مكتملة' : 'Completed'}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{doctorName(v.doctor)}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              {new Date(v.visit_date).toLocaleDateString(ar ? 'ar' : 'en-US')}
                            </span>
                          </div>

                          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="min-w-0 truncate font-semibold text-slate-800">
                                {treatmentName(v.treatment_plan)}
                              </span>
                              <span className="text-slate-600">
                                {formatNumber(paid)} / {formatNumber(cost)} {currencySymbol}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full ${due <= 0.001 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {due > 0 && (
                              <div className="mt-2 text-xs font-semibold text-rose-600">
                                {ar ? 'المتبقي' : 'Due'} {formatNumber(due)} {currencySymbol}
                              </div>
                            )}
                          </div>

                          {v.procedure_performed && (
                            <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                              <span className="font-semibold text-slate-800">
                                {ar ? 'الإجراء: ' : 'Procedure: '}
                              </span>
                              {v.procedure_performed}
                            </p>
                          )}
                          {v.notes && (
                            <p className="mt-2 line-clamp-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                              {v.notes}
                            </p>
                          )}

                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => handlePrintVisit(v)}
                              disabled={printingId === v.id}
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                              <Printer className="h-4 w-4" />
                              {ar ? 'طباعة تفاصيل الزيارة' : 'Print visit details'}
                              <ChevronRight className="h-4 w-4 opacity-70" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: any) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <Icon className="mx-auto mb-3 h-12 w-12 text-slate-300" />
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

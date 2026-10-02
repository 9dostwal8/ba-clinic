// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { canSetAppointmentStatus, isReception, statusPermissionMessage } from '../../utils/appointmentStatusPermissions';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, X, Send, MessageCircle, Copy, Phone, Pencil } from 'lucide-react';
import { openWhatsApp, getWhatsAppMessage } from '../../utils/whatsappHelper';
import { parseLocalDateTime, formatLocalTime, getLocalDateParts, getLocalTimestamp } from '../../utils/dateTimeHelper';
import { NewAppointmentModal } from '../modals/NewAppointmentModal';

interface Appointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  appointment_type: string;
  notes: string | null;
  doctor_id: string;
  patients: {
    full_name: string;
    full_name_ar: string | null;
    phone: string | null;
    patient_number: string;
    language_preference: 'en' | 'ar' | null;
  } | null;
  users: { full_name: string } | null;
}

type CalendarView = 'day' | 'week' | 'month';

export function AppointmentsModule() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [whatsappSettings, setWhatsappSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [displayMode, setDisplayMode] = useState<'agenda' | 'grid'>('agenda');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthSelected, setMonthSelected] = useState<Date | null>(new Date());

  useEffect(() => {
    loadData();
    loadWhatsAppSettings();
  }, [profile, currentDate, calendarView]);

  const loadWhatsAppSettings = async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data } = await supabase
        .from('whatsapp_settings')
        .select('enabled, appointment_reminders_enabled')
        .eq('clinic_id', profile.clinic_id)
        .maybeSingle();
      if (data) setWhatsappSettings(data);
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    }
  };

  const loadData = async () => {
    if (!profile?.clinic_id || !profile?.id) return;

    try {
      let appointmentsQuery = supabase
        .from('appointments')
        .select('*, patients(full_name, full_name_ar, phone, patient_number, language_preference), users!appointments_doctor_id_fkey(full_name), doctor_id')
        .eq('clinic_id', profile.clinic_id)
        .order('appointment_date', { ascending: true });

      if (profile.role === 'doctor') {
        const { data: perms } = await supabase
          .from('staff_permissions')
          .select('view_all_appointments')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (perms?.view_all_appointments === false) {
          appointmentsQuery = appointmentsQuery.eq('doctor_id', profile.id);
        }
      }

      const { data, error } = await appointmentsQuery;

      if (error) {
        console.error('Error fetching appointments:', error);
      }

      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    const appt = appointments.find((a: any) => a.id === id);
    if (!canSetAppointmentStatus(profile, appt, status)) {
      alert(statusPermissionMessage(profile));
      return;
    }
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      loadData();
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const sendReminder = async (appointmentId: string, type: 'sms' | 'whatsapp') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-appointment-reminder`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
          notificationType: type,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(t('reminderSentSuccessfully'));
        loadData();
      } else {
        throw new Error(result.error || 'Failed to send reminder');
      }
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      alert(error.message || t('errorSendingReminder'));
    }
  };

  const sendWhatsAppDirect = async (appointment: Appointment) => {
    if (!appointment.patients?.phone) {
      alert(t('patientHasNoPhone'));
      return;
    }

    if (!profile?.clinic_id) return;

    try {
      const { data: clinic } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', profile.clinic_id)
        .single();

      const patientName = appointment.patients.language_preference === 'ar' && appointment.patients.full_name_ar
        ? appointment.patients.full_name_ar
        : appointment.patients.full_name;

      const appointmentTime = formatLocalTime(
        appointment.appointment_date,
        appointment.patients.language_preference === 'ar' ? 'ar-SA' : 'en-US'
      );

      const doctorName = appointment.users?.full_name || 'Doctor';

      const message = await getWhatsAppMessage(
        patientName,
        appointment.patients.language_preference || 'en',
        clinic?.name || 'Clinic',
        appointment.appointment_date,
        appointmentTime,
        doctorName,
        profile.clinic_id
      );

      openWhatsApp(appointment.patients.phone, message);

      await supabase.from('notification_logs').insert({
        clinic_id: profile.clinic_id,
        patient_id: appointment.patients.patient_number,
        notification_type: 'whatsapp_direct',
        recipient: appointment.patients.phone,
        message_content: message,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      alert(t('whatsappOpened'));
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      alert(t('errorOpeningWhatsApp'));
    }
  };

  const copyMessageToClipboard = async (appointment: Appointment) => {
    if (!profile?.clinic_id) return;

    try {
      const { data: clinic } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', profile.clinic_id)
        .single();

      const patientName = appointment.patients?.language_preference === 'ar' && appointment.patients?.full_name_ar
        ? appointment.patients.full_name_ar
        : appointment.patients?.full_name;

      const appointmentTime = formatLocalTime(
        appointment.appointment_date,
        appointment.patients?.language_preference === 'ar' ? 'ar-SA' : 'en-US'
      );

      const doctorName = appointment.users?.full_name || 'Doctor';

      const message = await getWhatsAppMessage(
        patientName || '',
        appointment.patients?.language_preference || 'en',
        clinic?.name || 'Clinic',
        appointment.appointment_date,
        appointmentTime,
        doctorName,
        profile?.clinic_id
      );

      await navigator.clipboard.writeText(message);
      alert(t('messageCopied'));
    } catch (error) {
      console.error('Error copying message:', error);
      alert(t('errorCopyingMessage'));
    }
  };

  const getAppointmentColor = (type: string) => {
    switch (type) {
      case 'checkup': return 'bg-green-500';
      case 'treatment': return 'bg-blue-500';
      case 'emergency': return 'bg-red-500';
      case 'followup': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  const getDoctorColor = (doctorId: string) => {
    const colors = [
      { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-900' },
      { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-900' },
      { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-900' },
      { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-900' },
      { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-900' },
      { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-900' },
      { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-900' },
      { bg: 'bg-lime-100', border: 'border-lime-500', text: 'text-lime-900' },
      { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-900' },
      { bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', text: 'text-fuchsia-900' },
      { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-900' },
      { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-900' },
      { bg: 'bg-sky-100', border: 'border-sky-500', text: 'text-sky-900' },
      { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-900' },
      { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-900' },
    ];

    let hash = 0;
    for (let i = 0; i < doctorId.length; i++) {
      const char = doctorId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];

    return `${color.bg} ${color.border} ${color.text}`;
  };

  const getStatusDotColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-blue-500';
      case 'confirmed': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      case 'no-show': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'confirmed': return 'bg-sky-500';
      case 'cancelled': return 'bg-red-500';
      case 'no_show': return 'bg-gray-500';
      default: return 'bg-amber-500';
    }
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const getAppointmentsForTimeSlot = (date: Date, timeSlot: string) => {
    return appointments.filter(apt => {
      const aptDate = parseLocalDateTime(apt.appointment_date);

      if (aptDate.getDate() !== date.getDate() ||
          aptDate.getMonth() !== date.getMonth() ||
          aptDate.getFullYear() !== date.getFullYear()) {
        return false;
      }

      const aptHour = aptDate.getHours();
      const aptMinute = aptDate.getMinutes();

      const [slotHour, slotMinute] = timeSlot.split(':').map(Number);

      if (aptHour !== slotHour) {
        return false;
      }

      if (slotMinute === 0) {
        return aptMinute >= 0 && aptMinute < 30;
      } else {
        return aptMinute >= 30 && aptMinute < 60;
      }
    });
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = parseLocalDateTime(apt.appointment_date);
      return aptDate.getDate() === date.getDate() &&
             aptDate.getMonth() === date.getMonth() &&
             aptDate.getFullYear() === date.getFullYear();
    }).sort((a, b) => getLocalTimestamp(a.appointment_date) - getLocalTimestamp(b.appointment_date));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (calendarView === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (calendarView === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  if (loading) return <div className="text-center py-12">{t('loading')}</div>;

  const weekDays = getWeekDays();
  const timeSlots = getTimeSlots();
  const monthDays = getDaysInMonth();

  const statusOptions = ['all', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
  const matchesFilters = (apt: Appointment) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (apt.patients?.full_name || '').toLowerCase().includes(q) ||
      (apt.patients?.full_name_ar || '').includes(search.trim()) ||
      (apt.users?.full_name || '').toLowerCase().includes(q) ||
      (apt.patients?.phone || '').includes(search.trim())
    );
  };

  const dayList = (date: Date) => getAppointmentsForDay(date).filter(matchesFilters);
  const rangeDays = calendarView === 'day' ? [currentDate] : weekDays;
  const rangeAppointments = rangeDays.flatMap((d) => dayList(d));
  const todayCount = dayList(new Date()).length;
  const upcomingCount = rangeAppointments.filter(
    (a) => ['scheduled', 'confirmed'].includes(a.status),
  ).length;
  const doneCount = rangeAppointments.filter((a) => a.status === 'completed').length;

  const periodLabel =
    calendarView === 'month'
      ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : calendarView === 'week'
        ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const statusPill = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'no_show': return 'bg-neutral-200 text-neutral-700 border-neutral-300';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const AppointmentRow = ({ apt, dense = false }: { apt: Appointment; dense?: boolean }) => (
    <button
      onClick={() => setSelectedAppointment(apt)}
      className={`group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 text-left transition hover:border-slate-900/30 hover:shadow-sm ${dense ? 'py-2' : 'py-3'}`}
    >
      <span className="shrink-0 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold tabular-nums text-white">
        {formatLocalTime(apt.appointment_date)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-neutral-900">
          {apt.patients?.full_name}
        </span>
        <span className="block truncate text-xs text-neutral-500">
          Dr. {apt.users?.full_name} · {apt.duration_minutes}m · {apt.appointment_type}
        </span>
      </span>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPill(apt.status)}`}>
        {apt.status.replace('_', ' ')}
      </span>
    </button>
  );

  const DaySection = ({ date }: { date: Date }) => {
    const list = dayList(date);
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <div className={`truncate text-sm font-bold ${isToday(date) ? 'text-sky-700' : 'text-neutral-900'}`}>
              {isToday(date) ? 'Today · ' : ''}
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200">
            {list.length}
          </span>
        </div>
        {list.length === 0 ? (
          <p className="px-1 py-3 text-xs text-neutral-400">No appointments</p>
        ) : (
          <div className="space-y-2">
            {list.map((apt) => <AppointmentRow key={apt.id} apt={apt} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-neutral-900 sm:text-3xl">{t('appointments')}</h1>
          <p className="truncate text-sm text-neutral-500">{periodLabel}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">{t('newAppointment')}</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Today', value: todayCount },
          { label: calendarView === 'month' ? 'Upcoming (week)' : 'Upcoming', value: upcomingCount },
          { label: 'Completed', value: doneCount },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="eyebrow text-neutral-400">{kpi.label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4">
        {/* Controls */}
        <div className="space-y-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <button onClick={() => navigate('prev')} className="rounded-lg p-2 transition hover:bg-neutral-100">
              <ChevronLeft className="h-5 w-5 text-neutral-600" />
            </button>
            <h2 className="truncate text-center text-base font-bold text-neutral-900 sm:text-xl">{periodLabel}</h2>
            <button onClick={() => navigate('next')} className="rounded-lg p-2 transition hover:bg-neutral-100">
              <ChevronRight className="h-5 w-5 text-neutral-600" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={goToToday}
              className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200"
            >
              {t('today') || 'Today'}
            </button>
            <div className="flex rounded-lg bg-neutral-100 p-1">
              {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setCalendarView(v)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition ${
                    calendarView === v ? 'bg-white text-slate-900 shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {calendarView !== 'month' && (
              <div className="ml-auto flex rounded-lg bg-neutral-100 p-1">
                {(['agenda', 'grid'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDisplayMode(m)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition ${
                      displayMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-neutral-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, doctor or phone…"
              className="w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-slate-900/30 focus:bg-white"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium capitalize outline-none"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          {/* AGENDA (day + week) */}
          {calendarView !== 'month' && displayMode === 'agenda' && (
            <div className="space-y-3">
              {rangeDays.map((d, i) => <DaySection key={i} date={d} />)}
            </div>
          )}

          {/* GRID week */}
          {calendarView === 'week' && displayMode === 'grid' && (
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[64px_repeat(7,1fr)] overflow-hidden rounded-xl border border-neutral-200">
                  <div className="sticky left-0 z-10 border-b border-r border-neutral-200 bg-neutral-50" />
                  {weekDays.map((day, idx) => (
                    <div
                      key={idx}
                      className={`border-b border-r border-neutral-200 p-2 text-center ${isToday(day) ? 'bg-sky-50' : 'bg-neutral-50'}`}
                    >
                      <div className="eyebrow text-neutral-400">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className={`text-lg font-bold ${isToday(day) ? 'text-sky-700' : 'text-neutral-900'}`}>{day.getDate()}</div>
                    </div>
                  ))}
                  {timeSlots.map((slot) => (
                    <React.Fragment key={slot}>
                      <div className="border-b border-r border-neutral-200 bg-neutral-50 p-1 text-right text-[11px] tabular-nums text-neutral-400">
                        {slot}
                      </div>
                      {weekDays.map((day, idx) => {
                        const slotsAppointments = getAppointmentsForTimeSlot(day, slot).filter(matchesFilters);
                        return (
                          <div
                            key={`${slot}-${idx}`}
                            className={`min-h-[52px] border-b border-r border-neutral-200 p-1 ${isToday(day) ? 'bg-sky-50/40' : 'hover:bg-neutral-50'}`}
                          >
                            {slotsAppointments.map((apt) => (
                              <button
                                key={apt.id}
                                onClick={() => setSelectedAppointment(apt)}
                                className={`relative mb-1 w-full rounded-lg border-l-4 p-1.5 text-left text-[11px] ${getDoctorColor(apt.doctor_id)}`}
                              >
                                <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ${getStatusDotColor(apt.status)}`} />
                                <span className="block truncate pr-3 font-semibold">{apt.patients?.full_name}</span>
                                <span className="block truncate opacity-75">{apt.users?.full_name}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GRID day */}
          {calendarView === 'day' && displayMode === 'grid' && (
            <div className="divide-y divide-neutral-100">
              {timeSlots.map((slot) => {
                const slotAppointments = getAppointmentsForTimeSlot(currentDate, slot).filter(matchesFilters);
                return (
                  <div key={slot} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 py-2">
                    <div className="pt-1 text-right text-xs tabular-nums text-neutral-400">{slot}</div>
                    <div className="min-w-0 space-y-2">
                      {slotAppointments.map((apt) => <AppointmentRow key={apt.id} apt={apt} dense />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MONTH */}
          {calendarView === 'month' && (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                    {d}
                  </div>
                ))}
                {monthDays.map((day, index) => {
                  if (!day) return <div key={`e-${index}`} className="aspect-square" />;
                  const list = dayList(day);
                  const selected = monthSelected && day.toDateString() === monthSelected.toDateString();
                  return (
                    <button
                      key={index}
                      onClick={() => setMonthSelected(day)}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : isToday(day)
                            ? 'border-sky-300 bg-sky-50 text-sky-800'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="font-semibold tabular-nums">{day.getDate()}</span>
                      {list.length > 0 && (
                        <span
                          className={`mt-1 rounded-full px-1.5 text-[10px] font-bold ${
                            selected ? 'bg-white/20 text-white' : 'bg-slate-900/90 text-white'
                          }`}
                        >
                          {list.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <DaySection date={monthSelected || new Date()} />
            </div>
          )}
        </div>
      </div>


      {selectedAppointment && (() => {
        const apt = selectedAppointment;
        const parts = getLocalDateParts(apt.appointment_date);
        const statusChip = (s: string, active: string, idle: string) =>
          apt.status === s ? active : idle;
        const quickStatuses = [
          { value: 'scheduled', label: t('scheduled') || 'Scheduled' },
          { value: 'confirmed', label: t('confirmed') || 'Confirmed' },
          { value: 'arrived', label: t('arrived') || 'Checked in' },
          { value: 'completed', label: t('completed') || 'Completed' },
          { value: 'cancelled', label: t('cancelled') || 'Cancelled' },
          { value: 'no_show', label: t('noShow') || 'No show' },
        ].filter((s) => canSetAppointmentStatus(profile, apt, s.value));
        return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
            {/* Header */}
            <div className="relative bg-slate-900 px-5 pb-5 pt-4 text-white">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
              <button
                onClick={() => setSelectedAppointment(null)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="eyebrow text-white/50">{t('appointmentDetails') || 'Appointment'}</div>
              <div className="mt-1 flex items-center gap-3 pr-8">
                <h2 className="min-w-0 flex-1 truncate text-xl font-black">
                  {apt.patients?.full_name}
                </h2>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  apt.status === 'completed' ? 'bg-emerald-400/20 text-emerald-300'
                  : apt.status === 'confirmed' ? 'bg-sky-400/20 text-sky-300'
                  : apt.status === 'cancelled' || apt.status === 'no_show' ? 'bg-rose-400/20 text-rose-300'
                  : 'bg-amber-400/20 text-amber-300'
                }`}>
                  {apt.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-white/50" />
                  {parseLocalDateTime(apt.appointment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-white/50" />
                  {formatLocalTime(apt.appointment_date)} · {apt.duration_minutes} min
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Patient card */}
              <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {(apt.patients?.full_name || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-slate-900">{apt.patients?.full_name}</div>
                  <div className="text-xs text-neutral-500">
                    {apt.patients?.patient_number}
                    {apt.patients?.phone ? ` · ${apt.patients.phone}` : ''}
                  </div>
                </div>
                {apt.patients?.phone && (
                  <a
                    href={`tel:${apt.patients.phone}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-neutral-200 bg-white text-slate-700 transition hover:bg-neutral-100"
                    aria-label="Call patient"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* Info grid */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="eyebrow text-neutral-400">{t('doctor') || 'Doctor'}</div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-900">Dr. {apt.users?.full_name}</div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="eyebrow text-neutral-400">{t('type') || 'Type'}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-bold capitalize text-slate-900">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${getAppointmentColor(apt.appointment_type)}`} />
                    <span className="truncate">{t(apt.appointment_type) || apt.appointment_type}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="eyebrow mb-2 text-neutral-400">{t('status') || 'Status'}</div>
                <div className="flex flex-wrap gap-2">
                  {quickStatuses.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => updateAppointmentStatus(apt.id, s.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${statusChip(
                        s.value,
                        'bg-slate-900 text-white shadow-sm',
                        'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      )}`}
                    >
                      {s.label}
                    </button>
                  ))}
                  {quickStatuses.length === 0 && (
                    <p className="text-xs text-neutral-500">{statusPermissionMessage(profile)}</p>
                  )}
                </div>
                {isReception(profile) && quickStatuses.length > 0 && (
                  <p className="mt-2 text-[11px] text-neutral-500">{statusPermissionMessage(profile)}</p>
                )}
              </div>

              {apt.notes && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="eyebrow text-amber-700">{t('notes') || 'Notes'}</div>
                  <div className="mt-1 text-sm text-slate-800">{apt.notes}</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-neutral-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setEditingAppointment(apt); setSelectedAppointment(null); setShowAddModal(true); }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-neutral-50"
                >
                  <Pencil className="h-4 w-4" />
                  {t('edit') || 'Edit'}
                </button>
                <button
                  onClick={() => copyMessageToClipboard(apt)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-neutral-50"
                >
                  <Copy className="h-4 w-4" />
                  {t('copyMessage') || 'Copy'}
                </button>
              </div>
              {apt.patients?.phone && (
                <button
                  onClick={() => sendWhatsAppDirect(apt)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t('sendViaWhatsApp') || 'Send via WhatsApp'}
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {showAddModal && (
        <NewAppointmentModal
          isOpen={showAddModal}
          appointment={editingAppointment}
          onClose={() => {
            setShowAddModal(false);
            setEditingAppointment(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingAppointment(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

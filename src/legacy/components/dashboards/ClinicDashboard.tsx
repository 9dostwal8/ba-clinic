// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useCurrency } from '../../hooks/useCurrency';
import { Calendar, Users, DollarSign, TrendingUp, Clock, CheckCircle, Stethoscope, Package, FileText, CircleUser as UserCircle, Settings as SettingsIcon, Pill, AlertTriangle, Lock, Mail, Phone, Plus, UserPlus, CalendarPlus, FileTextIcon, Activity, ClipboardList, PlayCircle, CheckCircle2, CalendarClock, MessageSquare } from 'lucide-react';
import { NewPatientModal } from '../modals/NewPatientModal';
import { NewAppointmentModal } from '../modals/NewAppointmentModal';
import { NewInvoiceModal } from '../modals/NewInvoiceModal';
import { NewPrescriptionModal } from '../modals/NewPrescriptionModal';
import { NewStaffModal } from '../modals/NewStaffModal';
import { ClinicAdminDashboard } from './ClinicAdminDashboard';

interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  monthlyRevenue: number;
  pendingPayments: number;
  upcomingAppointments: any[];
}

interface ModuleCard {
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  hoverColor: string;
  page: string;
  description: string;
}

interface ClinicDashboardProps {
  onNavigate?: (page: string) => void;
}

export function ClinicDashboard({ onNavigate }: ClinicDashboardProps = {}) {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { getSetting } = useAppSettings();
  const { currencySymbol } = useCurrency();
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    totalPatients: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    upcomingAppointments: []
  });
  const [loading, setLoading] = useState(true);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showNewPrescriptionModal, setShowNewPrescriptionModal] = useState(false);
  const [showNewStaffModal, setShowNewStaffModal] = useState(false);

  const isClinicAdmin = profile?.role === 'clinic_admin';
  const isDoctor = profile?.role === 'doctor';
  const permissions = profile?.permissions;

  useEffect(() => {
    if (profile?.clinic_id) {
      loadDashboardData();
    }
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile?.clinic_id) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      let todayAppointmentsQuery = supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('clinic_id', profile.clinic_id)
        .gte('appointment_date', today.toISOString())
        .lt('appointment_date', tomorrow.toISOString());

      let patientsQuery = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('clinic_id', profile.clinic_id);

      let upcomingQuery = supabase
        .from('appointments')
        .select('*, patients(full_name), users!appointments_doctor_id_fkey(full_name)')
        .eq('clinic_id', profile.clinic_id)
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(5);

      if (profile.role === 'doctor') {
        todayAppointmentsQuery = todayAppointmentsQuery.eq('doctor_id', profile.id);
        patientsQuery = patientsQuery.eq('assigned_doctor_id', profile.id);
        upcomingQuery = upcomingQuery.eq('doctor_id', profile.id);
      }

      const patientsRes = await patientsQuery;

      let invoicesQuery = supabase
        .from('invoices')
        .select('total, paid_amount, payment_status')
        .eq('clinic_id', profile.clinic_id)
        .gte('invoice_date', firstDayOfMonth.toISOString());

      if (profile.role === 'doctor') {
        const { data: perms } = await supabase
          .from('staff_permissions')
          .select('view_all_invoices')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (perms && perms.view_all_invoices === false) {
          invoicesQuery = invoicesQuery.eq('doctor_id', profile.id);
        }
      }

      const [appointmentsRes, invoicesRes, upcomingRes] = await Promise.all([
        todayAppointmentsQuery,
        invoicesQuery,
        upcomingQuery
      ]);

      let monthlyRevenue = 0;
      let pendingPayments = 0;

      if (invoicesRes.data) {
        invoicesRes.data.forEach(invoice => {
          monthlyRevenue += Number(invoice.total || 0);
          if (invoice.payment_status !== 'paid') {
            pendingPayments += Number(invoice.total || 0) - Number(invoice.paid_amount || 0);
          }
        });
      }

      setStats({
        todayAppointments: appointmentsRes.count || 0,
        totalPatients: patientsRes.count || 0,
        monthlyRevenue,
        pendingPayments,
        upcomingAppointments: upcomingRes.data || []
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModuleCards = (): ModuleCard[] => {
    const cards: ModuleCard[] = [];

    if (isClinicAdmin) {
      return [
        {
          name: 'Appointments',
          icon: Calendar,
          color: 'text-sky-600',
          bgColor: 'bg-sky-50',
          hoverColor: 'hover:bg-sky-100',
          page: 'appointments',
          description: 'Manage appointments'
        },
        {
          name: 'Patients',
          icon: Users,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          hoverColor: 'hover:bg-emerald-100',
          page: 'patients',
          description: 'Patient records'
        },
        {
          name: 'Treatments',
          icon: Stethoscope,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          hoverColor: 'hover:bg-purple-100',
          page: 'treatments',
          description: 'Treatment history'
        },
        {
          name: 'Prescriptions',
          icon: Pill,
          color: 'text-pink-600',
          bgColor: 'bg-pink-50',
          hoverColor: 'hover:bg-pink-100',
          page: 'prescriptions',
          description: 'Drug prescriptions'
        },
        {
          name: 'Inventory',
          icon: Package,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          hoverColor: 'hover:bg-green-100',
          page: 'inventory',
          description: 'Stock management'
        },
        {
          name: 'Accounting',
          icon: DollarSign,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          hoverColor: 'hover:bg-green-100',
          page: 'accounting',
          description: 'Financial records'
        },
        {
          name: 'Invoices',
          icon: FileText,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          hoverColor: 'hover:bg-amber-100',
          page: 'invoices',
          description: 'Billing & invoices'
        },
        {
          name: 'Staff',
          icon: UserCircle,
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50',
          hoverColor: 'hover:bg-cyan-100',
          page: 'staff',
          description: 'Staff management'
        },
        {
          name: 'Settings',
          icon: SettingsIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          hoverColor: 'hover:bg-gray-100',
          page: 'settings',
          description: 'Clinic settings'
        },
        {
          name: 'Backup & Restore',
          icon: FileText,
          color: 'text-teal-600',
          bgColor: 'bg-teal-50',
          hoverColor: 'hover:bg-teal-100',
          page: 'backup',
          description: 'Data backup'
        },
        {
          name: 'WhatsApp Reminders',
          icon: MessageSquare,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          hoverColor: 'hover:bg-green-100',
          page: 'whatsapp-reminders',
          description: 'Send appointment reminders'
        },
        {
          name: 'WhatsApp Settings',
          icon: MessageSquare,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          hoverColor: 'hover:bg-green-100',
          page: 'whatsapp-settings',
          description: 'Configure WhatsApp integration'
        }
      ];
    }

    if (isDoctor || permissions) {
      if (permissions?.can_view_appointments) {
        cards.push({
          name: 'Appointments',
          icon: Calendar,
          color: 'text-sky-600',
          bgColor: 'bg-sky-50',
          hoverColor: 'hover:bg-sky-100',
          page: 'appointments',
          description: 'Manage appointments'
        });
      }
      if (permissions?.can_view_treatments) {
        cards.push({
          name: 'Treatments',
          icon: Stethoscope,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          hoverColor: 'hover:bg-purple-100',
          page: 'treatments',
          description: 'Treatment history'
        });
      }
      if (isDoctor) {
        cards.push({
          name: 'Prescriptions',
          icon: Pill,
          color: 'text-pink-600',
          bgColor: 'bg-pink-50',
          hoverColor: 'hover:bg-pink-100',
          page: 'prescriptions',
          description: 'Drug prescriptions'
        });
      }
      if (permissions?.can_view_invoices) {
        cards.push({
          name: 'Invoices',
          icon: FileText,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          hoverColor: 'hover:bg-amber-100',
          page: 'invoices',
          description: 'Billing & invoices'
        });
      }
      if (permissions?.can_view_inventory) {
        cards.push({
          name: 'Inventory',
          icon: Package,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          hoverColor: 'hover:bg-green-100',
          page: 'inventory',
          description: 'Stock management'
        });
      }
      if (permissions?.can_view_accounting) {
        cards.push({
          name: 'Accounting',
          icon: DollarSign,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          hoverColor: 'hover:bg-green-100',
          page: 'accounting',
          description: 'Financial records'
        });
      }
      if (permissions?.can_view_staff) {
        cards.push({
          name: 'Staff',
          icon: UserCircle,
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50',
          hoverColor: 'hover:bg-cyan-100',
          page: 'staff',
          description: 'Staff management'
        });
      }
    }

    return cards;
  };

  const moduleCards = getModuleCards();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const subscriptionStatus = (profile as any)?.clinic_subscription_status;
  const subscriptionEndDate = (profile as any)?.clinic_subscription_end;
  const isSubscriptionSuspended = subscriptionStatus === 'suspended' || subscriptionStatus === 'cancelled';
  const isExpired = subscriptionStatus === 'cancelled';

  const bannerTitle = isExpired
    ? (getSetting('expiry_title', t('subscriptionExpired')))
    : (getSetting('suspension_title', t('subscriptionSuspended')));

  const bannerMessage = isExpired
    ? (getSetting('expiry_message', t('subscriptionExpiredMessage')))
    : (getSetting('suspension_message', t('subscriptionSuspendedMessage')));

  const renewalTitle = getSetting('renewal_instructions_title', t('toRenewSubscription'));
  const renewalStep1 = getSetting('renewal_step_1', t('contactSupport'));
  const renewalStep2 = getSetting('renewal_step_2', t('makePayment'));
  const supportEmail = getSetting('support_email', 'support@clinicflow.com');
  const supportPhone = getSetting('support_phone', '+1 (555) 123-4567');

  return (
    <div className="space-y-6 pb-6">
      {isSubscriptionSuspended && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
          <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className={`text-2xl font-bold text-red-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {bannerTitle}
              </h2>
              <p className={`text-red-800 mb-4 text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                {bannerMessage}
              </p>
              <div className="bg-white rounded-lg p-4 mb-4 border border-red-200">
                <h3 className={`font-semibold text-red-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {renewalTitle}
                </h3>
                <ul className={`space-y-2 text-red-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <CheckCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>{renewalStep1}</span>
                  </li>
                  <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Mail className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>{t('email')}: {supportEmail}</span>
                  </li>
                  <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Phone className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>{t('phone')}: {supportPhone}</span>
                  </li>
                  <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <CheckCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>{renewalStep2}</span>
                  </li>
                </ul>
              </div>
              {subscriptionEndDate && (
                <p className={`text-sm text-red-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('subscriptionExpiredOn')}: {new Date(subscriptionEndDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isClinicAdmin && <ClinicAdminDashboard onNavigate={onNavigate} />}

      {!isClinicAdmin && (
      <>
      <header className="rounded-2xl border border-border bg-primary p-5 text-primary-foreground sm:p-6">
        <p className="eyebrow text-primary-foreground/60">{t('clinicDashboard')}</p>
        <h1 className="font-display mt-1 truncate text-2xl font-semibold sm:text-3xl">
          {t('welcome')}, {profile?.full_name}
        </h1>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: t('todaysAppointments'), value: stats.todayAppointments, Icon: Calendar },
          { label: t('totalPatients'), value: stats.totalPatients, Icon: Users },
          { label: t('monthlyRevenue'), value: `${currencySymbol} ${stats.monthlyRevenue.toLocaleString()}`, Icon: TrendingUp },
          { label: t('pendingInvoices'), value: `${currencySymbol} ${stats.pendingPayments.toLocaleString()}`, Icon: DollarSign },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-panel)] sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="eyebrow truncate text-muted-foreground">{label}</p>
                <p className="font-display mt-2 truncate text-xl font-semibold text-foreground sm:text-2xl">{value}</p>
              </div>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Quick actions */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-panel)] sm:p-5">
        <h2 className="eyebrow mb-3 text-muted-foreground">{t('quickActions')}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            (isClinicAdmin || permissions?.can_edit_patients) && { key: 'p', label: t('newPatient'), Icon: UserPlus, action: () => setShowNewPatientModal(true) },
            (isClinicAdmin || permissions?.can_edit_appointments) && { key: 'a', label: t('newAppointment'), Icon: CalendarPlus, action: () => setShowNewAppointmentModal(true) },
            (isClinicAdmin || isDoctor) && { key: 'r', label: t('newPrescription'), Icon: Pill, action: () => setShowNewPrescriptionModal(true) },
            (isClinicAdmin || permissions?.can_edit_treatment_plans || isDoctor) && { key: 't', label: t('newTreatmentPlan'), Icon: ClipboardList, action: () => onNavigate?.('treatment-plans?view=new') },
            isDoctor && { key: 'c', label: t('myCommission'), Icon: DollarSign, action: () => onNavigate?.('my-commission') },
          ]
            .filter(Boolean)
            .map((item: any) => (
              <button
                key={item.key}
                onClick={item.action}
                className="group flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-3 text-start transition hover:border-primary/25 hover:bg-primary/5"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition group-hover:bg-accent group-hover:text-accent-foreground">
                  <item.Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate text-xs font-semibold text-foreground">{item.label}</span>
              </button>
            ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-foreground">{t('recentAppointments')}</h2>
        </div>
        <div className="p-4 sm:p-5">
          {stats.upcomingAppointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {stats.upcomingAppointments.map((appointment: any) => (
                <div
                  key={appointment.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {appointment.patients?.full_name || t('unknownPatient')}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t('dr')} {appointment.users?.full_name || t('unknownDoctor')} ·{' '}
                      {new Date(appointment.appointment_date).toLocaleDateString()}{' '}
                      {new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
                    {t(`status${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      </>
      )}




      <NewPatientModal
        isOpen={showNewPatientModal}
        onClose={() => setShowNewPatientModal(false)}
        onSuccess={() => loadDashboardData()}
      />

      <NewAppointmentModal
        isOpen={showNewAppointmentModal}
        onClose={() => setShowNewAppointmentModal(false)}
        onSuccess={() => loadDashboardData()}
      />

      <NewInvoiceModal
        isOpen={showNewInvoiceModal}
        onClose={() => setShowNewInvoiceModal(false)}
        onSuccess={() => loadDashboardData()}
      />

      <NewPrescriptionModal
        isOpen={showNewPrescriptionModal}
        onClose={() => setShowNewPrescriptionModal(false)}
        onSuccess={() => loadDashboardData()}
      />

      <NewStaffModal
        isOpen={showNewStaffModal}
        onClose={() => setShowNewStaffModal(false)}
        onSuccess={() => loadDashboardData()}
      />
    </div>
  );
}

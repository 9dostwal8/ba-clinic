// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, DollarSign, FileText, Pill, Printer,
  Plus, Search, Clock, CheckCircle, AlertCircle, X, ChevronLeft, ChevronRight, Edit2, MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { NewAppointmentModal } from '../modals/NewAppointmentModal';
import { NewPatientModal } from '../modals/NewPatientModal';
import { openWhatsApp, getWhatsAppMessage } from '../../utils/whatsappHelper';

interface Patient {
  id: string;
  full_name: string;
  full_name_ar?: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  language_preference?: 'en' | 'ar' | 'ku';
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  treatment_plan_id?: string;
  notes?: string;
  patient?: Patient;
  doctor?: { full_name: string; full_name_ar?: string };
  treatment_plan?: {
    id: string;
    treatment_category: string;
    total_cost: number;
    paid_amount: number;
    status: string;
    treatment_types?: {
      id: string;
      name: string;
      name_ar: string | null;
    };
  };
}

interface TreatmentVisit {
  id: string;
  treatment_plan_id: string;
  visit_number: number;
  visit_date: string;
  visit_cost: number;
  payment_received: number;
  payment_status: string;
  procedure_performed?: string;
  patient_id: string;
  patient?: Patient;
  treatment_plan?: {
    treatment_category: string;
    doctor_id: string;
    treatment_types?: {
      id: string;
      name: string;
      name_ar: string | null;
    };
  };
}

interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  created_at: string;
  prescription_date: string;
  diagnosis?: string;
  patient?: Patient;
  doctor?: { full_name: string; full_name_ar?: string };
  prescription_items?: Array<{
    drug_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
}

export function ReceptionistDashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Dashboard stats
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<TreatmentVisit[]>([]);
  const [todayPrescriptions, setTodayPrescriptions] = useState<Prescription[]>([]);
  const [stats, setStats] = useState({
    todayAppointmentsCount: 0,
    pendingPaymentsCount: 0,
    todayPaymentsTotal: 0,
    newPatientsToday: 0
  });

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);

  // Modal state
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [whatsappSettings, setWhatsappSettings] = useState<any>(null);

  useEffect(() => {
    console.log('🔄 ReceptionistDashboard useEffect triggered:', {
      hasProfile: !!profile,
      clinicId: profile?.clinic_id,
      role: profile?.role
    });

    if (profile?.clinic_id) {
      loadDashboardData();
      loadWhatsAppSettings();
    }
  }, [profile?.clinic_id, currentMonth]);

  const loadWhatsAppSettings = async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('enabled, appointment_reminders_enabled')
        .eq('clinic_id', profile.clinic_id)
        .maybeSingle();

      console.log('📱 WhatsApp Settings:', {
        data,
        error,
        clinicId: profile.clinic_id
      });

      if (data) {
        setWhatsappSettings(data);
      } else {
        setWhatsappSettings({ enabled: true, appointment_reminders_enabled: true });
        console.log('📱 Using default WhatsApp settings (enabled)');
      }
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
      setWhatsappSettings({ enabled: true, appointment_reminders_enabled: true });
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const today = new Date().toISOString().split('T')[0];

      console.log('📋 Loading dashboard data for clinic:', profile.clinic_id);
      console.log('📅 Date range:', {
        todayStart: todayStart.toISOString(),
        todayEnd: todayEnd.toISOString()
      });

      // Load clinic currency
      const { data: clinicData } = await supabase
        .from('clinics')
        .select('currency_id, currencies(symbol)')
        .eq('id', profile.clinic_id)
        .single();

      if (clinicData?.currencies) {
        setCurrencySymbol(clinicData.currencies.symbol || '$');
        console.log('💱 Currency loaded:', clinicData.currencies.symbol);
      }

      // Load today's appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(*),
          doctor:users!appointments_doctor_id_fkey(full_name, full_name_ar),
          treatment_plan:treatment_plans(id, treatment_category, total_cost, paid_amount, status, treatment_types(id, name, name_ar))
        `)
        .eq('clinic_id', profile.clinic_id)
        .gte('appointment_date', todayStart.toISOString())
        .lte('appointment_date', todayEnd.toISOString())
        .order('appointment_date');

      if (appointmentsError) {
        console.error('❌ Appointments error:', appointmentsError);
      } else {
        console.log('✅ Appointments loaded:', appointments?.length);
      }

      setTodayAppointments(appointments || []);

      // Load all appointments for the current month for calendar
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

      const { data: monthAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(*),
          doctor:users!appointments_doctor_id_fkey(full_name, full_name_ar),
          treatment_plan:treatment_plans(id, treatment_category, total_cost, paid_amount, status, treatment_types(id, name, name_ar))
        `)
        .eq('clinic_id', profile.clinic_id)
        .gte('appointment_date', firstDayOfMonth.toISOString())
        .lte('appointment_date', lastDayOfMonth.toISOString())
        .order('appointment_date');

      setAllAppointments(monthAppointments || []);
      console.log('📅 Reception Dashboard - Month appointments loaded:', {
        count: monthAppointments?.length,
        month: currentMonth.toLocaleDateString(),
        firstDay: firstDayOfMonth.toISOString(),
        lastDay: lastDayOfMonth.toISOString(),
        sample: monthAppointments?.[0]
      });

      // Set selected date appointments to today's appointments initially
      setSelectedDateAppointments(appointments || []);

      // Load pending payments (visits with unpaid balance)
      const { data: allVisits, error: visitsError } = await supabase
        .from('treatment_visits')
        .select(`
          *,
          patient:patients(*),
          treatment_plan:treatment_plans(treatment_category, doctor_id, treatment_types(id, name, name_ar))
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('visit_date', { ascending: false })
        .limit(100);

      if (visitsError) {
        console.error('❌ Treatment visits error:', visitsError);
      } else {
        console.log('✅ Treatment visits loaded:', allVisits?.length);
      }

      // Filter visits with pending payments (where payment_received < visit_cost)
      const visits = allVisits?.filter(v =>
        (v.payment_received || 0) < (v.visit_cost || 0)
      ) || [];

      console.log('💰 Pending payments:', {
        totalVisits: allVisits?.length,
        pendingVisits: visits.length,
        sampleVisit: visits[0]
      });

      setPendingPayments(visits.slice(0, 20));

      // Load today's prescriptions
      const { data: prescriptions, error: prescriptionError } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patient:patients(*),
          doctor:users!prescriptions_doctor_id_fkey(full_name, full_name_ar),
          prescription_items(*)
        `)
        .eq('clinic_id', profile.clinic_id)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())
        .order('created_at', { ascending: false });

      if (prescriptionError) {
        console.error('❌ Error loading prescriptions:', prescriptionError);
      } else {
        console.log('✅ Prescriptions loaded:', prescriptions?.length, 'prescriptions');
      }

      setTodayPrescriptions(prescriptions || []);

      // Calculate stats
      const { count: newPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', profile.clinic_id)
        .gte('created_at', todayStart.toISOString());

      const todayPayments = visits?.reduce((sum, v) => sum + (v.payment_received || 0), 0) || 0;

      const calculatedStats = {
        todayAppointmentsCount: appointments?.length || 0,
        pendingPaymentsCount: visits?.length || 0,
        todayPaymentsTotal: todayPayments,
        newPatientsToday: newPatients || 0
      };

      console.log('📊 Reception Dashboard Stats:', {
        appointments: calculatedStats.todayAppointmentsCount,
        pendingPayments: calculatedStats.pendingPaymentsCount,
        todayPayments: calculatedStats.todayPaymentsTotal,
        newPatients: calculatedStats.newPatientsToday,
        prescriptions: prescriptions?.length || 0
      });

      setStats(calculatedStats);

    } catch (error: any) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
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

  const getAppointmentsForDate = (date: Date) => {
    return allAppointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate.getFullYear() === date.getFullYear() &&
             aptDate.getMonth() === date.getMonth() &&
             aptDate.getDate() === date.getDate();
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const appointmentsForDate = getAppointmentsForDate(date);
    setSelectedDateAppointments(appointmentsForDate);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
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

  const sendWhatsAppReminder = async (apt: Appointment) => {
    if (!apt.patient?.phone) {
      alert(language === 'ar' ? 'المريض ليس لديه رقم هاتف' : 'Patient has no phone number');
      return;
    }

    if (!profile?.clinic_id) return;

    try {
      const { data: clinic } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', profile.clinic_id)
        .single();

      const patientName = language === 'ar' && apt.patient.full_name_ar
        ? apt.patient.full_name_ar
        : apt.patient.full_name;

      const appointmentDate = new Date(apt.appointment_date);
      const appointmentTime = appointmentDate.toLocaleTimeString(
        apt.patient.language_preference === 'ar' ? 'ar-SA' : 'en-US',
        { hour: '2-digit', minute: '2-digit' }
      );

      const doctorName = apt.doctor?.full_name || apt.doctor?.full_name_ar || 'Doctor';

      const message = await getWhatsAppMessage(
        patientName,
        apt.patient.language_preference || 'en',
        clinic?.name || 'Clinic',
        apt.appointment_date,
        appointmentTime,
        doctorName,
        profile.clinic_id
      );

      openWhatsApp(apt.patient.phone, message);

      await supabase.from('notification_logs').insert({
        clinic_id: profile.clinic_id,
        patient_id: apt.patient_id,
        notification_type: 'whatsapp_direct',
        recipient: apt.patient.phone,
        message_content: message,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      alert(language === 'ar' ? 'تم فتح واتساب' : 'WhatsApp opened');
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      alert(language === 'ar' ? 'خطأ في فتح واتساب' : 'Error opening WhatsApp');
    }
  };

  const renderCalendar = () => {
    const days = getDaysInMonth();
    console.log('🎨 Rendering calendar with', allAppointments.length, 'total appointments for', currentMonth.toLocaleDateString());

    const monthNames = language === 'ar'
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayNames = language === 'ar'
      ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-full">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => handleMonthChange('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-xl font-bold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={() => handleMonthChange('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayAppointments = getAppointmentsForDate(day);
            if (dayAppointments.length > 0) {
              console.log(`Day ${day.getDate()} has ${dayAppointments.length} appointments`, dayAppointments.map(a => a.status));
            }
            const isSelected = selectedDate &&
              day.getDate() === selectedDate.getDate() &&
              day.getMonth() === selectedDate.getMonth();

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                className={`aspect-square p-2 rounded-lg border-2 transition-all hover:border-sky-400 flex flex-col ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50'
                    : 'border-gray-200 hover:bg-gray-50'
                } ${isToday(day) ? 'bg-sky-100 font-bold' : ''}`}
              >
                <div className="text-right text-sm mb-1 w-full">
                  {day.getDate()}
                </div>
                <div className="space-y-1 w-full flex-1">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      className={`h-1.5 w-full rounded-full ${getStatusColor(apt.status)}`}
                    />
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayAppointments.length - 3}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAppointmentsList = () => {
    const dateStr = selectedDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            {language === 'ar' ? 'المواعيد' : 'Appointments'}
          </h3>
          <button
            onClick={() => setShowNewAppointmentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">
              {language === 'ar' ? 'موعد جديد' : 'New Appointment'}
            </span>
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{dateStr}</p>

        {selectedDateAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {language === 'ar' ? 'لا توجد مواعيد في هذا التاريخ' : 'No appointments on this date'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {selectedDateAppointments.map((apt) => {
              const showWhatsAppButton = apt.patient?.phone && whatsappSettings?.enabled && whatsappSettings?.appointment_reminders_enabled;
              console.log('🔍 WhatsApp button check:', {
                appointmentId: apt.id,
                patientPhone: apt.patient?.phone,
                whatsappEnabled: whatsappSettings?.enabled,
                remindersEnabled: whatsappSettings?.appointment_reminders_enabled,
                showButton: showWhatsAppButton
              });
              return (
                  <div
                  key={apt.id}
                  className={`border rounded-lg p-4 transition-all ${
                    apt.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                    apt.status === 'cancelled' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="font-semibold text-gray-900">
                          {new Date(apt.appointment_date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      {apt.status === 'confirmed' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {apt.status === 'cancelled' && (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                    </div>

                    <p className="font-medium text-gray-900 mb-1">
                      {language === 'ar' && apt.patient?.full_name_ar
                        ? apt.patient.full_name_ar
                        : apt.patient?.full_name}
                    </p>

                    <p className="text-sm text-gray-600">
                      {language === 'ar' ? 'الطبيب: ' : 'Doctor: '}
                      {language === 'ar' && apt.doctor?.full_name_ar
                        ? apt.doctor.full_name_ar
                        : apt.doctor?.full_name}
                    </p>

                    {apt.notes && (
                      <p className="text-sm text-gray-500 mt-2 italic">
                        {apt.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      apt.status === 'completed' ? 'bg-sky-100 text-sky-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {apt.status === 'confirmed' ? (language === 'ar' ? 'مؤكد' : 'Confirmed') :
                       apt.status === 'cancelled' ? (language === 'ar' ? 'ملغي' : 'Cancelled') :
                       apt.status === 'completed' ? (language === 'ar' ? 'مكتمل' : 'Completed') :
                       (language === 'ar' ? 'معلق' : 'Scheduled')}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingAppointment(apt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </button>
                      {showWhatsAppButton && (
                        <button
                          onClick={() => sendWhatsAppReminder(apt)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-all active:scale-95"
                          title={language === 'ar' ? 'إرسال تذكير واتساب' : 'Send WhatsApp reminder'}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: language === 'ar' ? 'المواعيد اليوم' : "Today's appointments", value: stats.todayAppointmentsCount, Icon: Calendar, page: 'receptionist-visits' },
          { label: language === 'ar' ? 'المدفوعات المعلقة' : 'Pending payments', value: stats.pendingPaymentsCount, Icon: AlertCircle, page: 'receptionist-payments' },
          { label: language === 'ar' ? 'المدفوعات اليوم' : "Today's payments", value: `${currencySymbol} ${stats.todayPaymentsTotal.toLocaleString()}`, Icon: DollarSign, page: 'receptionist-payments' },
          { label: language === 'ar' ? 'الوصفات اليوم' : 'Prescriptions today', value: todayPrescriptions.length, Icon: Pill, page: 'receptionist-prescriptions' },
        ].map(({ label, value, Icon, page }) => (
          <button
            key={label}
            onClick={() => onNavigate(page)}
            className="rounded-2xl border border-border bg-card p-4 text-start shadow-[var(--shadow-panel)] transition hover:border-primary/25 sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="eyebrow truncate text-muted-foreground">{label}</p>
                <p className="font-display mt-2 truncate text-xl font-semibold text-foreground sm:text-2xl">{value}</p>
              </div>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </button>
        ))}
      </section>

      {/* Calendar and Appointments Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col">{renderCalendar()}</div>
        <div className="flex flex-col">{renderAppointmentsList()}</div>
      </div>
    </div>
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-primary p-5 text-primary-foreground sm:p-6">
        <div className="min-w-0">
          <p className="eyebrow text-primary-foreground/60">
            {language === 'ar' ? 'الاستقبال' : 'Reception'}
          </p>
          <h1 className="font-display mt-1 truncate text-2xl font-semibold sm:text-3xl">
            {language === 'ar' ? 'لوحة الاستقبال' : 'Reception Dashboard'}
          </h1>
        </div>
        <button
          onClick={() => setShowNewPatientModal(true)}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{language === 'ar' ? 'مريض جديد' : 'New Patient'}</span>
        </button>
      </header>


      {renderDashboard()}

      <NewAppointmentModal
        isOpen={showNewAppointmentModal || editingAppointment !== null}
        appointment={editingAppointment}
        onClose={() => {
          setShowNewAppointmentModal(false);
          setEditingAppointment(null);
          loadDashboardData();
        }}
        onSuccess={() => {
          setShowNewAppointmentModal(false);
          setEditingAppointment(null);
          loadDashboardData();
        }}
      />

      <NewPatientModal
        isOpen={showNewPatientModal}
        onClose={() => setShowNewPatientModal(false)}
        onSuccess={() => {
          setShowNewPatientModal(false);
          loadDashboardData();
        }}
      />
    </div>
  );
}

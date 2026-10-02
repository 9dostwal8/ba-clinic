// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../hooks/useCurrency';
import { PatientTreatmentTimeline } from './PatientTreatmentTimeline';
import {
  X,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Droplet,
  AlertTriangle,
  Heart,
  Activity,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Stethoscope,
  Receipt,
  Clipboard
} from 'lucide-react';

interface Patient {
  id: string;
  patient_number: string;
  full_name: string;
  full_name_ar: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  medical_history: string | null;
  allergies: string | null;
  blood_type: string | null;
  has_hepatitis_b: boolean;
  has_hepatitis_c: boolean;
  has_heart_failure: boolean;
  has_stent: boolean;
  has_hypertension: boolean;
  has_diabetes: boolean;
  medical_conditions_notes: string | null;
  created_at: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string | null;
  notes: string | null;
  users: { full_name: string } | null;
}

interface Treatment {
  id: string;
  treatment_date: string;
  description: string | null;
  cost: number;
  tooth_number: string | null;
  notes: string | null;
  treatment_types: { name: string; name_ar: string | null } | null;
  users: { full_name: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  paid_amount: number;
  subtotal: number;
  discount: number;
  payment_status: string;
  invoice_date: string;
  items: any[];
  created_at: string;
}

interface PatientDetailsViewProps {
  patient: Patient;
  onClose: () => void;
}

export function PatientDetailsView({ patient, onClose }: PatientDetailsViewProps) {
  const { t, language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'treatments' | 'invoices' | 'treatment_plans'>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalSpent: 0,
    pendingBalance: 0,
    lastVisit: null as string | null
  });

  useEffect(() => {
    loadPatientData();
  }, [patient.id]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const [appointmentsRes, treatmentsRes, invoicesRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, users!appointments_doctor_id_fkey(full_name)')
          .eq('patient_id', patient.id)
          .order('appointment_date', { ascending: false }),
        supabase
          .from('treatments')
          .select('*, treatment_types(name, name_ar), users!treatments_doctor_id_fkey(full_name)')
          .eq('patient_id', patient.id)
          .order('treatment_date', { ascending: false }),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, paid_amount, subtotal, discount, payment_status, invoice_date, items, created_at')
          .eq('patient_id', patient.id)
          .order('invoice_date', { ascending: false })
      ]);

      if (appointmentsRes.error) console.error('Appointments error:', appointmentsRes.error);
      if (treatmentsRes.error) console.error('Treatments error:', treatmentsRes.error);
      if (invoicesRes.error) console.error('Invoices error:', invoicesRes.error);

      const appointmentsData = appointmentsRes.data || [];
      const treatmentsData = treatmentsRes.data || [];
      const invoicesData = invoicesRes.data || [];

      console.log('Loaded data:', {
        appointments: appointmentsData.length,
        treatments: treatmentsData.length,
        invoices: invoicesData.length,
        sampleAppointment: appointmentsData[0],
        sampleInvoice: invoicesData[0]
      });

      setAppointments(appointmentsData);
      setTreatments(treatmentsData);
      setInvoices(invoicesData);

      const totalSpent = invoicesData.reduce((sum, inv) => {
        const paid = parseFloat(inv.paid_amount?.toString() || '0') || 0;
        return sum + paid;
      }, 0);
      const pendingBalance = invoicesData
        .filter(inv => inv.payment_status !== 'paid')
        .reduce((sum, inv) => {
          const total = parseFloat(inv.total?.toString() || '0') || 0;
          const paid = parseFloat(inv.paid_amount?.toString() || '0') || 0;
          return sum + (total - paid);
        }, 0);

      const completedAppointments = appointmentsData.filter(a => a.status === 'completed');
      const lastVisitDate = completedAppointments.length > 0 ? completedAppointments[0].appointment_date : null;

      console.log('Calculated stats:', {
        totalVisits: completedAppointments.length,
        totalSpent,
        pendingBalance,
        lastVisit: lastVisitDate
      });

      setStats({
        totalVisits: completedAppointments.length,
        totalSpent,
        pendingBalance,
        lastVisit: lastVisitDate
      });
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAnyMedicalCondition = () => {
    return patient.has_hepatitis_b || patient.has_hepatitis_c ||
           patient.has_heart_failure || patient.has_stent ||
           patient.has_hypertension || patient.has_diabetes;
  };

  const getMedicalConditionsBadges = () => {
    const conditions = [];
    if (patient.has_hepatitis_b) conditions.push({ label: 'Hepatitis B', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle });
    if (patient.has_hepatitis_c) conditions.push({ label: 'Hepatitis C', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle });
    if (patient.has_heart_failure) conditions.push({ label: 'Heart Failure', color: 'bg-red-100 text-red-800 border-red-300', icon: Heart });
    if (patient.has_stent) conditions.push({ label: 'Cardiac Stent', color: 'bg-green-100 text-green-800 border-green-300', icon: Activity });
    if (patient.has_hypertension) conditions.push({ label: 'Hypertension', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Activity });
    if (patient.has_diabetes) conditions.push({ label: 'Diabetes', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Droplet });
    return conditions;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: XCircle },
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed', icon: Clock },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      scheduled: { color: 'bg-blue-100 text-blue-800', label: 'Scheduled', icon: Clock }
    };
    return statusConfig[status?.toLowerCase()] || statusConfig.pending;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      unpaid: { color: 'bg-red-100 text-red-800', label: 'Unpaid' },
      partial: { color: 'bg-yellow-100 text-yellow-800', label: 'Partial' }
    };
    return statusConfig[status] || statusConfig.unpaid;
  };

  const calculateAge = () => {
    if (!patient.date_of_birth) return null;
    const today = new Date();
    const birthDate = new Date(patient.date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatCurrency = (amount: number | null | undefined) => {
    const numAmount = parseFloat(amount?.toString() || '0') || 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    try {
      if (typeof timeString !== 'string') return 'N/A';
      return timeString.substring(0, 5);
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-7xl sm:max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold truncate">{patient.full_name}</h2>
              {patient.full_name_ar && (
                <p className="text-sky-100 text-xs sm:text-sm truncate">{patient.full_name_ar}</p>
              )}
              <p className="text-sky-100 text-xs sm:text-sm font-mono">{patient.patient_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition flex-shrink-0 ml-2">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-6 bg-gray-50 border-b overflow-x-auto">
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">{t('total_visits')}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalVisits}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">{t('total_spent')}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(stats.totalSpent)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
                <Receipt className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">{t('pending_balance')}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(stats.pendingBalance)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">{t('last_visit')}</p>
                <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">{stats.lastVisit ? formatDate(stats.lastVisit) : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-b bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 sm:px-6 py-3 sm:py-4 font-semibold transition border-b-2 flex-shrink-0 ${
              activeTab === 'overview'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">{t('overview')}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-3 sm:px-6 py-3 sm:py-4 font-semibold transition border-b-2 flex-shrink-0 ${
              activeTab === 'appointments'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base whitespace-nowrap">{t('appointments')} ({appointments.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('treatments')}
            className={`px-3 sm:px-6 py-3 sm:py-4 font-semibold transition border-b-2 flex-shrink-0 ${
              activeTab === 'treatments'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base whitespace-nowrap">{t('treatments')} ({treatments.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 sm:px-6 py-3 sm:py-4 font-semibold transition border-b-2 flex-shrink-0 ${
              activeTab === 'invoices'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base whitespace-nowrap">{t('invoices')} ({invoices.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('treatment_plans')}
            className={`px-3 sm:px-6 py-3 sm:py-4 font-semibold transition border-b-2 flex-shrink-0 ${
              activeTab === 'treatment_plans'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clipboard className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base whitespace-nowrap">{t('treatment_plans')}</span>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm sm:text-base">{t('loading')}...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
                      <span>{t('personal_information')}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('patient_id')}</label>
                        <p className="text-gray-900 font-mono mt-1">{patient.patient_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('date_of_birth')}</label>
                        <p className="text-gray-900 mt-1">
                          {patient.date_of_birth ? formatDate(patient.date_of_birth) : t('not_provided')}
                          {calculateAge() && <span className="text-gray-500 ml-2">({calculateAge()} {t('years')})</span>}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('gender')}</label>
                        <p className="text-gray-900 mt-1 capitalize">{patient.gender || t('not_specified')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {t('phone')}
                        </label>
                        <p className="text-gray-900 mt-1">{patient.phone || t('not_provided')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {t('email')}
                        </label>
                        <p className="text-gray-900 mt-1 break-all">{patient.email || t('not_provided')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {t('address')}
                        </label>
                        <p className="text-gray-900 mt-1">{patient.address || t('not_provided')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Droplet className="w-4 h-4" />
                          {t('blood_type')}
                        </label>
                        <p className="text-gray-900 mt-1 font-semibold">{patient.blood_type || t('not_specified')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('registration_date')}</label>
                        <p className="text-gray-900 mt-1">{formatDate(patient.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {hasAnyMedicalCondition() && (
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg sm:rounded-xl shadow-sm border-2 border-red-300 p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-bold text-red-900 mb-3 sm:mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                        <span>{t('medical_history')}</span>
                      </h3>
                      <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
                        {getMedicalConditionsBadges().map((condition, idx) => {
                          const ConditionIcon = condition.icon;
                          return (
                            <div key={idx} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold ${condition.color} border-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm`}>
                              <ConditionIcon className="w-3 h-3 sm:w-5 sm:h-5" />
                              <span>{condition.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      {patient.medical_conditions_notes && (
                        <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-red-200">
                          <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-2">{t('additional_notes')}</label>
                          <p className="text-gray-900 whitespace-pre-wrap text-sm sm:text-base">{patient.medical_conditions_notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {patient.medical_history && (
                      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
                          <span>{t('medical_history')}</span>
                        </h3>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{patient.medical_history}</p>
                      </div>
                    )}
                    {patient.allergies && (
                      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                          <span>Allergies</span>
                        </h3>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{patient.allergies}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'appointments' && (
                <div className="space-y-3 sm:space-y-4">
                  {!appointments || appointments.length === 0 ? (
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                      <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                      <p className="text-gray-500 text-base sm:text-lg">{t('no_appointments_yet')}</p>
                    </div>
                  ) : (
                    appointments.map((appointment) => {
                      if (!appointment) return null;
                      try {
                        const statusInfo = getStatusBadge(appointment.status || 'pending');
                        const StatusIcon = statusInfo?.icon || Clock;
                        return (
                          <div key={appointment.id} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition">
                            <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 gap-3">
                              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                <div className="p-2 sm:p-3 bg-sky-100 rounded-lg flex-shrink-0">
                                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 text-base sm:text-lg">{formatDate(appointment.appointment_date)}</p>
                                  <p className="text-gray-500 text-sm sm:text-base">{formatTime(appointment.appointment_time)}</p>
                                </div>
                              </div>
                              <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${statusInfo.color} flex items-center gap-1.5 sm:gap-2 self-start`}>
                                <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{statusInfo.label}</span>
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:pl-16">
                              {appointment.users && (
                                <div>
                                  <label className="text-sm font-medium text-gray-500">{t('doctor')}</label>
                                  <p className="text-gray-900">{appointment.users.full_name || 'N/A'}</p>
                                </div>
                              )}
                              {appointment.reason && (
                                <div>
                                  <label className="text-sm font-medium text-gray-500">{t('reason')}</label>
                                  <p className="text-gray-900">{appointment.reason}</p>
                                </div>
                              )}
                              {appointment.notes && (
                                <div className="sm:col-span-2">
                                  <label className="text-sm font-medium text-gray-500">{t('notes')}</label>
                                  <p className="text-gray-700">{appointment.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error('Error rendering appointment:', error, appointment);
                        return null;
                      }
                    })
                  )}
                </div>
              )}

              {activeTab === 'treatments' && (
                <div className="space-y-3 sm:space-y-4">
                  {treatments.length === 0 ? (
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                      <Stethoscope className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                      <p className="text-gray-500 text-base sm:text-lg">{t('no_treatments_yet')}</p>
                    </div>
                  ) : (
                    treatments.map((treatment) => (
                      <div key={treatment.id} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition">
                        <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 gap-3">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1">
                            <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
                              <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-base sm:text-lg">
                                {language === 'ar' && treatment.treatment_types?.name_ar ? treatment.treatment_types.name_ar : treatment.treatment_types?.name || t('treatment')}
                              </p>
                              <p className="text-gray-500 text-sm sm:text-base">{formatDate(treatment.treatment_date)}</p>
                            </div>
                          </div>
                          <div className="text-right self-start">
                            <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(parseFloat(treatment.cost?.toString() || '0'))}</p>
                            <p className="text-xs sm:text-sm text-gray-500">IQD</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:pl-16">
                          {treatment.users && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">{t('doctor')}</label>
                              <p className="text-gray-900">{treatment.users.full_name}</p>
                            </div>
                          )}
                          {treatment.tooth_number && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">{t('tooth_number')}</label>
                              <p className="text-gray-900 font-mono">{treatment.tooth_number}</p>
                            </div>
                          )}
                          {treatment.description && (
                            <div className="sm:col-span-2">
                              <label className="text-sm font-medium text-gray-500">{t('description')}</label>
                              <p className="text-gray-700">{treatment.description}</p>
                            </div>
                          )}
                          {treatment.notes && (
                            <div className="sm:col-span-2">
                              <label className="text-sm font-medium text-gray-500">Notes</label>
                              <p className="text-gray-700">{treatment.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="space-y-3 sm:space-y-4">
                  {invoices.length === 0 ? (
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                      <Receipt className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                      <p className="text-gray-500 text-base sm:text-lg">{t('no_invoices_yet')}</p>
                    </div>
                  ) : (
                    invoices.map((invoice) => {
                      const statusInfo = getPaymentStatusBadge(invoice.payment_status);
                      const totalAmount = parseFloat(invoice.total?.toString() || '0') || 0;
                      const paidAmount = parseFloat(invoice.paid_amount?.toString() || '0') || 0;
                      const remainingBalance = totalAmount - paidAmount;
                      const isExpanded = expandedInvoiceId === invoice.id;
                      const invoiceItems = invoice.items || [];

                      return (
                        <div key={invoice.id} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                          <div
                            className="p-4 sm:p-6 cursor-pointer"
                            onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice.id)}
                          >
                            <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 gap-3">
                              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                                  <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 text-base sm:text-lg font-mono">{invoice.invoice_number}</p>
                                  <p className="text-gray-500 text-sm sm:text-base">{formatDate(invoice.invoice_date)}</p>
                                </div>
                              </div>
                              <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${statusInfo.color} self-start`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:pl-16">
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-gray-500">{t('total_amount')}</label>
                                <p className="text-gray-900 font-bold text-base sm:text-lg truncate">{formatCurrency(totalAmount)} {currencySymbol}</p>
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-gray-500">{t('paid_amount')}</label>
                                <p className="text-green-600 font-bold text-base sm:text-lg truncate">{formatCurrency(paidAmount)} {currencySymbol}</p>
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-gray-500">{t('balance')}</label>
                                <p className="text-yellow-600 font-bold text-base sm:text-lg truncate">{formatCurrency(remainingBalance)} {currencySymbol}</p>
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-gray-500">{t('invoice_items')}</label>
                                <p className="text-gray-900 text-sm sm:text-base font-semibold">{invoiceItems.length} {t('items')}</p>
                              </div>
                            </div>
                            {invoiceItems.length > 0 && (
                              <div className="sm:pl-16 mt-3">
                                <button className="text-sky-600 hover:text-sky-700 text-sm font-medium flex items-center gap-1">
                                  {isExpanded ? '▼' : '▶'} {isExpanded ? t('hide_items') : t('show_items')}
                                </button>
                              </div>
                            )}
                          </div>

                          {isExpanded && invoiceItems.length > 0 && (
                            <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
                              <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">{t('invoice_items')}:</h4>
                              <div className="space-y-2">
                                {invoiceItems.map((item: any, idx: number) => (
                                  <div key={idx} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900 text-sm sm:text-base">
                                          {item.description || t('treatment')}
                                        </p>
                                        {item.toothNumber && (
                                          <p className="text-xs sm:text-sm text-gray-500">
                                            {t('tooth_number')}: <span className="font-mono">{item.toothNumber}</span>
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 sm:gap-4 text-sm">
                                        <span className="text-gray-600">
                                          {item.quantity} × {formatCurrency(item.unitPrice)}
                                        </span>
                                        <span className="font-bold text-gray-900">
                                          {formatCurrency(item.quantity * item.unitPrice)} {currencySymbol}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {invoice.discount > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-300">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{t('subtotal')}:</span>
                                    <span className="font-semibold">{formatCurrency(invoice.subtotal)} {currencySymbol}</span>
                                  </div>
                                  <div className="flex justify-between text-sm text-yellow-600">
                                    <span>{t('discount')}:</span>
                                    <span>-{formatCurrency(invoice.discount)} {currencySymbol}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'treatment_plans' && (
                <PatientTreatmentTimeline patientId={patient.id} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

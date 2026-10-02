// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { useCurrency } from '../../hooks/useCurrency';
import { useAuth } from '../../contexts/AuthContext';
import { VisitRecordingForm } from './VisitRecordingForm';
import { ToothSelector } from '../ToothSelector';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Eye,
  Edit2,
  FileText,
  X,
  DollarSign,
  AlertTriangle,
  Download,
  Receipt,
  ArrowLeft,
  Lock,
  Unlock
} from 'lucide-react';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { generateCustomInvoicePDF, generateCustomPrescriptionPDF } from '../../utils/customTemplateRenderer';

interface TreatmentPlan {
  id: string;
  patient_id: string;
  doctor_id: string;
  treatment_category: string;
  diagnosis: string;
  diagnosis_ar: string | null;
  total_planned_visits: number;
  completed_visits: number;
  status: string;
  start_date: string;
  completion_date: string | null;
  total_cost: number;
  paid_amount: number;
  payment_locked?: boolean;
  locked_by?: string | null;
  locked_at?: string | null;
  notes: string | null;
  created_at: string;
  patients?: { full_name: string; full_name_ar: string | null; patient_number: string };
  users?: { full_name: string; full_name_ar: string | null };
  procedure_templates?: { template_name: string; template_name_ar: string | null };
  treatment_types?: { id: string; name: string; name_ar: string | null };
}

interface ProcedureTemplate {
  id: string;
  treatment_category: string;
  template_name: string;
  template_name_ar: string | null;
  typical_visits: number;
  visit_workflow: any[];
  clinical_fields: any;
  is_system_template: boolean;
  treatment_type_id?: string | null;
  treatment_types?: {
    id: string;
    name: string;
    name_ar: string | null;
    cost: number;
    duration_minutes: number;
  };
}

interface TreatmentType {
  id: string;
  name: string;
  name_ar: string | null;
  category: string;
  description: string | null;
  description_ar: string | null;
  cost: number;
  duration_minutes: number;
  is_active: boolean;
}

interface Patient {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  patient_number: string;
}

interface TreatmentPlansModuleProps {
  initialView?: 'list' | 'new' | 'details';
  initialFilter?: string;
}

export function TreatmentPlansModule({ initialView = 'list', initialFilter = 'all' }: TreatmentPlansModuleProps = {}) {
  const { t, language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const { user } = useAuth();
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [procedureTemplates, setProcedureTemplates] = useState<ProcedureTemplate[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [currentView, setCurrentView] = useState<'list' | 'new' | 'details'>(initialView);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, templatesRes, treatmentTypesRes, patientsRes] = await Promise.all([
        supabase
          .from('treatment_plans')
          .select(`
            *,
            patients(full_name, full_name_ar, patient_number),
            users!treatment_plans_doctor_id_fkey(full_name, full_name_ar),
            procedure_templates(template_name, template_name_ar),
            treatment_types(id, name, name_ar)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('procedure_templates')
          .select(`
            *,
            treatment_types(id, name, name_ar, cost, duration_minutes)
          `)
          .eq('is_active', true)
          .order('template_name'),
        supabase
          .from('treatment_types')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('patients')
          .select('id, full_name, full_name_ar, patient_number')
          .order('full_name')
      ]);

      if (plansRes.error) throw plansRes.error;
      if (templatesRes.error) throw templatesRes.error;
      if (treatmentTypesRes.error) throw treatmentTypesRes.error;
      if (patientsRes.error) throw patientsRes.error;

      setTreatmentPlans(plansRes.data || []);
      setProcedureTemplates(templatesRes.data || []);
      setTreatmentTypes(treatmentTypesRes.data || []);
      setPatients(patientsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Activity className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    return t(`treatment_category_${category}`) || category;
  };

  const filteredPlans = treatmentPlans.filter(plan => {
    const matchesSearch =
      plan.patients?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.patients?.patient_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const deletePlan = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;

    try {
      const { error } = await supabase
        .from('treatment_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert(t('error_deleting'));
    }
  };

  if (currentView === 'new') {
    return (
      <NewTreatmentPlanPage
        patients={patients}
        templates={procedureTemplates}
        treatmentTypes={treatmentTypes}
        onBack={() => setCurrentView('list')}
        onSuccess={(createdPlan) => {
          setSelectedPlan(createdPlan);
          setCurrentView('record-visit');
          loadData();
        }}
      />
    );
  }

  if (currentView === 'details' && selectedPlan) {
    return (
      <TreatmentPlanDetailsPage
        plan={selectedPlan}
        onBack={() => {
          setCurrentView('list');
          setSelectedPlan(null);
        }}
        onUpdate={loadData}
      />
    );
  }

  if (currentView === 'record-visit' && selectedPlan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                setCurrentView('details');
                loadData();
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('back')}
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('record_visit')}
            </h2>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <VisitRecordingForm
            treatmentPlan={selectedPlan}
            onSuccess={() => {
              setCurrentView('details');
              loadData();
            }}
            onCancel={() => {
              setCurrentView('details');
            }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t('treatment_plans')}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {t('treatment_plans_management')}
          </p>
        </div>
        <button
          onClick={() => setCurrentView('new')}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center justify-center gap-2 w-full sm:w-auto py-3 sm:py-2.5 px-5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>{t('new_treatment_plan')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('search_patients')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('all_status')}</option>
              <option value="planned">{t('status_planned')}</option>
              <option value="in_progress">{t('status_in_progress')}</option>
              <option value="completed">{t('status_completed')}</option>
              <option value="cancelled">{t('status_cancelled')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">{t('total_plans')}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {treatmentPlans.length}
              </p>
            </div>
            <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">{t('status_in_progress')}</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                {treatmentPlans.filter(p => p.status === 'in_progress').length}
              </p>
            </div>
            <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">{t('status_completed')}</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                {treatmentPlans.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">{t('status_planned')}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-600 mt-1">
                {treatmentPlans.filter(p => p.status === 'planned').length}
              </p>
            </div>
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Treatment Plans List - Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('patient')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('treatment_category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('diagnosis')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('visits_progress')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('doctor')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {t('no_treatment_plans_found')}
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {language === 'ar' && plan.patients?.full_name_ar
                              ? plan.patients.full_name_ar
                              : plan.patients?.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{plan.patients?.patient_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {getCategoryLabel(plan.treatment_category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {language === 'ar' && plan.diagnosis_ar
                          ? plan.diagnosis_ar
                          : plan.diagnosis}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(plan.completed_visits / plan.total_planned_visits) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {plan.completed_visits}/{plan.total_planned_visits}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                        {getStatusIcon(plan.status)}
                        {t(`status_${plan.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {language === 'ar' && plan.users?.full_name_ar
                          ? plan.users.full_name_ar
                          : plan.users?.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-1">
                        {plan.status === 'in_progress' && (
                          <button
                            onClick={() => {
                              setSelectedPlan(plan);
                              setCurrentView('record-visit');
                            }}
                            className="text-emerald-600 hover:text-emerald-900 p-1.5 hover:bg-emerald-50 rounded transition-colors"
                            title={t('record_visit')}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setCurrentView('details');
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded transition-colors"
                          title={t('view_details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Treatment Plans List - Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {filteredPlans.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            {t('no_treatment_plans_found')}
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 active:bg-gray-50 transition-colors"
            >
              {/* Patient Info */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {language === 'ar' && plan.patients?.full_name_ar
                        ? plan.patients.full_name_ar
                        : plan.patients?.full_name}
                    </h3>
                    <p className="text-sm text-gray-500">#{plan.patients?.patient_number}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(plan.status)}`}>
                  {getStatusIcon(plan.status)}
                  {t(`status_${plan.status}`)}
                </span>
              </div>

              {/* Treatment Category */}
              <div className="mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  {getCategoryLabel(plan.treatment_category)}
                </span>
              </div>

              {/* Diagnosis */}
              {plan.diagnosis && (
                <div className="mb-3">
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {language === 'ar' && plan.diagnosis_ar ? plan.diagnosis_ar : plan.diagnosis}
                  </p>
                </div>
              )}

              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{t('visits_progress')}</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {plan.completed_visits}/{plan.total_planned_visits}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(plan.completed_visits / plan.total_planned_visits) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Doctor */}
              <div className="mb-3 text-sm text-gray-600">
                <span className="font-medium">{t('doctor')}:</span>{' '}
                {language === 'ar' && plan.users?.full_name_ar
                  ? plan.users.full_name_ar
                  : plan.users?.full_name}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                {plan.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setCurrentView('record-visit');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all font-semibold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {t('record_visit')}
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedPlan(plan);
                    setCurrentView('details');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all font-semibold text-sm"
                >
                  <Eye className="w-4 h-4" />
                  {t('view_details')}
                </button>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 active:bg-red-300 active:scale-95 transition-all"
                  title={t('delete')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

interface NewTreatmentPlanPageProps {
  patients: Patient[];
  templates: ProcedureTemplate[];
  treatmentTypes: TreatmentType[];
  onBack: () => void;
  onSuccess: (createdPlan: any) => void;
}

function NewTreatmentPlanPage({ patients, templates, treatmentTypes, onBack, onSuccess }: NewTreatmentPlanPageProps) {
  const { t, language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    patient_id: '',
    treatment_category: '',
    treatment_type_id: '',
    procedure_template_id: '',
    tooth_numbers: [] as number[],
    total_planned_visits: 1,
    total_cost: 0,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const selectedTreatment = treatmentTypes.find(t => t.id === formData.treatment_type_id);

  useEffect(() => {
    if (selectedTreatment) {
      setFormData(prev => ({
        ...prev,
        treatment_category: selectedTreatment.category,
        total_cost: selectedTreatment.cost
      }));
    }
  }, [selectedTreatment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.treatment_type_id || !formData.treatment_category) {
      alert(t('please_select_treatment_type'));
      return;
    }

    if (!formData.patient_id) {
      alert(t('please_select_patient'));
      return;
    }

    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', userData.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      if (!profileData?.clinic_id) {
        throw new Error('No clinic ID found for user');
      }

      const treatmentPlanData = {
        patient_id: formData.patient_id,
        clinic_id: profileData.clinic_id,
        doctor_id: user?.id,
        procedure_template_id: formData.procedure_template_id && formData.procedure_template_id !== '' ? formData.procedure_template_id : null,
        tooth_numbers: formData.tooth_numbers || [],
        treatment_type_id: formData.treatment_type_id,
        treatment_category: formData.treatment_category,
        total_planned_visits: formData.total_planned_visits || 1,
        total_cost: formData.total_cost || 0,
        notes: formData.notes || null,
        status: 'planned',
        start_date: new Date().toISOString().split('T')[0]
      };

      console.log('Creating treatment plan with data:', treatmentPlanData);

      const { data, error } = await supabase
        .from('treatment_plans')
        .insert(treatmentPlanData)
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      console.log('Treatment plan created successfully:', data);
      onSuccess(data[0]);
    } catch (error: any) {
      console.error('Error creating treatment plan:', error);

      let errorMessage = t('error_saving');
      if (error.message) {
        if (error.message.includes('permission') || error.message.includes('policy')) {
          errorMessage = 'Permission denied. You need "Edit Treatment Plans" permission to create treatment plans.';
        } else if (error.message.includes('not authenticated')) {
          errorMessage = 'You are not authenticated. Please log in again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">{t('back')}</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t('create_treatment_plan')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {t('fill_in_treatment_plan_details')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div>
            <label className="block text-base sm:text-sm font-semibold text-gray-800 mb-2">
              {t('patient')} *
            </label>
            <select
              required
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              className="w-full px-4 py-3.5 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('select_patient')}</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {language === 'ar' && patient.full_name_ar ? patient.full_name_ar : patient.full_name} (#{patient.patient_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base sm:text-sm font-semibold text-gray-800 mb-2">
              {t('treatment_type')} *
            </label>
            <select
              required
              value={formData.treatment_type_id}
              onChange={(e) => setFormData({ ...formData, treatment_type_id: e.target.value })}
              className="w-full px-4 py-3.5 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('select_treatment')}</option>
              {treatmentTypes.map(treatment => (
                <option key={treatment.id} value={treatment.id}>
                  {language === 'ar' && treatment.name_ar ? treatment.name_ar : treatment.name}
                  {' - '}{treatment.cost.toLocaleString()} {t('currency')}
                  {treatment.duration_minutes && ` (${treatment.duration_minutes} ${t('minutes')})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base sm:text-sm font-semibold text-gray-800 mb-3">
              {t('tooth_numbers')}
            </label>
            <ToothSelector
              selectedTeeth={formData.tooth_numbers}
              onChange={(teeth) => setFormData({ ...formData, tooth_numbers: teeth })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-base sm:text-sm font-semibold text-gray-800 mb-2">
                {t('total_planned_visits')} *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.total_planned_visits}
                onChange={(e) => setFormData({ ...formData, total_planned_visits: parseInt(e.target.value) })}
                className="w-full px-4 py-3.5 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-base sm:text-sm font-semibold text-gray-800 mb-2">
                {t('total_cost')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.total_cost}
                onChange={(e) => setFormData({ ...formData, total_cost: parseFloat(e.target.value) })}
                className="w-full px-4 py-3.5 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-base sm:text-sm font-semibold text-gray-800 mb-2">
              {t('notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3.5 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-4 text-base bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-all font-semibold active:scale-95"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-4 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold active:scale-95"
            >
              {saving ? t('saving') : t('create_treatment_plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TreatmentPlanDetailsPageProps {
  plan: TreatmentPlan;
  onBack: () => void;
  onUpdate: () => void;
}

function TreatmentPlanDetailsPage({ plan, onBack, onUpdate }: TreatmentPlanDetailsPageProps) {
  const { t, language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [activeView, setActiveView] = useState<'details' | 'record' | 'edit'>('details');
  const [visits, setVisits] = useState<any[]>([]);
  const [scheduledAppointments, setScheduledAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVisit, setEditingVisit] = useState<any | null>(null);

  useEffect(() => {
    loadVisits();
    loadScheduledAppointments();
  }, [plan.id]);

  const loadVisits = async () => {
    try {
      const { data: visitsData, error } = await supabase
        .from('treatment_visits')
        .select(`
          *,
          users!treatment_visits_doctor_id_fkey(full_name, full_name_ar),
          payment_collector:users!treatment_visits_payment_collected_by_fkey(full_name, full_name_ar),
          invoices!treatment_visits_invoice_id_fkey(
            id,
            invoice_number,
            total,
            paid_amount,
            payment_status
          )
        `)
        .eq('treatment_plan_id', plan.id)
        .order('visit_number', { ascending: true });

      if (error) throw error;

      if (visitsData && visitsData.length > 0) {
        // Try to load commission data for each visit
        const visitsWithCommission = await Promise.all(
          visitsData.map(async (visit) => {
            try {
              const { data: commissionData, error: commissionError } = await supabase
                .rpc('get_visit_commission', { p_visit_id: visit.id });

              if (commissionError) {
                console.error('Error loading commission for visit:', visit.id, commissionError);
                return { ...visit, commission_info: null };
              }

              if (commissionData && commissionData.length > 0) {
                console.log('Commission found for visit:', visit.id, commissionData[0]);
                return {
                  ...visit,
                  commission_info: {
                    commission_amount: commissionData[0].commission_amount,
                    commission_rate: commissionData[0].commission_rate,
                    commission_type: commissionData[0].commission_type
                  }
                };
              }

              return { ...visit, commission_info: null };
            } catch (err) {
              console.error('Exception loading commission for visit:', visit.id, err);
              return { ...visit, commission_info: null };
            }
          })
        );

        console.log('Visits with commission:', visitsWithCommission);
        setVisits(visitsWithCommission);
      } else {
        setVisits([]);
      }
    } catch (error) {
      console.error('Error loading visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduledAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('treatment_plan_id', plan.id)
        .eq('status', 'scheduled')
        .order('visit_number', { ascending: true });

      if (error) throw error;
      setScheduledAppointments(data || []);
    } catch (error) {
      console.error('Error loading scheduled appointments:', error);
    }
  };

  const handleEditVisit = (visit: any) => {
    setEditingVisit(visit);
    setActiveView('edit');
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (!confirm(t('confirm_delete_visit'))) return;

    try {
      const { error } = await supabase
        .from('treatment_visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;

      alert(t('visit_deleted'));
      loadVisits();
      onUpdate();
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert(t('error_deleting'));
    }
  };

  const handleUnlockVisit = async (visitId: string) => {
    if (!confirm(t('unlock_confirmation'))) return;

    try {
      const { data, error } = await supabase.rpc('unlock_treatment_visit', {
        p_visit_id: visitId
      });

      if (error) throw error;

      if (data && !data.success) {
        alert(data.error || t('only_admin_can_unlock'));
        return;
      }

      alert(t('unlocked_successfully'));
      loadVisits();
      onUpdate();
    } catch (error: any) {
      console.error('Error unlocking visit:', error);
      alert(error.message || t('only_admin_can_unlock'));
    }
  };

  const handleLockVisit = async (visitId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من قفل هذه الزيارة؟' : 'Are you sure you want to lock this visit?')) return;

    try {
      const { data, error } = await supabase.rpc('lock_treatment_visit', {
        p_visit_id: visitId
      });

      if (error) throw error;

      if (data && !data.success) {
        alert(data.error || t('only_admin_can_unlock'));
        return;
      }

      alert(language === 'ar' ? 'تم القفل بنجاح' : 'Locked successfully');
      loadVisits();
      onUpdate();
    } catch (error: any) {
      console.error('Error locking visit:', error);
      alert(error.message || t('only_admin_can_unlock'));
    }
  };

  const handleUnlockPlan = async () => {
    if (!confirm(t('unlock_confirmation'))) return;

    try {
      const { data, error } = await supabase.rpc('unlock_treatment_plan', {
        p_plan_id: plan.id
      });

      if (error) throw error;

      if (data && !data.success) {
        alert(data.error || t('only_admin_can_unlock'));
        return;
      }

      alert(t('unlocked_successfully'));
      onUpdate();
    } catch (error: any) {
      console.error('Error unlocking plan:', error);
      alert(error.message || t('only_admin_can_unlock'));
    }
  };

  const handleLockPlan = async () => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من قفل هذه الخطة؟' : 'Are you sure you want to lock this plan?')) return;

    try {
      const { data, error } = await supabase.rpc('lock_treatment_plan', {
        p_plan_id: plan.id
      });

      if (error) throw error;

      if (data && !data.success) {
        alert(data.error || t('only_admin_can_unlock'));
        return;
      }

      alert(language === 'ar' ? 'تم القفل بنجاح' : 'Locked successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Error locking plan:', error);
      alert(error.message || t('only_admin_can_unlock'));
    }
  };

  const handleDownloadInvoice = async (visit: any) => {
    if (!visit.invoice_id) {
      alert(t('no_invoice_for_visit'));
      return;
    }

    try {
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          patients(full_name, full_name_ar, phone, address),
          clinics(name, name_ar, address, phone, email, logo_url),
          users!invoices_doctor_id_fkey(full_name, full_name_ar)
        `)
        .eq('id', visit.invoice_id)
        .single();

      if (error) throw error;

      const items = Array.isArray(invoiceData.items)
        ? invoiceData.items.map((item: any) => ({
            description: item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.price || 0,
            total: item.total || 0
          }))
        : [];

      const pdfData = {
        invoiceNumber: invoiceData.invoice_number,
        invoiceDate: invoiceData.invoice_date,
        clinicName: invoiceData.clinics?.name || '',
        clinicNameAr: invoiceData.clinics?.name_ar,
        clinicAddress: invoiceData.clinics?.address,
        clinicPhone: invoiceData.clinics?.phone,
        clinicLogo: invoiceData.clinics?.logo_url,
        patientName: invoiceData.patients?.full_name || '',
        patientNameAr: invoiceData.patients?.full_name_ar,
        patientPhone: invoiceData.patients?.phone,
        doctorName: invoiceData.users?.full_name,
        doctorNameAr: invoiceData.users?.full_name_ar,
        items: items,
        subtotal: Number(invoiceData.subtotal) || 0,
        tax: Number(invoiceData.tax) || 0,
        discount: Number(invoiceData.discount) || 0,
        total: Number(invoiceData.total) || 0,
        paidAmount: Number(invoiceData.paid_amount) || 0,
        remainingAmount: Number(invoiceData.total || 0) - Number(invoiceData.paid_amount || 0)
      };

      const { data: hasCustomTemplate } = await supabase
        .from('document_templates')
        .select('id')
        .eq('clinic_id', invoiceData.clinic_id)
        .eq('template_type', 'invoice')
        .eq('use_custom_template', true)
        .maybeSingle();

      if (hasCustomTemplate) {
        await generateCustomInvoicePDF(invoiceData.clinic_id, pdfData);
      } else {
        generateInvoicePDF(pdfData);
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert(t('error_downloading_invoice'));
    }
  };

  const handleDownloadPrescription = async (visit: any) => {
    if (!visit.prescription_id) {
      alert(t('no_prescription_for_visit'));
      return;
    }

    try {
      const { data: prescriptionItems, error: itemsError } = await supabase
        .from('prescription_items')
        .select('*')
        .eq('prescription_id', visit.prescription_id);

      if (itemsError) throw itemsError;

      if (!prescriptionItems || prescriptionItems.length === 0) {
        alert(t('no_medications_in_prescription'));
        return;
      }

      const { data: prescriptionData, error: prescError } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients(full_name, full_name_ar),
          users!prescriptions_doctor_id_fkey(full_name, full_name_ar),
          clinics(name, name_ar, address, phone, logo_url)
        `)
        .eq('id', visit.prescription_id)
        .single();

      if (prescError) throw prescError;

      await generateCustomPrescriptionPDF(prescriptionData.clinic_id, {
        clinicName: prescriptionData.clinics?.name || '',
        clinicAddress: prescriptionData.clinics?.address || '',
        clinicPhone: prescriptionData.clinics?.phone || '',
        doctorName: prescriptionData.users?.full_name || 'Doctor',
        patientName: prescriptionData.patients?.full_name || '',
        prescriptionDate: prescriptionData.prescription_date || visit.visit_date,
        medications: prescriptionItems.map(item => ({
          name: item.drug_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || ''
        })),
        instructions: prescriptionData.notes || visit.next_visit_notes || ''
      });
    } catch (error) {
      console.error('Error downloading prescription:', error);
      alert(t('error_downloading_prescription'));
    }
  };

  const getCategoryLabel = (category: string) => {
    return t(`treatment_category_${category}`) || category;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVisitColorScheme = (visitNumber: number) => {
    const colors = [
      { badge: 'from-blue-500 to-blue-600', border: 'border-blue-200', bg: 'bg-blue-50', cardBg: 'bg-blue-50/30', label: 'bg-blue-100 text-blue-800' },
      { badge: 'from-green-500 to-green-600', border: 'border-green-200', bg: 'bg-green-50', cardBg: 'bg-green-50/30', label: 'bg-green-100 text-green-800' },
      { badge: 'from-purple-500 to-purple-600', border: 'border-purple-200', bg: 'bg-purple-50', cardBg: 'bg-purple-50/30', label: 'bg-purple-100 text-purple-800' },
      { badge: 'from-green-500 to-green-600', border: 'border-green-200', bg: 'bg-green-50', cardBg: 'bg-green-50/30', label: 'bg-green-100 text-green-800' },
      { badge: 'from-pink-500 to-pink-600', border: 'border-pink-200', bg: 'bg-pink-50', cardBg: 'bg-pink-50/30', label: 'bg-pink-100 text-pink-800' },
      { badge: 'from-indigo-500 to-indigo-600', border: 'border-indigo-200', bg: 'bg-indigo-50', cardBg: 'bg-indigo-50/30', label: 'bg-indigo-100 text-indigo-800' },
      { badge: 'from-teal-500 to-teal-600', border: 'border-teal-200', bg: 'bg-teal-50', cardBg: 'bg-teal-50/30', label: 'bg-teal-100 text-teal-800' },
      { badge: 'from-red-500 to-red-600', border: 'border-red-200', bg: 'bg-red-50', cardBg: 'bg-red-50/30', label: 'bg-red-100 text-red-800' },
      { badge: 'from-cyan-500 to-cyan-600', border: 'border-cyan-200', bg: 'bg-cyan-50', cardBg: 'bg-cyan-50/30', label: 'bg-cyan-100 text-cyan-800' },
      { badge: 'from-amber-500 to-amber-600', border: 'border-green-200', bg: 'bg-amber-50', cardBg: 'bg-amber-50/30', label: 'bg-amber-100 text-amber-800' }
    ];
    return colors[(visitNumber - 1) % colors.length];
  };

  if (activeView === 'record') {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('details')}
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">{t('back')}</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t('record_visit')}
            </h2>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <VisitRecordingForm
            treatmentPlan={plan}
            onSuccess={() => {
              setActiveView('details');
              loadVisits();
              onUpdate();
            }}
            onCancel={() => setActiveView('details')}
          />
        </div>
      </div>
    );
  }

  if (activeView === 'edit' && editingVisit) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveView('details');
              setEditingVisit(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">{t('back')}</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t('edit_visit')}
            </h2>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <VisitRecordingForm
            treatmentPlan={plan}
            existingVisit={editingVisit}
            onSuccess={() => {
              setActiveView('details');
              setEditingVisit(null);
              loadVisits();
              onUpdate();
            }}
            onCancel={() => {
              setActiveView('details');
              setEditingVisit(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-3 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/70 rounded-lg transition-colors font-medium text-gray-700 hover:text-gray-900 flex-shrink-0 bg-white/40"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">{t('back')}</span>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  {getCategoryLabel(plan.treatment_category)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                  plan.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {t(`status_${plan.status}`)}
                </span>
                <div className="flex items-center gap-2">
                  {plan.payment_locked ? (
                    <>
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {t('payment_locked')}
                      </span>
                      <button
                        onClick={handleUnlockPlan}
                        className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-full text-sm font-medium flex items-center gap-1 transition-colors"
                        title={t('unlock_plan')}
                      >
                        <Unlock className="w-3 h-3" />
                        {t('unlock_plan')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleLockPlan}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium flex items-center gap-1 transition-colors"
                      title={language === 'ar' ? 'قفل الخطة' : 'Lock Plan'}
                    >
                      <Lock className="w-3 h-3" />
                      {language === 'ar' ? 'قفل' : 'Lock'}
                    </button>
                  )}
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {getCategoryLabel(plan.treatment_category)}
                {plan.tooth_numbers && plan.tooth_numbers.length > 0 && ` - ${t('teeth')}: ${plan.tooth_numbers.join(', ')}`}
              </h3>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{language === 'ar' && plan.patients?.full_name_ar ? plan.patients.full_name_ar : plan.patients?.full_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(plan.start_date)}</span>
                </div>
                {plan.tooth_numbers && plan.tooth_numbers.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{t('teeth')}:</span>
                    <span>{plan.tooth_numbers.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
          {/* Progress Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 sm:p-6 mb-5 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h4 className="text-lg sm:text-xl font-bold text-gray-900">{t('treatment_progress')}</h4>
              {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                <button
                  onClick={() => setActiveView('record')}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-base flex items-center justify-center gap-2 py-3.5 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold w-full sm:w-auto active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  <span>{t('record_visit')}</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 sm:p-4">
                <div className="text-sm sm:text-sm text-gray-600 font-medium">{t('total_visits')}</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{plan.total_planned_visits}</div>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-4">
                <div className="text-sm sm:text-sm text-gray-600 font-medium">{t('completed_visits')}</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{plan.completed_visits}</div>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-4">
                <div className="text-sm sm:text-sm text-gray-600 font-medium">{t('total_cost')}</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{plan.total_cost} {t('currency')}</div>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-4">
                <div className="text-sm sm:text-sm text-gray-600 font-medium">{t('paid')}</div>
                <div className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{plan.paid_amount} {t('currency')}</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all"
                style={{ width: `${(plan.completed_visits / plan.total_planned_visits) * 100}%` }}
              />
            </div>
          </div>

          {/* Visits Timeline */}
          <div>
            <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              {t('visit_history')}
            </h4>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : visits.length === 0 ? (
              <div className="text-center py-10 sm:py-12 bg-gray-50 rounded-lg">
                <FileText className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 mx-auto mb-4 sm:mb-5" />
                <p className="text-base sm:text-lg text-gray-600 mb-5">{t('no_visits_recorded_yet')}</p>
                <button
                  onClick={() => setActiveView('record')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3.5 text-base rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {t('record_first_visit')}
                </button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {visits.map((visit, index) => {
                  const colorScheme = getVisitColorScheme(visit.visit_number);
                  return (
                  <div key={visit.id} className={`${colorScheme.cardBg} border-2 ${colorScheme.border} rounded-xl p-4 sm:p-5 shadow-sm`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="relative">
                          <div className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${colorScheme.badge} text-white rounded-xl flex items-center justify-center font-black shadow-lg text-xl sm:text-2xl`}>
                            {visit.visit_number}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${colorScheme.label} rounded-full flex items-center justify-center text-xs font-bold shadow-md`}>
                            #{index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 ${colorScheme.label} rounded-full text-xs font-bold uppercase tracking-wide`}>
                              {t('visit')} {visit.visit_number}
                            </span>
                          </div>
                          <h5 className="font-bold text-gray-900 text-base sm:text-lg mb-2">
                            {language === 'ar' && visit.procedure_performed_ar
                              ? visit.procedure_performed_ar
                              : visit.procedure_performed}
                          </h5>
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(visit.visit_date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span>{visit.duration_minutes} {t('minutes')}</span>
                            </div>
                            {visit.tooth_numbers && visit.tooth_numbers.length > 0 && (
                              <div className="text-sm font-medium">{t('teeth')}: {visit.tooth_numbers.join(', ')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <div className="flex items-center gap-2">
                          {visit.payment_locked ? (
                            <>
                              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-green-200 rounded-lg">
                                <Lock className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-medium text-amber-700">
                                  {t('locked_paid_fully')}
                                </span>
                              </div>
                              <button
                                onClick={() => handleUnlockVisit(visit.id)}
                                className="p-3 text-green-600 hover:bg-green-50 rounded-lg transition-colors active:scale-95"
                                title={t('unlock_visit')}
                              >
                                <Unlock className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleLockVisit(visit.id)}
                                className="p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors active:scale-95"
                                title={language === 'ar' ? 'قفل الزيارة' : 'Lock Visit'}
                              >
                                <Lock className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleEditVisit(visit)}
                                className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95"
                                title={t('edit')}
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteVisit(visit.id)}
                                className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                                title={t('delete')}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap ${
                          visit.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {t(`status_${visit.status}`)}
                        </span>
                      </div>
                    </div>

                    {visit.next_visit_notes && (
                      <div className="mt-4 bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-700 mb-1">{t('visit_notes')}</div>
                            <div className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">{visit.next_visit_notes}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {visit.complications && (
                      <div className="mt-4 bg-green-50 rounded-lg p-4 border-l-4 border-orange-500 shadow-sm">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-700 mb-1">{t('complications')}</div>
                            <div className="text-base text-gray-900 leading-relaxed">{visit.complications}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t-2 border-gray-200 pt-4">
                      <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-sm sm:text-base">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-700 font-medium">{t('cost')}:</span>
                          <span className="font-bold text-gray-900">{visit.visit_cost} {t('currency')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-gray-700 font-medium">{t('paid')}:</span>
                          <span className="font-bold text-green-600">{visit.payment_received} {t('currency')}</span>
                        </div>
                        {visit.invoices && (
                          <div className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-blue-500" />
                            <span className="text-gray-700 font-medium">{t('invoice')}:</span>
                            <span className="font-bold text-blue-600">{visit.invoices.invoice_number}</span>
                          </div>
                        )}
                        {visit.payment_locked && visit.payment_collector && (
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-700 text-sm font-medium">
                              {language === 'ar' ? 'تم التحصيل بواسطة:' : 'Collected by:'}
                            </span>
                            <span className="font-bold text-blue-900 text-sm">
                              {language === 'ar' && visit.payment_collector.full_name_ar
                                ? visit.payment_collector.full_name_ar
                                : visit.payment_collector.full_name}
                            </span>
                            {visit.payment_collected_at && (
                              <span className="text-xs text-blue-600">
                                ({new Date(visit.payment_collected_at).toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}
                        {(() => {
                          console.log('Visit ID:', visit.id, 'Commission info:', visit.commission_info);
                          if (visit.commission_info) {
                            const amount = Number(visit.commission_info.commission_amount) || 0;
                            const rate = Number(visit.commission_info.commission_rate) || 0;

                            if (amount > 0) {
                              return (
                                <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                                  <DollarSign className="w-5 h-5 text-purple-600" />
                                  <span className="text-purple-700 font-medium">{t('commission')}:</span>
                                  <span className="font-bold text-purple-900">
                                    {amount.toFixed(2)} {t('currency')}
                                    {visit.commission_info.commission_type === 'percentage' && rate > 0 && (
                                      <span className="text-sm text-purple-600 ml-1">({rate}%)</span>
                                    )}
                                  </span>
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {visit.invoice_id && (
                          <button
                            onClick={() => handleDownloadInvoice(visit)}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all text-base font-semibold active:scale-95"
                          >
                            <Download className="w-5 h-5" />
                            {t('download_invoice')}
                          </button>
                        )}
                        {visit.prescription_id && (
                          <button
                            onClick={() => handleDownloadPrescription(visit)}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all text-base font-semibold active:scale-95"
                          >
                            <Download className="w-5 h-5" />
                            {t('download_prescription')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* Scheduled Appointments */}
            {scheduledAppointments.length > 0 && (
              <div className="mt-6">
                <h5 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  {t('scheduled_appointments')}
                </h5>
                <div className="space-y-3">
                  {scheduledAppointments.map((appointment) => (
                    <div key={appointment.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                            {appointment.visit_number}
                          </div>
                          <div>
                            <h6 className="font-semibold text-gray-900">
                              {t('visit')} {appointment.visit_number} - {t('scheduled')}
                            </h6>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(appointment.appointment_date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(appointment.appointment_date).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                            {appointment.notes && (
                              <p className="text-xs text-gray-600 mt-2">{appointment.notes}</p>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                          {t('scheduled')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {plan.notes && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="font-semibold text-yellow-900 mb-2">{t('notes')}:</div>
              <div className="text-yellow-800">{plan.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

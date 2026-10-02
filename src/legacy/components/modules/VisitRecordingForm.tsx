// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatNumber } from '../../utils/numberFormatter';
import {
  Calendar,
  Clock,
  FileText,
  DollarSign,
  AlertTriangle,
  Save,
  X,
  Plus,
  Trash2,
  Upload,
  CheckCircle,
  Pill,
  Search
} from 'lucide-react';

interface TreatmentPlan {
  id: string;
  patient_id: string;
  treatment_category: string;
  total_planned_visits: number;
  completed_visits: number;
  procedure_template_id: string | null;
  tooth_numbers: string[];
  treatment_types?: { id: string; name: string; name_ar: string | null };
}

interface ProcedureTemplate {
  id: string;
  visit_workflow: VisitWorkflow[];
  clinical_fields: Record<string, ClinicalField>;
}

interface VisitWorkflow {
  visit: number;
  title: string;
  title_ar: string;
  procedures: string[];
}

interface ClinicalField {
  type: 'text' | 'number' | 'select' | 'boolean' | 'date';
  label: string;
  label_ar: string;
  options?: string[];
}

interface TreatmentVisit {
  id?: string;
  treatment_plan_id: string;
  visit_number: number;
  visit_date: string;
  visit_type: string;
  procedure_performed: string;
  procedure_performed_ar: string;
  clinical_data: Record<string, any>;
  tooth_numbers: string[];
  duration_minutes: number;
  complications: string;
  next_visit_notes: string;
  visit_cost: number;
  payment_received: number;
  status: string;
}

interface Medication {
  id: string;
  name: string;
  name_ar: string;
  generic_name: string;
  dosage_form: string;
  strength: string;
  common_dosages: any[];
}

interface PrescriptionItem {
  medication_id?: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface VisitRecordingFormProps {
  treatmentPlan: TreatmentPlan;
  existingVisit?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VisitRecordingForm({ treatmentPlan, existingVisit, onSuccess, onCancel }: VisitRecordingFormProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [template, setTemplate] = useState<ProcedureTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextVisitNumber, setNextVisitNumber] = useState(1);
  const [scheduleNextVisit, setScheduleNextVisit] = useState(false);
  const [nextAppointmentDate, setNextAppointmentDate] = useState('');
  const [nextAppointmentTime, setNextAppointmentTime] = useState('09:00');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showMedicationLibrary, setShowMedicationLibrary] = useState(false);
  const [medicationSearchTerm, setMedicationSearchTerm] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [roleLoading, setRoleLoading] = useState(true);

  const [formData, setFormData] = useState<TreatmentVisit>({
    treatment_plan_id: treatmentPlan.id,
    visit_number: 1,
    visit_date: new Date().toISOString().split('T')[0],
    visit_type: 'scheduled',
    procedure_performed: '',
    procedure_performed_ar: '',
    clinical_data: {},
    tooth_numbers: treatmentPlan.tooth_numbers || [],
    duration_minutes: 30,
    complications: '',
    next_visit_notes: '',
    visit_cost: 0,
    payment_received: 0,
    status: 'completed'
  });

  useEffect(() => {
    const initializeForm = async () => {
      await loadUserRole();
      if (existingVisit) {
        setFormData({
          ...existingVisit,
          visit_date: existingVisit.visit_date.split('T')[0]
        });
        setNextVisitNumber(existingVisit.visit_number);
        loadExistingPrescription();
      }
      loadTemplateAndVisits();
      loadMedications();
    };
    initializeForm();
  }, [treatmentPlan.id, existingVisit]);

  const loadUserRole = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userData.user?.id)
        .single();

      if (profileData) {
        console.log('User role loaded:', profileData.role);
        setUserRole(profileData.role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    } finally {
      setRoleLoading(false);
    }
  };

  const loadMedications = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', userData.user?.id)
        .single();

      if (profileData) {
        setUserRole(profileData.role);
      }

      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .or(`is_global.eq.true,clinic_id.eq.${profileData?.clinic_id}`)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const loadExistingPrescription = async () => {
    if (!existingVisit?.prescription_id) return;

    try {
      const { data, error } = await supabase
        .from('prescription_items')
        .select('*')
        .eq('prescription_id', existingVisit.prescription_id);

      if (error) throw error;
      if (data) {
        setPrescriptionItems(data.map(item => ({
          medication_id: item.medication_id,
          drug_name: item.drug_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || ''
        })));
      }
    } catch (error) {
      console.error('Error loading prescription:', error);
    }
  };

  const loadTemplateAndVisits = async () => {
    try {
      setLoading(true);

      if (!existingVisit) {
        const { data: nextNum } = await supabase
          .rpc('get_next_visit_number', { plan_id: treatmentPlan.id });

        setNextVisitNumber(nextNum || 1);
        setFormData(prev => ({ ...prev, visit_number: nextNum || 1 }));
      }

      if (treatmentPlan.procedure_template_id) {
        const { data: templateData, error } = await supabase
          .from('procedure_templates')
          .select('visit_workflow, clinical_fields')
          .eq('id', treatmentPlan.procedure_template_id)
          .single();

        if (error) throw error;
        setTemplate(templateData);

        if (!existingVisit) {
          const currentVisitWorkflow = templateData.visit_workflow?.find(
            (w: VisitWorkflow) => w.visit === (nextVisitNumber || 1)
          );

          if (currentVisitWorkflow) {
            setFormData(prev => ({
              ...prev,
              procedure_performed: currentVisitWorkflow.title,
              procedure_performed_ar: currentVisitWorkflow.title_ar
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentWorkflow = template?.visit_workflow?.find(
    w => w.visit === formData.visit_number
  );

  const handleClinicalDataChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      clinical_data: {
        ...prev.clinical_data,
        [fieldName]: value
      }
    }));
  };

  const addMedicationFromLibrary = (medication: Medication) => {
    const commonDosage = medication.common_dosages?.[0] || {};
    const newItem: PrescriptionItem = {
      medication_id: medication.id,
      drug_name: medication.name,
      dosage: medication.strength || '',
      frequency: commonDosage.dosage || '',
      duration: commonDosage.duration || '',
      instructions: ''
    };
    setPrescriptionItems([...prescriptionItems, newItem]);
    setShowMedicationLibrary(false);
  };

  const addManualMedication = () => {
    setPrescriptionItems([...prescriptionItems, {
      drug_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    }]);
  };

  const removeMedicationItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const updateMedicationItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...prescriptionItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setPrescriptionItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', userData.user?.id)
        .single();

      const clinicId = profileData?.clinic_id;

      let invoiceId = null;
      let prescriptionId = null;

      console.log('Saving visit with prescription items:', prescriptionItems);

      if (prescriptionItems.length > 0) {
        if (existingVisit?.prescription_id) {
          await supabase
            .from('prescription_items')
            .delete()
            .eq('prescription_id', existingVisit.prescription_id);

          const { error: prescriptionError } = await supabase
            .from('prescriptions')
            .update({
              prescription_date: formData.visit_date,
              diagnosis: formData.procedure_performed,
              notes: formData.next_visit_notes
            })
            .eq('id', existingVisit.prescription_id);

          if (prescriptionError) throw prescriptionError;

          const itemsToInsert = prescriptionItems.map(item => ({
            prescription_id: existingVisit.prescription_id,
            medication_id: item.medication_id,
            drug_name: item.drug_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions
          }));

          const { error: itemsError } = await supabase
            .from('prescription_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
          prescriptionId = existingVisit.prescription_id;
        } else {
          const { data: newPrescription, error: prescriptionError } = await supabase
            .from('prescriptions')
            .insert({
              clinic_id: clinicId,
              doctor_id: user?.id,
              patient_id: treatmentPlan.patient_id,
              prescription_date: formData.visit_date,
              diagnosis: formData.procedure_performed,
              notes: formData.next_visit_notes
            })
            .select()
            .single();

          if (prescriptionError) throw prescriptionError;
          prescriptionId = newPrescription.id;
          console.log('Created new prescription with ID:', prescriptionId);

          const itemsToInsert = prescriptionItems.map(item => ({
            prescription_id: newPrescription.id,
            medication_id: item.medication_id,
            drug_name: item.drug_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions
          }));

          console.log('Inserting prescription items:', itemsToInsert);

          const { error: itemsError } = await supabase
            .from('prescription_items')
            .insert(itemsToInsert);

          if (itemsError) {
            console.error('Error inserting prescription items:', itemsError);
            throw itemsError;
          }
          console.log('Successfully inserted prescription items');
        }
      }

      const isDentist = userRole === 'dentist';

      if (!isDentist && formData.payment_received > 0) {
        const { data: lastInvoice } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastNumber = lastInvoice?.invoice_number
          ? parseInt(lastInvoice.invoice_number.replace(/\D/g, '')) || 0
          : 0;
        const newInvoiceNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`;

        // Use treatment type name instead of procedure_performed for invoice description
        let treatmentName = '';
        if (treatmentPlan.treatment_types) {
          treatmentName = language === 'ar' && treatmentPlan.treatment_types.name_ar
            ? treatmentPlan.treatment_types.name_ar
            : treatmentPlan.treatment_types.name;
        }

        // Fallback to procedure_performed if no treatment type
        if (!treatmentName) {
          treatmentName = language === 'ar' && formData.procedure_performed_ar
            ? formData.procedure_performed_ar
            : formData.procedure_performed;
        }

        const invoiceItems = [{
          description: `${treatmentName} - V${formData.visit_number}`,
          quantity: 1,
          price: formData.visit_cost,
          total: formData.visit_cost
        }];

        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            clinic_id: clinicId,
            patient_id: treatmentPlan.patient_id,
            doctor_id: user?.id,
            invoice_number: newInvoiceNumber,
            invoice_date: new Date(formData.visit_date).toISOString(),
            items: invoiceItems,
            subtotal: formData.visit_cost,
            tax: 0,
            discount: 0,
            total: formData.visit_cost,
            paid_amount: formData.payment_received,
            payment_status: formData.payment_received >= formData.visit_cost ? 'paid' : 'partial',
            payment_method: 'cash',
            notes: `${t('treatment_plan')}: ${treatmentPlan.treatment_category}`,
            created_by: user?.id
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoiceId = invoiceData.id;
      }

      if (existingVisit) {
        const updateData = {
          visit_number: formData.visit_number,
          visit_date: new Date(formData.visit_date).toISOString(),
          visit_type: formData.visit_type,
          procedure_performed: formData.procedure_performed,
          procedure_performed_ar: formData.procedure_performed_ar,
          clinical_data: formData.clinical_data,
          tooth_numbers: formData.tooth_numbers,
          duration_minutes: formData.duration_minutes,
          complications: formData.complications,
          next_visit_notes: formData.next_visit_notes,
          visit_cost: formData.visit_cost,
          payment_received: formData.payment_received,
          status: formData.status,
          prescription_id: prescriptionId
        };

        const { error } = await supabase
          .from('treatment_visits')
          .update(updateData)
          .eq('id', existingVisit.id);

        if (error) throw error;
        alert(t('visit_updated'));
      } else {
        const { error } = await supabase
          .from('treatment_visits')
          .insert({
            ...formData,
            clinic_id: clinicId,
            patient_id: treatmentPlan.patient_id,
            doctor_id: user?.id,
            created_by: user?.id,
            invoice_id: invoiceId,
            prescription_id: prescriptionId,
            visit_date: new Date(formData.visit_date).toISOString()
          });

        console.log('Saved visit with prescription_id:', prescriptionId);
        if (error) throw error;
        alert(t('visit_recorded_invoice_generated'));
      }

      if (scheduleNextVisit && nextAppointmentDate && formData.visit_number < treatmentPlan.total_planned_visits) {
        const appointmentDateTime = new Date(`${nextAppointmentDate}T${nextAppointmentTime}`);

        const nextVisitNum = formData.visit_number + 1;
        const nextVisitWorkflow = template?.visit_workflow?.find(w => w.visit === nextVisitNum);

        const appointmentNotes = nextVisitWorkflow
          ? (language === 'ar' && nextVisitWorkflow.title_ar ? nextVisitWorkflow.title_ar : nextVisitWorkflow.title)
          : `${t('visit')} ${nextVisitNum}`;

        const appointmentData = {
          clinic_id: clinicId,
          patient_id: treatmentPlan.patient_id,
          doctor_id: user?.id,
          treatment_plan_id: treatmentPlan.id,
          visit_number: nextVisitNum,
          appointment_date: appointmentDateTime.toISOString(),
          duration_minutes: formData.duration_minutes || 30,
          status: 'scheduled',
          appointment_type: 'followup',
          notes: `${t('treatment_plan')}: ${treatmentPlan.treatment_category} - ${appointmentNotes}`,
          created_by: user?.id,
          reminder_sent: false
        };

        console.log('Creating appointment with data:', appointmentData);

        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert(appointmentData);

        if (appointmentError) {
          console.error('Error creating appointment:', appointmentError);
          alert(`${t('visit_saved_but_appointment_failed')}: ${appointmentError.message}`);
        } else {
          alert(t('visit_recorded_and_next_appointment_scheduled'));
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving visit:', error);
      alert(error.message || t('error_saving'));
    } finally {
      setSaving(false);
    }
  };

  const renderClinicalField = (fieldName: string, field: ClinicalField) => {
    const label = language === 'ar' ? field.label_ar : field.label;
    const value = formData.clinical_data[fieldName];

    switch (field.type) {
      case 'text':
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleClinicalDataChange(fieldName, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      case 'number':
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <input
              type="number"
              step="0.1"
              value={value || ''}
              onChange={(e) => handleClinicalDataChange(fieldName, parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      case 'select':
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <select
              value={value || ''}
              onChange={(e) => handleClinicalDataChange(fieldName, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('select_option')}</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );

      case 'boolean':
        return (
          <div key={fieldName} className="flex items-center">
            <input
              type="checkbox"
              id={fieldName}
              checked={value || false}
              onChange={(e) => handleClinicalDataChange(fieldName, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={fieldName} className="ml-2 text-sm text-gray-700">
              {label}
            </label>
          </div>
        );

      case 'date':
        return (
          <div key={fieldName}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <input
              type="date"
              value={value || ''}
              onChange={(e) => handleClinicalDataChange(fieldName, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {showMedicationLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Pill className="w-7 h-7" />
                    {t('medication_library')}
                  </h2>
                  <p className="text-purple-100 mt-1">{t('select_medication_from_library')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMedicationLibrary(false)}
                  className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mt-4 relative">
                <input
                  type="text"
                  placeholder={t('search_medications')}
                  value={medicationSearchTerm}
                  onChange={(e) => setMedicationSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-20 text-white placeholder-purple-200 focus:outline-none focus:border-white focus:bg-opacity-30"
                />
                <Search className="w-5 h-5 text-white absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {medications.filter(med => {
                  const searchLower = medicationSearchTerm.toLowerCase();
                  return (
                    med.name.toLowerCase().includes(searchLower) ||
                    (med.name_ar && med.name_ar.includes(medicationSearchTerm)) ||
                    (med.generic_name && med.generic_name.toLowerCase().includes(searchLower)) ||
                    (med.manufacturer && med.manufacturer.toLowerCase().includes(searchLower))
                  );
                }).map((medication) => (
                  <button
                    key={medication.id}
                    type="button"
                    onClick={() => addMedicationFromLibrary(medication)}
                    className="text-left p-4 border-2 border-gray-200 hover:border-purple-500 rounded-xl hover:shadow-lg transition bg-gradient-to-br from-white to-purple-50 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-purple-600">
                          {language === 'ar' && medication.name_ar ? medication.name_ar : medication.name}
                        </h4>
                        {medication.generic_name && (
                          <p className="text-xs text-gray-500 mt-1">{medication.generic_name}</p>
                        )}
                      </div>
                      <Pill className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">{t('form')}:</span> {medication.dosage_form}</p>
                      {medication.strength && (
                        <p><span className="font-medium">{t('strength')}:</span> {medication.strength}</p>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition">
                      {t('click_to_add')} →
                    </div>
                  </button>
                ))}
              </div>
              {medications.length === 0 && (
                <div className="text-center py-12">
                  <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">{t('no_medications_available')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg">
      <div className="p-3 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
              {t('record_visit')}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {t('visit_number')}: {formData.visit_number} / {treatmentPlan.total_planned_visits}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
              {Math.round((treatmentPlan.completed_visits / treatmentPlan.total_planned_visits) * 100)}% {t('complete')}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Visit Progress */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{t('visits_progress')}</span>
            <span className="text-sm font-semibold text-blue-600">
              {treatmentPlan.completed_visits + 1} / {treatmentPlan.total_planned_visits}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${((treatmentPlan.completed_visits + 1) / treatmentPlan.total_planned_visits) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Current Visit Workflow */}
        {currentWorkflow && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              {language === 'ar' ? currentWorkflow.title_ar : currentWorkflow.title}
            </h4>
            <div className="space-y-1">
              {currentWorkflow.procedures.map((proc, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-blue-800">
                  <CheckCircle className="w-4 h-4" />
                  <span>{proc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Basic Visit Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t('visit_date')} *
            </label>
            <input
              type="date"
              required
              value={formData.visit_date}
              onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              {t('duration_minutes')}
            </label>
            <input
              type="number"
              min="1"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('visit_type')}
          </label>
          <select
            value={formData.visit_type}
            onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="scheduled">{t('visit_type_scheduled')}</option>
            <option value="emergency">{t('visit_type_emergency')}</option>
            <option value="followup">{t('visit_type_followup')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('tooth_numbers')}
          </label>
          <input
            type="text"
            value={formData.tooth_numbers.join(', ')}
            onChange={(e) => setFormData({
              ...formData,
              tooth_numbers: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
            })}
            placeholder="11, 12, 13"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Clinical Data Section */}
        {template?.clinical_fields && Object.keys(template.clinical_fields).length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {t('clinical_data')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(template.clinical_fields).map(([fieldName, field]) =>
                renderClinicalField(fieldName, field as ClinicalField)
              )}
            </div>
          </div>
        )}

        {/* Complications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-green-500" />
            {t('complications')}
          </label>
          <textarea
            value={formData.complications}
            onChange={(e) => setFormData({ ...formData, complications: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('describe_any_complications')}
          />
        </div>

        {/* Next Visit Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('next_visit_notes')}
          </label>
          <textarea
            value={formData.next_visit_notes}
            onChange={(e) => setFormData({ ...formData, next_visit_notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('notes_for_next_appointment')}
          />
        </div>

        {/* Medications Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-600" />
              {t('medications')}
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowMedicationLibrary(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-md text-sm"
              >
                <Pill className="w-4 h-4" />
                {t('drug_library')}
              </button>
              <button
                type="button"
                onClick={addManualMedication}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                {t('add_manually')}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {prescriptionItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Pill className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">{t('no_medications_added')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('click_drug_library_to_add_medications')}</p>
              </div>
            ) : (
              prescriptionItems.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">
                      {t('medication')} {index + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() => removeMedicationItem(index)}
                      className="text-red-600 hover:text-red-700 transition p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('drug_name')}
                      </label>
                      <input
                        type="text"
                        value={item.drug_name}
                        onChange={(e) => updateMedicationItem(index, 'drug_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('medication_name')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('dosage')}
                      </label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => updateMedicationItem(index, 'dosage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="500mg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('frequency')}
                      </label>
                      <input
                        type="text"
                        value={item.frequency}
                        onChange={(e) => updateMedicationItem(index, 'frequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('three_times_daily')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('duration')}
                      </label>
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(e) => updateMedicationItem(index, 'duration', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('seven_days')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('instructions')}
                      </label>
                      <textarea
                        value={item.instructions}
                        onChange={(e) => updateMedicationItem(index, 'instructions', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={t('special_instructions')}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Information */}
        <div className="border-t-2 border-gray-200 pt-6">
          <h4 className="text-xl sm:text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            {t('payment_information')}
          </h4>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 sm:p-5 border-2 border-green-200 mb-5">
            <div className="space-y-5">
              <div>
                <label className="block text-base sm:text-sm font-bold text-gray-800 mb-2">
                  {t('visit_cost')}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.visit_cost}
                    onChange={(e) => setFormData({ ...formData, visit_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-12 pr-4 py-4 text-lg font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {userRole === 'dentist' && formData.visit_cost > 0 && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    {language === 'ar'
                      ? 'ملاحظة: يتم تحصيل المدفوعات من قبل موظف الاستقبال أو مدير العيادة'
                      : 'Note: Payment collection is handled by reception or clinic admin'}
                  </p>
                </div>
              )}

              {(userRole === 'clinic_admin' || userRole === 'receptionist') && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-base sm:text-sm font-bold text-gray-800">
                        {t('payment_received')}
                      </label>
                      {formData.visit_cost > 0 && formData.payment_received < formData.visit_cost && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, payment_received: formData.visit_cost })}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-bold active:scale-95"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {t('full_payment')}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <CheckCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-600" />
                      <input
                        type="number"
                        min="0"
                        max={formData.visit_cost}
                        step="0.01"
                        value={formData.payment_received}
                        onChange={(e) => setFormData({ ...formData, payment_received: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-12 pr-4 py-4 text-lg font-semibold border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {formData.visit_cost > 0 && (
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-600 mb-1">{t('remaining_balance')}</div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {formatNumber(formData.visit_cost - formData.payment_received)} {t('currency')}
                        </div>
                      </div>
                      {formData.payment_received >= formData.visit_cost ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-bold">
                          <CheckCircle className="w-5 h-5" />
                          {t('paid_in_full')}
                        </div>
                      ) : formData.payment_received > 0 ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-bold">
                          <AlertTriangle className="w-5 h-5" />
                          {t('partial_payment')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg font-bold">
                          <AlertTriangle className="w-5 h-5" />
                          {t('unpaid')}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Next Visit Section */}
        {!existingVisit && formData.visit_number < treatmentPlan.total_planned_visits && (
          <div className="border-t border-gray-200 pt-6">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="scheduleNextVisit"
                  checked={scheduleNextVisit}
                  onChange={(e) => setScheduleNextVisit(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="scheduleNextVisit" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    {t('schedule_next_visit')} ({t('visit')} {formData.visit_number + 1}/{treatmentPlan.total_planned_visits})
                  </label>
                  <p className="text-xs text-gray-600 mt-1">{t('schedule_next_visit_description')}</p>

                  {scheduleNextVisit && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('appointment_date')} *
                        </label>
                        <input
                          type="date"
                          required={scheduleNextVisit}
                          value={nextAppointmentDate}
                          onChange={(e) => setNextAppointmentDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('appointment_time')} *
                        </label>
                        <input
                          type="time"
                          required={scheduleNextVisit}
                          value={nextAppointmentTime}
                          onChange={(e) => setNextAppointmentTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold active:scale-95"
          >
            <X className="w-4 h-4" />
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 font-semibold active:scale-95"
          >
            <Save className="w-4 h-4" />
            {saving ? t('saving') : t('record_visit')}
          </button>
        </div>
      </form>
    </div>
    </>
  );
}

// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  Activity,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Plus,
  Pill,
  Download
} from 'lucide-react';
import { VisitRecordingForm } from './VisitRecordingForm';
import { generateCustomInvoicePDF } from '../../utils/customTemplateRenderer';
import { generateCustomPrescriptionPDF } from '../../utils/customTemplateRenderer';

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
  procedure_template_id: string | null;
  tooth_numbers: string[];
  users?: { full_name: string; full_name_ar: string | null };
}

interface TreatmentVisit {
  id: string;
  visit_number: number;
  visit_date: string;
  visit_type: string;
  procedure_performed: string;
  procedure_performed_ar: string | null;
  clinical_data: Record<string, any>;
  tooth_numbers: string[];
  duration_minutes: number;
  complications: string | null;
  next_visit_notes: string | null;
  visit_cost: number;
  payment_received: number;
  status: string;
  created_at: string;
  prescription_id: string | null;
  invoice_id: string | null;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  users?: { full_name: string; full_name_ar: string | null };
}

interface PrescriptionItem {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PatientTreatmentTimelineProps {
  patientId: string;
}

export function PatientTreatmentTimeline({ patientId }: PatientTreatmentTimelineProps) {
  const { t, language } = useLanguage();
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [visits, setVisits] = useState<Record<string, TreatmentVisit[]>>({});
  const [prescriptions, setPrescriptions] = useState<Record<string, PrescriptionItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [showRecordVisit, setShowRecordVisit] = useState<TreatmentPlan | null>(null);

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    setLoading(true);
    setPrescriptions({});
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          users!treatment_plans_doctor_id_fkey(full_name, full_name_ar)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      setTreatmentPlans(plansData || []);

      if (plansData && plansData.length > 0) {
        const visitsPromises = plansData.map(plan =>
          supabase
            .from('treatment_visits')
            .select(`
              *,
              users!treatment_visits_doctor_id_fkey(full_name, full_name_ar)
            `)
            .eq('treatment_plan_id', plan.id)
            .order('visit_number', { ascending: true })
        );

        const visitsResults = await Promise.all(visitsPromises);
        const visitsMap: Record<string, TreatmentVisit[]> = {};
        const allVisits: TreatmentVisit[] = [];

        plansData.forEach((plan, index) => {
          const planVisits = visitsResults[index].data || [];
          visitsMap[plan.id] = planVisits;
          allVisits.push(...planVisits);
        });

        setVisits(visitsMap);

        const prescriptionIds = allVisits
          .map(v => v.prescription_id)
          .filter(Boolean) as string[];

        if (prescriptionIds.length > 0) {
          const { data: prescriptionItemsData, error: prescError } = await supabase
            .from('prescription_items')
            .select('*')
            .in('prescription_id', prescriptionIds);

          if (prescError) {
            console.error('Error loading prescription items:', prescError);
          }

          console.log('Prescription IDs:', prescriptionIds);
          console.log('Prescription Items Data:', prescriptionItemsData);

          const prescriptionsMap: Record<string, PrescriptionItem[]> = {};
          allVisits.forEach(visit => {
            if (visit.prescription_id) {
              const items = (prescriptionItemsData || []).filter(
                item => item.prescription_id === visit.prescription_id
              );
              prescriptionsMap[visit.id] = items;
              console.log(`Visit ${visit.id} has ${items.length} prescription items`);
            }
          });
          setPrescriptions(prescriptionsMap);
          console.log('Final prescriptions map:', prescriptionsMap);
        } else {
          console.log('No prescription IDs found in visits');
        }
      }
    } catch (error) {
      console.error('Error loading treatment timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      endodontic: { en: 'Root Canal', ar: 'علاج قناة الجذر' },
      implant: { en: 'Implant', ar: 'زراعة' },
      crown_bridge: { en: 'Crown/Bridge', ar: 'تيجان/جسور' },
      scaling: { en: 'Scaling', ar: 'تنظيف' },
      filling: { en: 'Filling', ar: 'حشوة' },
      hollywood_smile: { en: 'Hollywood Smile', ar: 'ابتسامة هوليوود' },
      orthodontics: { en: 'Orthodontics', ar: 'تقويم' },
      extraction: { en: 'Extraction', ar: 'خلع' },
      whitening: { en: 'Whitening', ar: 'تبييض' },
      other: { en: 'Other', ar: 'أخرى' }
    };
    return language === 'ar' ? labels[category]?.ar : labels[category]?.en || category;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownloadInvoice = async (visit: TreatmentVisit) => {
    if (!visit.invoice_id) {
      alert(t('no_invoice_for_visit'));
      return;
    }

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', visit.invoice_id)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: patientData } = await supabase
        .from('patients')
        .select('full_name, phone, email')
        .eq('id', visit.patient_id)
        .single();

      const { data: clinicData } = await supabase
        .from('clinics')
        .select('name, address, phone, email, id')
        .eq('id', invoiceData.clinic_id)
        .single();

      await generateCustomInvoicePDF(clinicData.id, {
        clinicName: clinicData.name,
        clinicAddress: clinicData.address,
        clinicPhone: clinicData.phone,
        clinicEmail: clinicData.email,
        invoiceNumber: invoiceData.invoice_number,
        invoiceDate: invoiceData.invoice_date,
        patientName: patientData.full_name,
        patientPhone: patientData.phone,
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        tax: invoiceData.tax,
        discount: invoiceData.discount,
        total: invoiceData.total,
        paidAmount: invoiceData.paid_amount,
        notes: invoiceData.notes
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert(t('error_downloading_invoice'));
    }
  };

  const handleDownloadPrescription = async (visit: TreatmentVisit) => {
    if (!visit.prescription_id) {
      alert(t('no_prescription_for_visit'));
      return;
    }

    try {
      const prescriptionItemsForVisit = prescriptions[visit.id] || [];

      if (prescriptionItemsForVisit.length === 0) {
        alert(t('no_medications_in_prescription'));
        return;
      }

      const { data: patientData } = await supabase
        .from('patients')
        .select('full_name')
        .eq('id', visit.patient_id)
        .single();

      const { data: prescriptionData } = await supabase
        .from('prescriptions')
        .select('prescription_date, diagnosis, notes')
        .eq('id', visit.prescription_id)
        .single();

      const { data: doctorData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', visit.doctor_id)
        .single();

      const { data: clinicData } = await supabase
        .from('clinics')
        .select('name, address, phone, id')
        .eq('id', visit.clinic_id)
        .single();

      await generateCustomPrescriptionPDF(clinicData.id, {
        clinicName: clinicData.name,
        clinicAddress: clinicData.address,
        clinicPhone: clinicData.phone,
        doctorName: doctorData?.full_name || 'Doctor',
        patientName: patientData.full_name,
        prescriptionDate: prescriptionData?.prescription_date || visit.visit_date,
        medications: prescriptionItemsForVisit.map(item => ({
          name: item.drug_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions
        })),
        instructions: prescriptionData?.notes || visit.next_visit_notes || ''
      });
    } catch (error) {
      console.error('Error downloading prescription:', error);
      alert(t('error_downloading_prescription'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showRecordVisit) {
    return (
      <VisitRecordingForm
        treatmentPlan={showRecordVisit}
        onSuccess={() => {
          setShowRecordVisit(null);
          loadData();
        }}
        onCancel={() => setShowRecordVisit(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('treatment_plans')}
        </h3>
      </div>

      {treatmentPlans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{t('no_treatment_plans_found')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {treatmentPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Plan Header */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        {getCategoryLabel(plan.treatment_category)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(plan.status)}`}>
                        {t(`status_${plan.status}`)}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">
                      {language === 'ar' && plan.diagnosis_ar ? plan.diagnosis_ar : plan.diagnosis}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>
                          {language === 'ar' && plan.users?.full_name_ar
                            ? plan.users.full_name_ar
                            : plan.users?.full_name}
                        </span>
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
                  <button
                    onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronRight
                      className={`w-5 h-5 text-gray-600 transition-transform ${
                        expandedPlanId === plan.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{t('visits_progress')}</span>
                    <span className="text-blue-600 font-semibold">
                      {plan.completed_visits} / {plan.total_planned_visits}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${(plan.completed_visits / plan.total_planned_visits) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-gray-600">{t('total_cost')}:</span>
                      <span className="font-semibold text-gray-900 ml-1">
                        {plan.total_cost.toLocaleString()} {t('currency')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t('paid')}:</span>
                      <span className="font-semibold text-green-600 ml-1">
                        {plan.paid_amount.toLocaleString()} {t('currency')}
                      </span>
                    </div>
                    {plan.total_cost > plan.paid_amount && (
                      <div>
                        <span className="text-gray-600">{t('remaining')}:</span>
                        <span className="font-semibold text-green-600 ml-1">
                          {(plan.total_cost - plan.paid_amount).toLocaleString()} {t('currency')}
                        </span>
                      </div>
                    )}
                  </div>
                  {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                    <button
                      onClick={() => setShowRecordVisit(plan)}
                      className="btn-primary text-sm py-1 px-3 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      {t('record_visit')}
                    </button>
                  )}
                </div>
              </div>

              {/* Visit Timeline */}
              {expandedPlanId === plan.id && (
                <div className="p-6 bg-gray-50">
                  {visits[plan.id]?.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                      {t('no_visits_recorded_yet')}
                    </p>
                  ) : (
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300" />

                      <div className="space-y-6">
                        {visits[plan.id]?.map((visit, index) => (
                          <div key={visit.id} className="relative pl-16">
                            {/* Timeline Dot */}
                            <div className="absolute left-3 top-3 w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow flex items-center justify-center">
                              <span className="text-xs text-white font-bold">{visit.visit_number}</span>
                            </div>

                            {/* Visit Card */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h5 className="font-semibold text-gray-900">
                                    {language === 'ar' && visit.procedure_performed_ar
                                      ? visit.procedure_performed_ar
                                      : visit.procedure_performed}
                                  </h5>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>{formatDate(visit.visit_date)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{visit.duration_minutes} {t('minutes')}</span>
                                    </div>
                                    {visit.tooth_numbers && visit.tooth_numbers.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span>{t('teeth')}: {visit.tooth_numbers.join(', ')}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(visit.status)}`}>
                                  {t(`status_${visit.status}`)}
                                </span>
                              </div>

                              {/* Clinical Data */}
                              {visit.clinical_data && Object.keys(visit.clinical_data).length > 0 && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                  <p className="text-xs font-semibold text-blue-900 mb-2">
                                    {t('clinical_data')}:
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {Object.entries(visit.clinical_data).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="text-gray-600">{key}:</span>
                                        <span className="text-gray-900 ml-1 font-medium">
                                          {typeof value === 'boolean' ? (value ? t('yes') : t('no')) : value?.toString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Complications */}
                              {visit.complications && (
                                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-green-600 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-semibold text-orange-900 mb-1">
                                        {t('complications')}:
                                      </p>
                                      <p className="text-sm text-orange-800">{visit.complications}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Next Visit Notes */}
                              {visit.next_visit_notes && (
                                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-start gap-2">
                                    <FileText className="w-4 h-4 text-green-600 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-semibold text-green-900 mb-1">
                                        {t('next_visit_notes')}:
                                      </p>
                                      <p className="text-sm text-green-800">{visit.next_visit_notes}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Medications */}
                              {prescriptions[visit.id] && prescriptions[visit.id].length > 0 && (
                                <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="flex items-start gap-2">
                                    <Pill className="w-4 h-4 text-purple-600 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-xs font-semibold text-purple-900 mb-2">
                                        {t('medications')}:
                                      </p>
                                      <div className="space-y-2">
                                        {prescriptions[visit.id].map((item, idx) => (
                                          <div key={idx} className="text-sm">
                                            <div className="font-medium text-purple-900">{item.drug_name}</div>
                                            <div className="text-xs text-purple-700 mt-0.5">
                                              {item.dosage} - {item.frequency} - {item.duration}
                                            </div>
                                            {item.instructions && (
                                              <div className="text-xs text-purple-600 mt-0.5 italic">
                                                {item.instructions}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Payment Info */}
                              <div className="mt-3 flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-gray-600">
                                  <DollarSign className="w-4 h-4" />
                                  <span>{t('cost')}: {visit.visit_cost.toLocaleString()} {t('currency')}</span>
                                </div>
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>{t('paid')}: {visit.payment_received.toLocaleString()} {t('currency')}</span>
                                </div>
                              </div>

                              {/* Download Buttons */}
                              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2">
                                {visit.invoice_id && (
                                  <button
                                    onClick={() => handleDownloadInvoice(visit)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition shadow-md hover:shadow-lg text-sm font-medium"
                                  >
                                    <Download className="w-4 h-4" />
                                    {t('download_invoice')}
                                  </button>
                                )}
                                {visit.prescription_id && prescriptions[visit.id]?.length > 0 && (
                                  <button
                                    onClick={() => handleDownloadPrescription(visit)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition shadow-md hover:shadow-lg text-sm font-medium"
                                  >
                                    <Download className="w-4 h-4" />
                                    {t('download_prescription')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

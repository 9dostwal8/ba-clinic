// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Pill, Search, Calendar, User, Download, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { generatePrescriptionPDF } from '../../utils/prescriptionPdfGenerator';
import { generateCustomPrescriptionPDF, getCustomTemplate } from '../../utils/customTemplateRenderer';

interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  prescription_date: string;
  diagnosis?: string;
  notes?: string;
  created_at: string;
  patient: {
    full_name: string;
    full_name_ar?: string;
    phone: string;
    date_of_birth?: string;
  };
  doctor: {
    full_name: string;
    full_name_ar?: string;
  };
  prescription_items: Array<{
    id: string;
    drug_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    medication?: {
      name: string;
      name_ar?: string;
      dosage_form?: string;
    };
  }>;
}

export function ReceptionistPrescriptionModule() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    if (profile?.clinic_id) {
      loadPrescriptions();
    }
  }, [profile?.clinic_id, dateFilter]);

  const loadPrescriptions = async () => {
    console.log('Loading prescriptions for clinic:', profile?.clinic_id, 'dateFilter:', dateFilter);
    try {
      setLoading(true);

      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          patient:patients(full_name, full_name_ar, phone, date_of_birth),
          doctor:users!prescriptions_doctor_id_fkey(full_name, full_name_ar),
          prescription_items(
            *,
            medication:medications(name, name_ar, dosage_form)
          )
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false});

      // Apply date filter
      const now = new Date();
      if (dateFilter === 'today') {
        const today = now.toISOString().split('T')[0];
        query = query.gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;

      console.log('Prescriptions query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Prescription query error:', error);
        throw error;
      }

      setPrescriptions(data || []);
      console.log('Prescriptions set:', data?.length || 0);

    } catch (error: any) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPrescription = async (prescription: Prescription) => {
    try {
      // Get clinic info
      const { data: clinicData } = await supabase
        .from('clinics')
        .select('name, name_ar, address, phone')
        .eq('id', profile.clinic_id)
        .single();

      // Get prescription template if exists
      const { data: template } = await supabase
        .from('prescription_templates')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .eq('is_active', true)
        .single();

      const prescriptionData = {
        patientName: prescription.patient.full_name,
        patientNameAr: prescription.patient.full_name_ar,
        patientPhone: prescription.patient.phone,
        patientAge: prescription.patient.date_of_birth
          ? new Date().getFullYear() - new Date(prescription.patient.date_of_birth).getFullYear()
          : undefined,
        doctorName: prescription.doctor.full_name,
        doctorNameAr: prescription.doctor.full_name_ar,
        clinicName: clinicData?.name || 'Clinic',
        clinicNameAr: clinicData?.name_ar,
        clinicAddress: clinicData?.address,
        clinicPhone: clinicData?.phone,
        prescriptionDate: prescription.prescription_date,
        diagnosis: prescription.diagnosis,
        medications: prescription.prescription_items.map(item => ({
          name: item.medication?.name || item.drug_name,
          nameAr: item.medication?.name_ar,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions
        })),
        notes: prescription.notes,
        headerImage: template?.header_image,
        footerImage: template?.footer_image
      };

      // Check if custom template exists
      const customTemplate = await getCustomTemplate(profile.clinic_id, 'prescription');

      if (customTemplate) {
        console.log('Using custom prescription template');
        await generateCustomPrescriptionPDF(profile.clinic_id, prescriptionData);
      } else {
        console.log('Using default prescription template');
        await generatePrescriptionPDF(prescriptionData);
      }

    } catch (error: any) {
      console.error('Error generating prescription PDF:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const filteredPrescriptions = prescriptions.filter(rx =>
    rx.patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rx.patient.full_name_ar && rx.patient.full_name_ar.includes(searchTerm)) ||
    (rx.doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (rx.doctor.full_name_ar && rx.doctor.full_name_ar.includes(searchTerm))
  );

  const ar = language === 'ar';

  return (
    <div className="pb-24 sm:pb-6">
      {/* Header */}
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-900 text-lime-300 shadow-lift">
            <Pill className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold text-gray-900 sm:text-2xl">
              {ar ? 'الوصفات الطبية' : 'Prescriptions'}
            </h1>
            <p className="truncate text-xs text-gray-500 sm:text-sm">
              {ar ? `${prescriptions.length} وصفة · اطبع بضغطة واحدة` : `${prescriptions.length} prescriptions · one-tap print`}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky controls */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-4 sm:shadow-panel">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={ar ? 'بحث عن مريض أو طبيب...' : 'Search patient or doctor...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15"
          />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-gray-100 p-1">
          {([
            ['today', ar ? 'اليوم' : 'Today'],
            ['week', ar ? 'أسبوع' : 'Week'],
            ['month', ar ? 'شهر' : 'Month'],
            ['all', ar ? 'الكل' : 'All'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDateFilter(val as any)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                dateFilter === val ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-50">
            <Pill className="h-7 w-7 text-gray-400" />
          </div>
          <p className="mt-3 font-display text-base font-semibold text-gray-900">{ar ? 'لا توجد وصفات' : 'No prescriptions'}</p>
          <p className="mt-1 text-sm text-gray-500">{ar ? 'جرّب تغيير الفترة أو البحث' : 'Try another period or search'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPrescriptions.map((prescription) => (
            <div key={prescription.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-panel transition-shadow hover:shadow-lift">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-900/5 text-blue-900">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold text-gray-900">
                      {ar && prescription.patient.full_name_ar ? prescription.patient.full_name_ar : prescription.patient.full_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {prescription.patient.phone} · {ar ? 'د. ' : 'Dr. '}
                      {ar && prescription.doctor.full_name_ar ? prescription.doctor.full_name_ar : prescription.doctor.full_name}
                      {' · '}{new Date(prescription.prescription_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-blue-900/15 bg-blue-900/5 px-2.5 py-1 text-[11px] font-semibold text-blue-900">
                  {prescription.prescription_items.length} {ar ? 'دواء' : 'meds'}
                </span>
              </div>

              {prescription.diagnosis && (
                <p className="mt-2 truncate text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">{ar ? 'التشخيص: ' : 'Dx: '}</span>
                  {prescription.diagnosis}
                </p>
              )}

              {/* Meds */}
              <div className="mt-3 space-y-2">
                {prescription.prescription_items.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-2.5 rounded-xl bg-gray-50 p-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-900 text-[10px] font-bold text-lime-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {ar && item.medication?.name_ar ? item.medication.name_ar : item.medication?.name || item.drug_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {item.dosage} · {item.frequency} · {item.duration}
                        {item.instructions ? ` · ${item.instructions}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {prescription.notes && (
                <p className="mt-2 truncate text-xs text-gray-500">
                  <span className="font-semibold">{ar ? 'ملاحظات: ' : 'Notes: '}</span>
                  {prescription.notes}
                </p>
              )}

              <button
                onClick={() => handlePrintPrescription(prescription)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
              >
                <Printer className="h-4 w-4" />
                {ar ? 'طباعة الوصفة' : 'Print prescription'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

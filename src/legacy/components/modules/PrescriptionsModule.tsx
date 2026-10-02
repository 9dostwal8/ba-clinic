// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, CreditCard as Edit2, Trash2, Search, Download, Settings, Save, Pill, Heart, MessageCircle } from 'lucide-react';
import { generatePrescriptionPDF } from '../../utils/prescriptionPdfGenerator';
import { generateCustomPrescriptionPDF } from '../../utils/customTemplateRenderer';
import { openWhatsApp, getPrescriptionWhatsAppMessage } from '../../utils/whatsappHelper';
import { DrugLibraryPicker } from '../DrugLibraryPicker';

interface Patient {
  id: string;
  full_name: string;
}

interface PrescriptionItem {
  id?: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: string;
  patient_id: string;
  prescription_date: string;
  diagnosis: string;
  notes: string;
  patients: {
    full_name: string;
    full_name_ar?: string | null;
    phone?: string | null;
    language_preference?: 'en' | 'ar' | 'ku' | null;
  };
  prescription_items: PrescriptionItem[];
}

interface PrescriptionTemplate {
  id: string;
  template_name: string;
  logo_url: string;
  header_image_url?: string;
  footer_image_url?: string;
  header_text: string;
  footer_text: string;
  show_clinic_info: boolean;
  show_doctor_info: boolean;
  color_scheme: string;
  font_family?: string;
  paper_size?: string;
}

export function PrescriptionsModule() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [clinic, setClinic] = useState<any>(null);
  const [whatsappSettings, setWhatsappSettings] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showDrugLibrary, setShowDrugLibrary] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const isDoctor = profile?.role === 'doctor';
  const isClinicAdmin = profile?.role === 'clinic_admin';

  const [formData, setFormData] = useState({
    patient_id: '',
    prescription_date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    notes: '',
    items: [] as PrescriptionItem[]
  });

  const [templateFormData, setTemplateFormData] = useState({
    template_name: '',
    logo_url: '',
    header_image_url: '',
    footer_image_url: '',
    header_text: '',
    footer_text: '',
    show_clinic_info: true,
    show_doctor_info: true,
    color_scheme: 'blue',
    font_family: 'Arial',
    paper_size: 'A4'
  });

  const [todayPatientIds, setTodayPatientIds] = useState<string[]>([]);
  const [todayOnly, setTodayOnly] = useState(true);

  useEffect(() => {
    loadClinic();
    loadPatients();
    loadTodayPatients();
    loadPrescriptions();
    loadWhatsAppSettings();
    if (isDoctor) {
      loadTemplates();
    }
  }, []);

  const loadTodayPatients = async () => {
    if (!profile?.clinic_id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('appointments')
        .select('patient_id, doctor_id, appointment_date')
        .eq('clinic_id', profile.clinic_id)
        .gte('appointment_date', `${today}T00:00`)
        .lte('appointment_date', `${today}T23:59`);

      if (isDoctor) query = query.eq('doctor_id', profile.id);

      const { data, error } = await query;
      if (error) throw error;
      setTodayPatientIds(Array.from(new Set((data || []).map((a: any) => a.patient_id).filter(Boolean))));
    } catch (error) {
      console.error('Error loading today patients:', error);
    }
  };


  const loadClinic = async () => {
    if (!profile?.clinic_id) return;
    const { data } = await supabase
      .from('clinics')
      .select('name, currency')
      .eq('id', profile.clinic_id)
      .single();
    if (data) setClinic(data);
  };

  const loadWhatsAppSettings = async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data } = await supabase
        .from('whatsapp_settings')
        .select('enabled, prescription_notifications_enabled')
        .eq('clinic_id', profile.clinic_id)
        .maybeSingle();
      if (data) setWhatsappSettings(data);
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    await loadPrescriptions();
  };

  const loadPrescriptions = async () => {
    if (!profile?.clinic_id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          patients (full_name, full_name_ar, phone, language_preference),
          prescription_items (*)
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('prescription_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(p =>
          p.patients?.full_name?.toLowerCase().includes(searchLower) ||
          p.diagnosis?.toLowerCase().includes(searchLower)
        );
      }

      setPrescriptions(filteredData);
      setHasSearched(true);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name')
        .eq('clinic_id', profile?.clinic_id)
        .order('full_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('prescription_templates')
        .select('*')
        .eq('doctor_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error: prescriptionError } = await supabase
          .from('prescriptions')
          .update({
            patient_id: formData.patient_id,
            prescription_date: formData.prescription_date,
            diagnosis: formData.diagnosis,
            notes: formData.notes,
            doctor_id: profile?.id,
            clinic_id: profile?.clinic_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (prescriptionError) throw prescriptionError;

        await supabase
          .from('prescription_items')
          .delete()
          .eq('prescription_id', editingId);

        if (formData.items.length > 0) {
          const itemsToInsert = formData.items.map(item => ({
            prescription_id: editingId,
            ...item
          }));

          const { error: itemsError } = await supabase
            .from('prescription_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      } else {
        const { data: newPrescription, error: prescriptionError } = await supabase
          .from('prescriptions')
          .insert({
            clinic_id: profile?.clinic_id,
            doctor_id: profile?.id,
            patient_id: formData.patient_id,
            prescription_date: formData.prescription_date,
            diagnosis: formData.diagnosis,
            notes: formData.notes
          })
          .select()
          .single();

        if (prescriptionError) throw prescriptionError;

        if (formData.items.length > 0) {
          const itemsToInsert = formData.items.map(item => ({
            prescription_id: newPrescription.id,
            ...item
          }));

          const { error: itemsError } = await supabase
            .from('prescription_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadPrescriptions();
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Failed to save prescription');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prescription?')) return;

    try {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadPrescriptions();
    } catch (error) {
      console.error('Error deleting prescription:', error);
    }
  };

  const handleEdit = (prescription: Prescription) => {
    setFormData({
      patient_id: prescription.patient_id,
      prescription_date: prescription.prescription_date,
      diagnosis: prescription.diagnosis,
      notes: prescription.notes,
      items: prescription.prescription_items || []
    });
    setEditingId(prescription.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      patient_id: '',
      prescription_date: new Date().toISOString().split('T')[0],
      diagnosis: '',
      notes: '',
      items: []
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplateId) {
        const { error } = await supabase
          .from('prescription_templates')
          .update({
            ...templateFormData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplateId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('prescription_templates')
          .insert({
            clinic_id: profile?.clinic_id,
            doctor_id: profile?.id,
            ...templateFormData
          });

        if (error) throw error;
      }

      setEditingTemplateId(null);
      resetTemplateForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleEditTemplate = (template: PrescriptionTemplate) => {
    setTemplateFormData({
      template_name: template.template_name,
      logo_url: template.logo_url,
      header_image_url: template.header_image_url || '',
      footer_image_url: template.footer_image_url || '',
      header_text: template.header_text,
      footer_text: template.footer_text,
      show_clinic_info: template.show_clinic_info,
      show_doctor_info: template.show_doctor_info,
      color_scheme: template.color_scheme,
      font_family: template.font_family || 'Arial',
      paper_size: template.paper_size || 'A4'
    });
    setEditingTemplateId(template.id);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('prescription_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      template_name: '',
      logo_url: '',
      header_image_url: '',
      footer_image_url: '',
      header_text: '',
      footer_text: '',
      show_clinic_info: true,
      show_doctor_info: true,
      color_scheme: 'blue',
      font_family: 'Arial',
      paper_size: 'A4'
    });
  };

  const downloadPrescription = async (prescription: Prescription) => {
    try {
      let template = templates[0];

      if (templates.length === 0) {
        template = {
          id: '',
          template_name: 'Default',
          logo_url: '',
          header_text: 'Prescription',
          footer_text: '',
          show_clinic_info: true,
          show_doctor_info: true,
          color_scheme: 'blue'
        };
      }

      const { data: clinicData } = await supabase
        .from('clinics')
        .select('name, address, phone, email')
        .eq('id', profile?.clinic_id)
        .maybeSingle();

      const clinicInfo = clinicData || {
        name: 'Clinic',
        address: '',
        phone: '',
        email: ''
      };

      const doctorInfo = {
        full_name: profile?.full_name || 'Doctor',
        email: ''
      };

      if (profile?.clinic_id) {
        try {
          const prescriptionData = {
            clinicName: clinicInfo.name,
            clinicAddress: clinicInfo.address,
            clinicPhone: clinicInfo.phone,
            doctorName: doctorInfo.full_name,
            patientName: prescription.patients.full_name,
            prescriptionDate: prescription.prescription_date,
            medications: prescription.prescription_items.map(item => ({
              name: item.drug_name,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions
            })),
            instructions: prescription.notes
          };
          await generateCustomPrescriptionPDF(profile.clinic_id, prescriptionData);
        } catch (error) {
          generatePrescriptionPDF(prescription, template, clinicInfo, doctorInfo);
        }
      } else {
        generatePrescriptionPDF(prescription, template, clinicInfo, doctorInfo);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate prescription PDF');
    }
  };


  if (showTemplateManager && isDoctor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('prescription_templates')}</h2>
            <p className="text-gray-600 mt-1">{t('manage_templates_description')}</p>
          </div>
          <button
            onClick={() => {
              setShowTemplateManager(false);
              setEditingTemplateId(null);
              resetTemplateForm();
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {t('back_to_prescriptions')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4">
            <h3 className="text-xl font-bold text-white">
              {editingTemplateId ? t('edit_template') : t('create_new_template')}
            </h3>
            <p className="text-sky-100 text-sm mt-1">{t('customize_prescription_template')}</p>
          </div>
          <form onSubmit={handleTemplateSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('template_name')} *
                </label>
                <input
                  type="text"
                  value={templateFormData.template_name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, template_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder={t('template_name_placeholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('logo_url')}
                </label>
                <input
                  type="text"
                  value={templateFormData.logo_url}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, logo_url: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">{t('header_footer_images')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('header_image_url')}
                  </label>
                  <input
                    type="text"
                    value={templateFormData.header_image_url}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, header_image_url: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    placeholder="https://example.com/header.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('header_image_description')}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('footer_image_url')}
                  </label>
                  <input
                    type="text"
                    value={templateFormData.footer_image_url}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, footer_image_url: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    placeholder="https://example.com/footer.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('footer_image_description')}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">{t('header_footer_text')}</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('header_text')}
                  </label>
                  <textarea
                    value={templateFormData.header_text}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, header_text: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    rows={2}
                    placeholder={t('header_text_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('footer_text')}
                  </label>
                  <textarea
                    value={templateFormData.footer_text}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, footer_text: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    rows={2}
                    placeholder={t('footer_text_placeholder')}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">{t('styling_options')}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('color_scheme')}
                  </label>
                  <select
                    value={templateFormData.color_scheme}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, color_scheme: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  >
                    <option value="blue">{t('color_blue')}</option>
                    <option value="green">{t('color_green')}</option>
                    <option value="red">{t('color_red')}</option>
                    <option value="gray">{t('color_gray')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Font Family
                  </label>
                  <select
                    value={templateFormData.font_family}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, font_family: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  >
                    <option value={t('font_arial')}>{t('font_arial')}</option>
                    <option value={t('font_helvetica')}>{t('font_helvetica')}</option>
                    <option value={t('font_times_new_roman')}>{t('font_times_new_roman')}</option>
                    <option value={t('font_georgia')}>{t('font_georgia')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Paper Size
                  </label>
                  <select
                    value={templateFormData.paper_size}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, paper_size: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  >
                    <option value="A4">A4</option>
                    <option value={t('paper_size_letter')}>{t('paper_size_letter')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">{t('display_options')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="checkbox"
                    checked={templateFormData.show_clinic_info}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, show_clinic_info: e.target.checked })}
                    className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{t('show_clinic_information')}</span>
                    <p className="text-xs text-gray-500">Display clinic name, address, and contact</p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="checkbox"
                    checked={templateFormData.show_doctor_info}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, show_doctor_info: e.target.checked })}
                    className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{t('show_doctor_information')}</span>
                    <p className="text-xs text-gray-500">{t('display_doctor_name_credentials')}</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
              >
                <Save className="w-4 h-4" />
                <span>{editingTemplateId ? 'Update Template' : 'Save Template'}</span>
              </button>
              {editingTemplateId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplateId(null);
                    resetTemplateForm();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('your_templates')}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {templates.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No templates yet. Create your first template above.
              </div>
            ) : (
              templates.map(template => (
                <div key={template.id} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{template.template_name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Color: {template.color_scheme} •
                        {template.show_clinic_info && ' Clinic Info'}
                        {template.show_doctor_info && ' Doctor Info'}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }




  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingId ? 'Edit Prescription' : 'New Prescription'}
          </h2>
          <button
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              resetForm();
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Patient
                </label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setTodayOnly(true)}
                    className={`px-2 py-1 ${todayOnly ? 'bg-sky-600 text-white' : 'bg-white text-gray-600'}`}
                  >
                    {language === 'ar' ? 'مرضى اليوم' : "Today's patients"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTodayOnly(false)}
                    className={`px-2 py-1 ${!todayOnly ? 'bg-sky-600 text-white' : 'bg-white text-gray-600'}`}
                  >
                    {language === 'ar' ? 'الكل' : 'All'}
                  </button>
                </div>
              </div>
              <select
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                required
              >
                <option value="">{t('select_patient')}</option>
                {(todayOnly ? patients.filter(p => todayPatientIds.includes(p.id)) : patients).map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name}
                  </option>
                ))}
              </select>
              {todayOnly && todayPatientIds.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {language === 'ar' ? 'لا يوجد مرضى اليوم — اختر "الكل"' : 'No patients scheduled today — switch to All'}
                </p>
              )}

            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.prescription_date}
                onChange={(e) => setFormData({ ...formData, prescription_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnosis
            </label>
            <input
              type="text"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Enter diagnosis..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white">
                  <Pill className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-900">Medications</p>
                  <p className="text-[11px] text-slate-500">
                    {formData.items.length === 0 ? 'None added yet' : `${formData.items.length} on this prescription`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDrugLibrary(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Pill className="h-4 w-4" />
                  {t('drug_library')}
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  {t('add_manually')}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {formData.items.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowDrugLibrary(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white py-8 text-center transition hover:border-slate-900"
                >
                  <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                    <Pill className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-bold text-slate-800">{t('no_medications_added')}</p>
                  <p className="mt-1 px-6 text-xs text-slate-500">
                    Tap to open the drug library — search, pick dosage presets and add several at once.
                  </p>
                </button>
              ) : (
                formData.items.map((item, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-lime-400 text-[11px] font-black text-slate-900">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-black text-slate-900">
                        {item.drug_name || 'New medication'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-rose-600 transition hover:bg-rose-50"
                      title="Remove medication"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('drug_name')}</label>
                      <input
                        type="text"
                        value={item.drug_name}
                        onChange={(e) => updateItem(index, 'drug_name', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-slate-900 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('dosage')}</label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                        placeholder="e.g., 500mg"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('duration')}</label>
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(e) => updateItem(index, 'duration', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                        placeholder="e.g., 7 days"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('frequency')}</label>
                      <input
                        type="text"
                        value={item.frequency}
                        onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                        placeholder="e.g., 3 times daily"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('instructions')}</label>
                      <textarea
                        value={item.instructions}
                        onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                        rows={2}
                        placeholder="Special instructions..."
                      />
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>

          <DrugLibraryPicker
            isOpen={showDrugLibrary}
            onClose={() => setShowDrugLibrary(false)}
            onAdd={(picked) => setFormData((prev) => ({ ...prev, items: [...prev.items, ...picked] }))}
          />


          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
            >
              <Save className="w-4 h-4" />
              <span>{editingId ? 'Update' : 'Save'} Prescription</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-1 md:space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-600 text-white shadow-sm">
            <Pill className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-slate-900 md:text-2xl">{t('drug_prescriptions')}</h2>
            <p className="truncate text-[11px] text-slate-500 md:text-sm">
              {isDoctor ? 'Manage your prescriptions and templates' : 'View all clinic prescriptions'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isDoctor && (
            <button
              onClick={() => setShowTemplateManager(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 md:px-4 md:text-sm"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('manage_templates')}</span>
            </button>
          )}
          {(isDoctor || isClinicAdmin) && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 md:px-4 md:text-sm"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">{t('new_prescription')}</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search prescriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full rounded-xl border border-transparent bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 md:text-base"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
            className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 md:px-6"
          >
            {loading ? t('searching') : t('search')}
          </button>
        </div>
      </div>

      {!hasSearched && prescriptions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-500">
            <Search className="h-7 w-7" />
          </span>
          <h3 className="text-sm font-bold text-slate-900 md:text-base">{t('searchForPrescriptions')}</h3>
          <p className="mt-1 text-xs text-slate-500 md:text-sm">{t('enterSearchTermToFindPrescriptions')}</p>
        </div>
      )}

      {hasSearched && prescriptions.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <Search className="h-7 w-7" />
          </span>
          <h3 className="text-sm font-bold text-slate-900 md:text-base">{t('noResultsFound')}</h3>
          <p className="mt-1 text-xs text-slate-500 md:text-sm">{t('tryDifferentSearchTerm')}</p>
        </div>
      )}

      {prescriptions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diagnosis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medications
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prescriptions.map((prescription) => (
                  <tr key={prescription.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {prescription.patients.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(prescription.prescription_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {prescription.diagnosis}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {prescription.prescription_items.length} medication(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {prescription.patients?.phone && whatsappSettings?.enabled && whatsappSettings?.prescription_notifications_enabled && (
                          <button
                            onClick={async () => {
                              const patientName = language === 'ar' && prescription.patients?.full_name_ar
                                ? prescription.patients.full_name_ar
                                : prescription.patients?.full_name || '';
                              const patientLang = prescription.patients?.language_preference || (language as 'en' | 'ar' | 'ku') || 'en';
                              const medications = prescription.prescription_items.map(item =>
                                `${item.drug_name} - ${item.dosage} - ${item.frequency} (${item.duration})`
                              );
                              const message = await getPrescriptionWhatsAppMessage(
                                patientName,
                                patientLang,
                                clinic?.name || 'Clinic',
                                medications
                              );
                              openWhatsApp(prescription.patients.phone, message);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Send via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => downloadPrescription(prescription)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {(isDoctor || isClinicAdmin) && (
                          <>
                          <button
                            onClick={() => handleEdit(prescription)}
                            className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition"
                            title={t('edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prescription.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200">
          {prescriptions.map((prescription) => (
              <div key={prescription.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 mb-1">
                      {prescription.patients.full_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(prescription.prescription_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    {prescription.patients?.phone && whatsappSettings?.enabled && whatsappSettings?.prescription_notifications_enabled && (
                      <button
                        onClick={async () => {
                          const patientName = language === 'ar' && prescription.patients?.full_name_ar
                            ? prescription.patients.full_name_ar
                            : prescription.patients?.full_name || '';
                          const patientLang = prescription.patients?.language_preference || (language as 'en' | 'ar' | 'ku') || 'en';
                          const medications = prescription.prescription_items.map(item =>
                            `${item.drug_name} - ${item.dosage} - ${item.frequency} (${item.duration})`
                          );
                          const message = await getPrescriptionWhatsAppMessage(
                            patientName,
                            patientLang,
                            clinic?.name || 'Clinic',
                            medications
                          );
                          openWhatsApp(prescription.patients.phone, message);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => downloadPrescription(prescription)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    {(isDoctor || isClinicAdmin) && (
                      <>
                        <button
                          onClick={() => handleEdit(prescription)}
                          className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(prescription.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Diagnosis:</span>
                    <div className="text-gray-900">{prescription.diagnosis}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Medications:</span>
                    <div className="text-gray-900">
                      {prescription.prescription_items.length} medication(s)
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
        </div>
      )}
    </div>
  );
}

// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, Trash2, Save, X, Pill } from 'lucide-react';
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

interface NewPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewPrescriptionModal({ isOpen, onClose, onSuccess }: NewPrescriptionModalProps) {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showDrugLibrary, setShowDrugLibrary] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    prescription_date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    notes: '',
    items: [] as PrescriptionItem[]
  });

  useEffect(() => {
    if (isOpen) {
      loadPatients();
    }
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Failed to save prescription');
    }
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

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('newPrescription')}</h2>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient
                </label>
                <select
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  required
                >
                  <option value="">{t('select_patient')}</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </option>
                  ))}
                </select>
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
                <span>Save Prescription</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

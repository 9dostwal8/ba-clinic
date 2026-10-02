// @ts-nocheck
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, AlertTriangle, Heart, Activity, Droplet } from 'lucide-react';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewPatientModal({ isOpen, onClose, onSuccess }: NewPatientModalProps) {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    full_name_ar: '',
    date_of_birth: '',
    gender: 'male',
    phone: '',
    email: '',
    address: '',
    medical_history: '',
    allergies: '',
    blood_type: '',
    has_hepatitis_b: false,
    has_hepatitis_c: false,
    has_heart_failure: false,
    has_stent: false,
    has_hypertension: false,
    has_diabetes: false,
    medical_conditions_notes: '',
    language_preference: 'en' as 'en' | 'ar'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id) {
      console.error('❌ No clinic_id in profile:', profile);
      alert('Error: No clinic ID found. Please try logging in again.');
      return;
    }

    try {
      const patientNumber = `P${Date.now()}`;

      // Build clean patient data - only include non-empty values
      const patientData: any = {
        clinic_id: profile.clinic_id,
        patient_number: patientNumber,
        full_name: newPatient.full_name.trim(),
        gender: newPatient.gender || 'male',
        language_preference: newPatient.language_preference || 'en',
        has_hepatitis_b: newPatient.has_hepatitis_b || false,
        has_hepatitis_c: newPatient.has_hepatitis_c || false,
        has_heart_failure: newPatient.has_heart_failure || false,
        has_stent: newPatient.has_stent || false,
        has_hypertension: newPatient.has_hypertension || false,
        has_diabetes: newPatient.has_diabetes || false
      };

      // Only add optional fields if they have actual values (not empty strings)
      if (newPatient.full_name_ar && newPatient.full_name_ar.trim()) {
        patientData.full_name_ar = newPatient.full_name_ar.trim();
      }
      if (newPatient.date_of_birth && newPatient.date_of_birth.trim()) {
        patientData.date_of_birth = newPatient.date_of_birth.trim();
      }
      if (newPatient.phone && newPatient.phone.trim()) {
        patientData.phone = newPatient.phone.trim();
      }
      if (newPatient.email && newPatient.email.trim()) {
        patientData.email = newPatient.email.trim();
      }
      if (newPatient.address && newPatient.address.trim()) {
        patientData.address = newPatient.address.trim();
      }
      if (newPatient.medical_history && newPatient.medical_history.trim()) {
        patientData.medical_history = newPatient.medical_history.trim();
      }
      if (newPatient.allergies && newPatient.allergies.trim()) {
        patientData.allergies = newPatient.allergies.trim();
      }
      if (newPatient.blood_type && newPatient.blood_type.trim()) {
        patientData.blood_type = newPatient.blood_type.trim();
      }
      if (newPatient.medical_conditions_notes && newPatient.medical_conditions_notes.trim()) {
        patientData.medical_conditions_notes = newPatient.medical_conditions_notes.trim();
      }

      if (profile.role === 'doctor') {
        patientData.assigned_doctor_id = profile.id;
      }

      console.log('📝 Attempting to create patient with data:', patientData);

      const { data, error } = await supabase.from('patients').insert(patientData).select();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Patient created successfully:', data);

      setNewPatient({
        full_name: '',
        full_name_ar: '',
        date_of_birth: '',
        gender: 'male',
        phone: '',
        email: '',
        address: '',
        medical_history: '',
        allergies: '',
        blood_type: '',
        has_hepatitis_b: false,
        has_hepatitis_c: false,
        has_heart_failure: false,
        has_stent: false,
        has_hypertension: false,
        has_diabetes: false,
        medical_conditions_notes: '',
        language_preference: 'en' as 'en' | 'ar'
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Error adding patient:', error);
      const errorMessage = error?.message || error?.details || 'Unknown error';
      alert(`${t('failedToAddPatient')}\n\nError: ${errorMessage}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t('addNewPatient')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('fullNameEnglish')} *</label>
              <input type="text" required value={newPatient.full_name} onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('fullNameArabic')}</label>
              <input type="text" value={newPatient.full_name_ar} onChange={(e) => setNewPatient({ ...newPatient, full_name_ar: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('dateOfBirth')}</label>
              <input type="date" value={newPatient.date_of_birth} onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('gender')}</label>
              <select value={newPatient.gender} onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500">
                <option value="male">{t('male')}</option>
                <option value="female">{t('female')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('phone')}</label>
              <input type="tel" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
              <input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('bloodType')}</label>
              <select value={newPatient.blood_type} onChange={(e) => setNewPatient({ ...newPatient, blood_type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500">
                <option value="">{t('selectPlaceholder')}</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('address')}</label>
              <input type="text" value={newPatient.address} onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('medicalHistory')}</label>
              <textarea value={newPatient.medical_history} onChange={(e) => setNewPatient({ ...newPatient, medical_history: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('allergies')}</label>
              <textarea value={newPatient.allergies} onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>

            <div className="md:col-span-2 p-5 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <label className="block text-base font-bold text-red-900">{t('medicalConditions')}</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-red-200 rounded-lg hover:bg-red-50 transition cursor-pointer">
                  <input type="checkbox" checked={newPatient.has_hepatitis_b} onChange={(e) => setNewPatient({ ...newPatient, has_hepatitis_b: e.target.checked })} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500" />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-gray-900">{t('hepatitisB')}</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-red-200 rounded-lg hover:bg-red-50 transition cursor-pointer">
                  <input type="checkbox" checked={newPatient.has_hepatitis_c} onChange={(e) => setNewPatient({ ...newPatient, has_hepatitis_c: e.target.checked })} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500" />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-gray-900">{t('hepatitisC')}</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-green-200 rounded-lg hover:bg-green-50 transition cursor-pointer">
                  <input type="checkbox" checked={newPatient.has_heart_failure} onChange={(e) => setNewPatient({ ...newPatient, has_heart_failure: e.target.checked })} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500" />
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-gray-900">{t('heartFailure')}</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-green-200 rounded-lg hover:bg-green-50 transition cursor-pointer">
                  <input type="checkbox" checked={newPatient.has_stent} onChange={(e) => setNewPatient({ ...newPatient, has_stent: e.target.checked })} className="w-5 h-5 text-green-600 border-green-300 rounded focus:ring-green-500" />
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-900">{t('cardiacStent')}</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-green-200 rounded-lg hover:bg-amber-50 transition cursor-pointer">
                  <input type="checkbox" checked={newPatient.has_hypertension} onChange={(e) => setNewPatient({ ...newPatient, has_hypertension: e.target.checked })} className="w-5 h-5 text-amber-600 border-amber-300 rounded focus:ring-amber-500" />
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-gray-900">{t('hypertension')}</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-yellow-200 rounded-lg hover:bg-yellow-50 transition cursor-pointer">
                  <input type="checkbox" checked={newPatient.has_diabetes} onChange={(e) => setNewPatient({ ...newPatient, has_diabetes: e.target.checked })} className="w-5 h-5 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500" />
                  <div className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-yellow-600" />
                    <span className="font-semibold text-gray-900">{t('diabetes')}</span>
                  </div>
                </label>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('medical_conditions_notes') || 'Additional Medical Notes'}</label>
                <textarea value={newPatient.medical_conditions_notes} onChange={(e) => setNewPatient({ ...newPatient, medical_conditions_notes: e.target.value })} rows={2} placeholder={t('medical_conditions_notes_placeholder') || 'Additional details about medical conditions...'} className="w-full px-4 py-2 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition">Add Patient</button>
          </div>
        </form>
      </div>
    </div>
  );
}

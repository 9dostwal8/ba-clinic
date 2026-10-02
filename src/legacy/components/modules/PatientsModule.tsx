// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../hooks/useCurrency';
import { Plus, Search, Edit as EditIcon, Eye, AlertTriangle, Heart, Activity, Droplet } from 'lucide-react';
import { PatientDetailsView } from './PatientDetailsView';

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
  language_preference: string | null;
  created_at: string;
}

export function PatientsModule() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
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
  const [editPatient, setEditPatient] = useState({
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

  const handleSearch = async () => {
    if (!profile?.clinic_id || !profile?.id) return;
    if (!searchTerm.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false });

      if (profile.role === 'doctor') {
        const { data: perms } = await supabase
          .from('staff_permissions')
          .select('view_all_patients')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (perms && perms.view_all_patients === false) {
          query = query.eq('assigned_doctor_id', profile.id);
        }
      }

      query = query.or(`full_name.ilike.%${searchTerm}%,patient_number.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);

      const { data } = await query;
      setPatients(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!profile?.clinic_id || !profile?.id) return;

    setLoading(true);

    try {
      let query = supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false });

      if (profile.role === 'doctor') {
        const { data: perms } = await supabase
          .from('staff_permissions')
          .select('view_all_patients')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (perms && perms.view_all_patients === false) {
          query = query.eq('assigned_doctor_id', profile.id);
        }
      }

      const { data } = await query;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id) return;

    try {
      const patientNumber = `P${Date.now()}`;
      const patientData: any = {
        clinic_id: profile.clinic_id,
        patient_number: patientNumber,
        ...newPatient
      };

      if (profile.role === 'doctor') {
        patientData.assigned_doctor_id = profile.id;
      }

      const { error } = await supabase.from('patients').insert(patientData);
      if (error) throw error;

      setShowAddModal(false);
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
      loadData();
    } catch (error) {
      console.error('Error adding patient:', error);
      alert(t('failedToAddPatient'));
    }
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetailView(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setEditPatient({
      full_name: patient.full_name,
      full_name_ar: patient.full_name_ar || '',
      date_of_birth: patient.date_of_birth || '',
      gender: patient.gender || 'male',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      medical_history: patient.medical_history || '',
      allergies: patient.allergies || '',
      blood_type: patient.blood_type || '',
      has_hepatitis_b: patient.has_hepatitis_b || false,
      has_hepatitis_c: patient.has_hepatitis_c || false,
      has_heart_failure: patient.has_heart_failure || false,
      has_stent: patient.has_stent || false,
      has_hypertension: patient.has_hypertension || false,
      has_diabetes: patient.has_diabetes || false,
      medical_conditions_notes: patient.medical_conditions_notes || '',
      language_preference: (patient.language_preference as 'en' | 'ar') || 'en'
    });
    setShowEditModal(true);
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const { error } = await supabase
        .from('patients')
        .update(editPatient)
        .eq('id', selectedPatient.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedPatient(null);
      loadData();
    } catch (error) {
      console.error('Error updating patient:', error);
      alert(t('failedToUpdate'));
    }
  };

  const hasAnyMedicalCondition = (patient: Patient) => {
    return patient.has_hepatitis_b || patient.has_hepatitis_c ||
           patient.has_heart_failure || patient.has_stent ||
           patient.has_hypertension || patient.has_diabetes;
  };

  const getMedicalConditionsBadges = (patient: Patient) => {
    const conditions = [];
    if (patient.has_hepatitis_b) conditions.push({ label: 'Hep B', color: 'bg-red-100 text-red-800', icon: AlertTriangle });
    if (patient.has_hepatitis_c) conditions.push({ label: 'Hep C', color: 'bg-red-100 text-red-800', icon: AlertTriangle });
    if (patient.has_heart_failure) conditions.push({ label: 'Heart Failure', color: 'bg-red-100 text-red-800', icon: Heart });
    if (patient.has_stent) conditions.push({ label: 'Stent', color: 'bg-green-100 text-green-800', icon: Activity });
    if (patient.has_hypertension) conditions.push({ label: 'HTN', color: 'bg-amber-100 text-amber-800', icon: Activity });
    if (patient.has_diabetes) conditions.push({ label: 'Diabetes', color: 'bg-yellow-100 text-yellow-800', icon: Droplet });
    return conditions;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('patients')}</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>{t('addPatient')}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 md:p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPatients')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm md:text-base"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !searchTerm.trim()}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? t('searching') : t('search')}
            </button>
          </div>
        </div>

        {!hasSearched && patients.length === 0 && (
          <div className="text-center py-16 px-4">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('searchForPatients')}</h3>
            <p className="text-gray-600">{t('enterSearchTermToFindPatients')}</p>
          </div>
        )}

        {hasSearched && patients.length === 0 && !loading && (
          <div className="text-center py-16 px-4">
            <div className="text-gray-400 mb-2 text-5xl">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noResultsFound')}</h3>
            <p className="text-gray-600">{t('tryDifferentSearchTerm')}</p>
          </div>
        )}

        {patients.length > 0 && (
          <div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('patientId')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('contact')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('gender')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('bloodType')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-sky-50 cursor-pointer transition" onClick={() => handleViewPatient(patient)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-gray-900">{patient.patient_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {patient.full_name}
                          {hasAnyMedicalCondition(patient) && (
                            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                          )}
                        </div>
                        {patient.full_name_ar && (
                          <div className="text-sm text-gray-500">{patient.full_name_ar}</div>
                        )}
                        {hasAnyMedicalCondition(patient) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {getMedicalConditionsBadges(patient).map((condition, idx) => {
                              const ConditionIcon = condition.icon;
                              return (
                                <span key={idx} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${condition.color} flex items-center gap-1`}>
                                  <ConditionIcon className="w-3 h-3" />
                                  {condition.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{patient.phone}</div>
                    <div className="text-sm text-gray-500">{patient.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{patient.gender}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.blood_type || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button onClick={(e) => { e.stopPropagation(); handleViewPatient(patient); }} className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition" title={t('viewPatientDetails')}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleEditPatient(patient); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" title={t('editPatient')}>
                        <EditIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200">
          {patients.map((patient) => (
            <div key={patient.id} className="p-4 hover:bg-sky-50 cursor-pointer transition" onClick={() => handleViewPatient(patient)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    {patient.full_name}
                    {hasAnyMedicalCondition(patient) && (
                      <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                    )}
                  </div>
                  {patient.full_name_ar && <div className="text-sm text-gray-500 mb-1">{patient.full_name_ar}</div>}
                  <div className="text-xs font-mono text-gray-500">{patient.patient_number}</div>
                  {hasAnyMedicalCondition(patient) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getMedicalConditionsBadges(patient).map((condition, idx) => {
                        const ConditionIcon = condition.icon;
                        return (
                          <span key={idx} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${condition.color} flex items-center gap-1`}>
                            <ConditionIcon className="w-3 h-3" />
                            {condition.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-3">
                  <button onClick={(e) => { e.stopPropagation(); handleViewPatient(patient); }} className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleEditPatient(patient); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                    <EditIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">{t('phone')}:</span>
                  <div className="text-gray-900">{patient.phone || '-'}</div>
                </div>
                <div>
                  <span className="text-gray-500">{t('gender')}:</span>
                  <div className="text-gray-900 capitalize">{patient.gender}</div>
                </div>
                {patient.email && (
                  <div className="col-span-2">
                    <span className="text-gray-500">{t('email')}:</span>
                    <div className="text-gray-900 truncate">{patient.email}</div>
                  </div>
                )}
                {patient.blood_type && (
                  <div>
                    <span className="text-gray-500">{t('blood')}:</span>
                    <div className="text-gray-900">{patient.blood_type}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{t('addNewPatient')}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleAddPatient} className="p-6 space-y-4">
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
                    <option value="">Select...</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
                  <textarea value={newPatient.medical_history} onChange={(e) => setNewPatient({ ...newPatient, medical_history: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('allergies')}</label>
                  <textarea value={newPatient.allergies} onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>

                <div className="md:col-span-2 p-5 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <label className="block text-base font-bold text-red-900">{t('medical_conditions') || 'Medical Conditions'}</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-red-200 rounded-lg hover:bg-red-50 transition cursor-pointer">
                      <input type="checkbox" checked={newPatient.has_hepatitis_b} onChange={(e) => setNewPatient({ ...newPatient, has_hepatitis_b: e.target.checked })} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500" />
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-gray-900">{t('hepatitis_b') || 'Hepatitis B'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-red-200 rounded-lg hover:bg-red-50 transition cursor-pointer">
                      <input type="checkbox" checked={newPatient.has_hepatitis_c} onChange={(e) => setNewPatient({ ...newPatient, has_hepatitis_c: e.target.checked })} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500" />
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-gray-900">{t('hepatitis_c') || 'Hepatitis C'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-green-200 rounded-lg hover:bg-green-50 transition cursor-pointer">
                      <input type="checkbox" checked={newPatient.has_heart_failure} onChange={(e) => setNewPatient({ ...newPatient, has_heart_failure: e.target.checked })} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500" />
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-gray-900">{t('heart_failure') || 'Heart Failure'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-green-200 rounded-lg hover:bg-green-50 transition cursor-pointer">
                      <input type="checkbox" checked={newPatient.has_stent} onChange={(e) => setNewPatient({ ...newPatient, has_stent: e.target.checked })} className="w-5 h-5 text-green-600 border-green-300 rounded focus:ring-green-500" />
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-gray-900">{t('cardiac_stent') || 'Cardiac Stent'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-green-200 rounded-lg hover:bg-amber-50 transition cursor-pointer">
                      <input type="checkbox" checked={newPatient.has_hypertension} onChange={(e) => setNewPatient({ ...newPatient, has_hypertension: e.target.checked })} className="w-5 h-5 text-amber-600 border-amber-300 rounded focus:ring-amber-500" />
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-600" />
                        <span className="font-semibold text-gray-900">{t('hypertension') || 'Hypertension'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-yellow-200 rounded-lg hover:bg-yellow-50 transition cursor-pointer">
                      <input type="checkbox" checked={newPatient.has_diabetes} onChange={(e) => setNewPatient({ ...newPatient, has_diabetes: e.target.checked })} className="w-5 h-5 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500" />
                      <div className="flex items-center gap-2">
                        <Droplet className="w-4 h-4 text-yellow-600" />
                        <span className="font-semibold text-gray-900">{t('diabetes') || 'Diabetes'}</span>
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
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition">Add Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailView && selectedPatient && (
        <PatientDetailsView
          patient={selectedPatient}
          onClose={() => {
            setShowDetailView(false);
            setSelectedPatient(null);
          }}
        />
      )}

      {showEditModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{t('editPatient')}</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedPatient(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleUpdatePatient} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('fullNameEnglish')} *</label>
                  <input type="text" required value={editPatient.full_name} onChange={(e) => setEditPatient({ ...editPatient, full_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('fullNameArabic')}</label>
                  <input type="text" value={editPatient.full_name_ar} onChange={(e) => setEditPatient({ ...editPatient, full_name_ar: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('date_of_birth')}</label>
                  <input type="date" value={editPatient.date_of_birth} onChange={(e) => setEditPatient({ ...editPatient, date_of_birth: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('gender')}</label>
                  <select value={editPatient.gender} onChange={(e) => setEditPatient({ ...editPatient, gender: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500">
                    <option value="male">{t('male')}</option>
                    <option value="female">{t('female')}</option>
                    <option value="other">{t('gender_other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('phone')}</label>
                  <input type="tel" value={editPatient.phone} onChange={(e) => setEditPatient({ ...editPatient, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
                  <input type="email" value={editPatient.email} onChange={(e) => setEditPatient({ ...editPatient, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('bloodType')}</label>
                  <select value={editPatient.blood_type} onChange={(e) => setEditPatient({ ...editPatient, blood_type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500">
                    <option value="">Select...</option>
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
                  <input type="text" value={editPatient.address} onChange={(e) => setEditPatient({ ...editPatient, address: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
                  <textarea value={editPatient.medical_history} onChange={(e) => setEditPatient({ ...editPatient, medical_history: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('allergies')}</label>
                  <textarea value={editPatient.allergies} onChange={(e) => setEditPatient({ ...editPatient, allergies: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>

                <div className="md:col-span-2 p-5 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <label className="block text-base font-bold text-red-900">{t('medical_conditions') || 'Medical Conditions'}</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-red-200 rounded-lg hover:bg-red-50 transition cursor-pointer">
                      <input type="checkbox" checked={editPatient.has_hepatitis_b} onChange={(e) => setEditPatient({ ...editPatient, has_hepatitis_b: e.target.checked })} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500" />
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-gray-900">{t('hepatitis_b') || 'Hepatitis B'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-red-200 rounded-lg hover:bg-red-50 transition cursor-pointer">
                      <input type="checkbox" checked={editPatient.has_hepatitis_c} onChange={(e) => setEditPatient({ ...editPatient, has_hepatitis_c: e.target.checked })} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500" />
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-gray-900">{t('hepatitis_c') || 'Hepatitis C'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-green-200 rounded-lg hover:bg-green-50 transition cursor-pointer">
                      <input type="checkbox" checked={editPatient.has_heart_failure} onChange={(e) => setEditPatient({ ...editPatient, has_heart_failure: e.target.checked })} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500" />
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-gray-900">{t('heart_failure') || 'Heart Failure'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-green-200 rounded-lg hover:bg-green-50 transition cursor-pointer">
                      <input type="checkbox" checked={editPatient.has_stent} onChange={(e) => setEditPatient({ ...editPatient, has_stent: e.target.checked })} className="w-5 h-5 text-green-600 border-green-300 rounded focus:ring-green-500" />
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-gray-900">{t('cardiac_stent') || 'Cardiac Stent'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-green-200 rounded-lg hover:bg-amber-50 transition cursor-pointer">
                      <input type="checkbox" checked={editPatient.has_hypertension} onChange={(e) => setEditPatient({ ...editPatient, has_hypertension: e.target.checked })} className="w-5 h-5 text-amber-600 border-amber-300 rounded focus:ring-amber-500" />
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-600" />
                        <span className="font-semibold text-gray-900">{t('hypertension') || 'Hypertension'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-yellow-200 rounded-lg hover:bg-yellow-50 transition cursor-pointer">
                      <input type="checkbox" checked={editPatient.has_diabetes} onChange={(e) => setEditPatient({ ...editPatient, has_diabetes: e.target.checked })} className="w-5 h-5 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500" />
                      <div className="flex items-center gap-2">
                        <Droplet className="w-4 h-4 text-yellow-600" />
                        <span className="font-semibold text-gray-900">{t('diabetes') || 'Diabetes'}</span>
                      </div>
                    </label>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('medical_conditions_notes') || 'Additional Medical Notes'}</label>
                    <textarea value={editPatient.medical_conditions_notes} onChange={(e) => setEditPatient({ ...editPatient, medical_conditions_notes: e.target.value })} rows={2} placeholder={t('medical_conditions_notes_placeholder') || 'Additional details about medical conditions...'} className="w-full px-4 py-2 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedPatient(null); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition">Update Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// @ts-nocheck
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Save, X } from 'lucide-react';
import { createStaffAccount } from '@/lib/accounts.functions';


interface NewStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewStaffModal({ isOpen, onClose, onSuccess }: NewStaffModalProps) {
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    full_name: '',
    full_name_ar: '',
    role: 'doctor' as 'clinic_admin' | 'doctor' | 'receptionist' | 'cleaner' | 'worker',
    phone: '',
    specialization: '',
    email: '',
    password: '',
  });

  const [permissions, setPermissions] = useState({
    can_view_appointments: true,
    can_edit_appointments: true,
    can_view_patients: true,
    can_edit_patients: true,
    can_view_treatments: true,
    can_edit_treatments: true,
    can_view_invoices: true,
    can_edit_invoices: false,
    can_view_inventory: false,
    can_edit_inventory: false,
    can_view_accounting: false,
    can_view_staff: false,
    can_edit_staff: false,
    can_view_settings: false,
    view_all_patients: true,
    view_all_appointments: true,
    view_all_invoices: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id) return;

    try {
      await createStaffAccount({
        data: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          full_name_ar: formData.full_name_ar,
          role: formData.role,
          phone: formData.phone,
          specialization: formData.specialization,
          clinic_id: profile.clinic_id,
          permissions: permissions,
        },
      });


      resetForm();
      onSuccess?.();
      onClose();
      alert(`Staff member created successfully!\n\nLogin credentials:\nEmail: ${formData.email}\nPassword: (as provided)\n\nPlease share these credentials with the staff member securely.`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      full_name_ar: '',
      role: 'doctor',
      phone: '',
      specialization: '',
      email: '',
      password: '',
    });
    setPermissions({
      can_view_appointments: true,
      can_edit_appointments: true,
      can_view_patients: true,
      can_edit_patients: true,
      can_view_treatments: true,
      can_edit_treatments: true,
      can_view_invoices: true,
      can_edit_invoices: false,
      can_view_inventory: false,
      can_edit_inventory: false,
      can_view_accounting: false,
      can_view_staff: false,
      can_edit_staff: false,
      can_view_settings: false,
      view_all_patients: true,
      view_all_appointments: true,
      view_all_invoices: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">{t('addNewStaffMember')}</h2>
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

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Creating separate login credentials:</strong> Each staff member will receive their own email and password to access the system.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name (Arabic)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.full_name_ar}
                  onChange={(e) => setFormData({ ...formData, full_name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="clinic_admin">Clinic Admin / Head Dentist</option>
                  <option value="doctor">{t('dentist') || 'Dentist'}</option>
                  <option value="receptionist">{t('receptionist') || 'Receptionist'}</option>
                  <option value="cleaner">{t('clinicTypes.cleaners') || 'Cleaner'}</option>
                  <option value="worker">{t('clinicTypes.workers') || 'Worker'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization / Position
                </label>
                <input
                  type="text"
                  list="specializations"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g., General Dentistry, Orthodontist..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <datalist id="specializations">
                  <option value="General Dentistry" />
                  <option value="Orthodontist" />
                  <option value="Oral Surgeon" />
                  <option value="Endodontist (Root Canal Specialist)" />
                  <option value="Periodontist (Gum Specialist)" />
                  <option value="Prosthodontist (Restorative)" />
                  <option value="Pediatric Dentist" />
                  <option value="Cosmetic Dentist" />
                  <option value="Dental Hygienist" />
                  <option value="Dental Assistant" />
                  <option value="Front Desk / Reception" />
                  <option value="Office Manager" />
                  <option value="Dental Technician" />
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>

            {formData.role !== 'clinic_admin' && (
              <div className="mt-6 p-4 border-2 border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions & Access Control</h3>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>Customize access:</strong> Enable or disable specific modules and actions for this staff member.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">{t('appointments')}</h4>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_appointments}
                          onChange={(e) => setPermissions({ ...permissions, can_view_appointments: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">{t('canViewAppointments')}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_appointments}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_appointments: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">Can create/edit appointments</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.view_all_appointments}
                          onChange={(e) => setPermissions({ ...permissions, view_all_appointments: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">View all appointments (or only assigned)</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">{t('patients')}</h4>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_patients}
                          onChange={(e) => setPermissions({ ...permissions, can_view_patients: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">{t('canViewPatients')}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_patients}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_patients: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">Can create/edit patients</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.view_all_patients}
                          onChange={(e) => setPermissions({ ...permissions, view_all_patients: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">View all patients (or only assigned)</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">{t('treatments')}</h4>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_treatments}
                          onChange={(e) => setPermissions({ ...permissions, can_view_treatments: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">{t('canViewTreatments')}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_treatments}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_treatments: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">Can add/edit treatments</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">{t('invoices')}</h4>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_invoices}
                          onChange={(e) => setPermissions({ ...permissions, can_view_invoices: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">{t('canViewInvoices')}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_invoices}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_invoices: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">Can create/edit invoices</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.view_all_invoices}
                          onChange={(e) => setPermissions({ ...permissions, view_all_invoices: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">View all invoices (or only assigned)</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">{t('administrative')}</h4>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_inventory}
                          onChange={(e) => setPermissions({ ...permissions, can_view_inventory: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">{t('canViewInventory')}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_inventory}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_inventory: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">{t('canEditInventory')}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_accounting}
                          onChange={(e) => setPermissions({ ...permissions, can_view_accounting: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">{t('canViewAccounting')}</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">{t('system')}</h4>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_staff}
                          onChange={(e) => setPermissions({ ...permissions, can_view_staff: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">{t('canViewStaff')}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_staff}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_staff: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">Can add/edit staff</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_settings}
                          onChange={(e) => setPermissions({ ...permissions, can_view_settings: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm">Can view/edit settings</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                <Save className="w-5 h-5" />
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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

// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, AlertTriangle, Clock } from 'lucide-react';
import { getDateInputValue, getTimeInputValue, createDateTimeString, formatLocalTime } from '../../utils/dateTimeHelper';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment?: any;
}

interface ConflictInfo {
  appointment_id: string;
  patient_name: string;
  appointment_start: string;
  appointment_end: string;
  appointment_type: string;
}

export function NewAppointmentModal({ isOpen, onClose, onSuccess, appointment }: NewAppointmentModalProps) {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [alternativeSlots, setAlternativeSlots] = useState<string[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    duration_minutes: 30,
    appointment_type: 'checkup',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (appointment) {
        setNewAppointment({
          patient_id: appointment.patient_id || '',
          doctor_id: appointment.doctor_id || '',
          appointment_date: getDateInputValue(appointment.appointment_date),
          appointment_time: getTimeInputValue(appointment.appointment_date),
          duration_minutes: appointment.duration_minutes || 30,
          appointment_type: appointment.appointment_type || 'checkup',
          notes: appointment.notes || ''
        });
      } else {
        setNewAppointment({
          patient_id: '',
          doctor_id: '',
          appointment_date: '',
          appointment_time: '',
          duration_minutes: 30,
          appointment_type: 'checkup',
          notes: ''
        });
      }
    }
  }, [isOpen, profile, appointment]);

  const loadData = async () => {
    if (!profile?.clinic_id) return;

    try {
      let patientsQuery = supabase
        .from('patients')
        .select('id, full_name, patient_number')
        .eq('clinic_id', profile.clinic_id)
        .order('full_name');

      if (profile.role === 'doctor') {
        const { data: perms } = await supabase
          .from('staff_permissions')
          .select('view_all_patients')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (perms && perms.view_all_patients === false) {
          patientsQuery = patientsQuery.eq('assigned_doctor_id', profile.id);
        }
      }

      const [patientsRes, doctorsRes] = await Promise.all([
        patientsQuery,
        supabase
          .from('users')
          .select('id, full_name')
          .eq('clinic_id', profile.clinic_id)
          .in('role', ['clinic_admin', 'doctor'])
          .eq('is_active', true)
          .order('full_name')
      ]);

      setPatients(patientsRes.data || []);
      setDoctors(doctorsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const checkConflicts = async () => {
    if (!newAppointment.appointment_date || !newAppointment.appointment_time || !newAppointment.doctor_id) {
      setConflicts([]);
      return;
    }

    const doctorId = profile.role === 'doctor' ? profile.id : newAppointment.doctor_id;
    if (!doctorId) return;

    setCheckingConflicts(true);
    try {
      const dateTime = createDateTimeString(newAppointment.appointment_date, newAppointment.appointment_time);

      const { data, error } = await supabase.rpc('get_all_appointment_conflicts', {
        p_doctor_id: doctorId,
        p_appointment_date: dateTime,
        p_duration_minutes: newAppointment.duration_minutes,
        p_exclude_appointment_id: appointment?.id || null
      });

      if (error) throw error;
      setConflicts(data || []);

      if (data && data.length > 0) {
        await loadAlternativeSlots();
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const loadAlternativeSlots = async () => {
    if (!newAppointment.appointment_date || !profile?.clinic_id) return;

    try {
      const doctorId = profile.role === 'doctor' ? profile.id : newAppointment.doctor_id;
      if (!doctorId) return;

      const { data, error } = await supabase.rpc('suggest_alternative_slots', {
        p_doctor_id: doctorId,
        p_desired_date: newAppointment.appointment_date,
        p_duration_minutes: newAppointment.duration_minutes,
        p_clinic_id: profile.clinic_id
      });

      if (error) throw error;
      setAlternativeSlots((data || []).map((slot: any) => slot.suggested_time).slice(0, 6));
    } catch (error) {
      console.error('Error loading alternative slots:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkConflicts();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [newAppointment.appointment_date, newAppointment.appointment_time, newAppointment.doctor_id, newAppointment.duration_minutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id || !profile?.id) return;

    if (conflicts.length > 0) {
      alert(t('conflictError') || 'This appointment conflicts with existing appointments. Please choose a different time or use suggested alternatives.');
      return;
    }

    try {
      const dateTime = createDateTimeString(newAppointment.appointment_date, newAppointment.appointment_time);
      const doctorId = profile.role === 'doctor' ? profile.id : newAppointment.doctor_id;

      if (appointment) {
        const { error } = await supabase
          .from('appointments')
          .update({
            patient_id: newAppointment.patient_id,
            doctor_id: doctorId,
            appointment_date: dateTime,
            duration_minutes: newAppointment.duration_minutes,
            appointment_type: newAppointment.appointment_type,
            notes: newAppointment.notes
          })
          .eq('id', appointment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('appointments').insert({
          clinic_id: profile.clinic_id,
          patient_id: newAppointment.patient_id,
          doctor_id: doctorId,
          appointment_date: dateTime,
          duration_minutes: newAppointment.duration_minutes,
          appointment_type: newAppointment.appointment_type,
          notes: newAppointment.notes,
          created_by: profile.id,
          status: 'scheduled'
        });

        if (error) throw error;
      }

      setNewAppointment({
        patient_id: '',
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        duration_minutes: 30,
        appointment_type: 'checkup',
        notes: ''
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert(`Failed to ${appointment ? 'update' : 'create'} appointment`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="relative shrink-0 bg-slate-900 px-5 pb-4 pt-4 text-white">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
          <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/50">
            {appointment ? (t('edit') || 'Edit') : (t('new') || 'New')}
          </div>
          <h2 className="mt-0.5 text-xl font-black">
            {appointment ? (t('editAppointment') || 'Edit Appointment') : t('scheduleNewAppointment')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient *
              </label>
              <select
                required
                value={newAppointment.patient_id}
                onChange={(e) => setNewAppointment({ ...newAppointment, patient_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="">{t('selectPatientPlaceholder')}</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name} ({patient.patient_number})
                  </option>
                ))}
              </select>
            </div>

            {profile?.role !== 'doctor' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctor *
                </label>
                <select
                  required
                  value={newAppointment.doctor_id}
                  onChange={(e) => setNewAppointment({ ...newAppointment, doctor_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">{t('selectDoctorPlaceholder')}</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                required
                value={newAppointment.appointment_date}
                onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time *
              </label>
              <input
                type="time"
                required
                value={newAppointment.appointment_time}
                onChange={(e) => setNewAppointment({ ...newAppointment, appointment_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <select
                value={newAppointment.appointment_type}
                onChange={(e) => setNewAppointment({ ...newAppointment, appointment_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="checkup">{t('checkup')}</option>
                <option value="treatment">{t('treatment')}</option>
                <option value="emergency">{t('emergency')}</option>
                <option value="followup">{t('followup')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={newAppointment.duration_minutes}
                onChange={(e) => setNewAppointment({ ...newAppointment, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {checkingConflicts && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
              <span className="ml-3 text-gray-600">{t('checkingAvailability') || 'Checking availability...'}</span>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    {t('appointmentConflict') || 'Scheduling Conflict Detected!'}
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    {t('conflictMessage') || 'This time slot conflicts with existing appointments:'}
                  </p>
                  <div className="space-y-2">
                    {conflicts.map((conflict) => (
                      <div key={conflict.appointment_id} className="bg-white rounded p-3 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{conflict.patient_name}</p>
                            <p className="text-sm text-gray-600">
                              {formatLocalTime(conflict.appointment_start)} - {formatLocalTime(conflict.appointment_end)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t(conflict.appointment_type) || conflict.appointment_type}
                            </p>
                          </div>
                          <Clock className="w-5 h-5 text-red-500" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {alternativeSlots.length > 0 && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAlternatives(!showAlternatives)}
                        className="text-sm font-medium text-sky-600 hover:text-sky-700 underline"
                      >
                        {showAlternatives
                          ? (t('hideAlternatives') || 'Hide alternative times')
                          : (t('showAlternatives') || 'Show available alternative times')}
                      </button>

                      {showAlternatives && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {alternativeSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                const normalized = slot.replace(' ', 'T');
                                const [datePart, timePart] = normalized.split('T');
                                setNewAppointment({
                                  ...newAppointment,
                                  appointment_date: datePart,
                                  appointment_time: timePart.slice(0, 5)
                                });
                                setShowAlternatives(false);
                              }}
                              className="px-3 py-2 bg-white border border-sky-300 text-sky-700 rounded-lg hover:bg-sky-50 transition text-sm font-medium"
                            >
                              {formatLocalTime(slot)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {conflicts.length === 0 && newAppointment.appointment_date && newAppointment.appointment_time && !checkingConflicts && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-green-700 font-medium">
                {t('timeSlotAvailable') || '✓ Time slot is available'}
              </span>
            </div>
          )}

          <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t border-neutral-200 bg-white p-4 sm:-mx-6 sm:-mb-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-neutral-50 sm:flex-none"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={conflicts.length > 0 || checkingConflicts}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none sm:px-6 ${
                conflicts.length > 0 || checkingConflicts
                  ? 'cursor-not-allowed bg-neutral-200 text-neutral-400'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {appointment ? (t('updateAppointment') || 'Update Appointment') : t('scheduleAppointment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

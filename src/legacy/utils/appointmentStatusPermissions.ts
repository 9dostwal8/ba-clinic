// @ts-nocheck
// Who may change an appointment/visit status.
// - Receptionists: check-in only ("arrived"). Everything else is dentist-owned.
// - Dentists: any clinical status, but only for appointments assigned to them.
// - Clinic admins / super admins: full control.

export const RECEPTION_ALLOWED_STATUSES = ['arrived'];

export function isReception(profile: any) {
  return profile?.role === 'receptionist' || profile?.role === 'reception';
}

export function isDoctorRole(profile: any) {
  return profile?.role === 'doctor' || profile?.role === 'dentist';
}

export function isAdminRole(profile: any) {
  return profile?.role === 'clinic_admin' || profile?.role === 'admin' || profile?.role === 'super_admin';
}

export function canSetAppointmentStatus(profile: any, appointment: any, nextStatus: string) {
  if (!profile) return false;
  if (isAdminRole(profile)) return true;
  if (isReception(profile)) return RECEPTION_ALLOWED_STATUSES.includes(nextStatus);
  if (isDoctorRole(profile)) {
    const doctorId = appointment?.doctor_id ?? appointment?.doctorId;
    return !doctorId || doctorId === profile.id;
  }
  return false;
}

export function statusPermissionMessage(profile: any, ar = false) {
  if (isReception(profile)) {
    return ar
      ? 'الاستقبال يمكنه تسجيل الحضور فقط — بقية الحالات يحدّثها الطبيب المسؤول.'
      : 'Reception can only check patients in — other statuses are updated by the responsible dentist.';
  }
  return ar
    ? 'يمكن للطبيب المسؤول فقط تحديث حالة هذا الموعد.'
    : 'Only the responsible dentist can update this appointment status.';
}

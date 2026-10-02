import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

type StaffRole = 'clinic_admin' | 'doctor' | 'receptionist' | 'cleaner' | 'worker'

const STAFF_ROLES: StaffRole[] = ['clinic_admin', 'doctor', 'receptionist', 'cleaner', 'worker']

export interface CreateStaffInput {
  email: string
  password: string
  full_name: string
  full_name_ar?: string | null
  role: StaffRole
  phone?: string | null
  specialization?: string | null
  clinic_id: string
  permissions?: Record<string, boolean> | null
}

/**
 * Provision a staff login for a clinic.
 * Super admins may target any clinic; clinic admins only their own clinic
 * (and may not create another super admin).
 */
export const createStaffAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateStaffInput) => {
    if (!input?.email || !input?.password) throw new Error('Email and password are required')
    if (input.password.length < 8) throw new Error('Password must be at least 8 characters')
    if (!input.full_name) throw new Error('Full name is required')
    if (!input.clinic_id) throw new Error('Clinic is required')
    if (!STAFF_ROLES.includes(input.role)) throw new Error('Invalid role')
    return input
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context

    const { data: me, error: meError } = await supabase
      .from('users')
      .select('role, clinic_id')
      .eq('id', userId)
      .maybeSingle()

    if (meError) throw new Error(meError.message)
    if (!me) throw new Error('Forbidden')

    const isSuperAdmin = me.role === 'super_admin'
    const isClinicAdmin = me.role === 'clinic_admin' && me.clinic_id === data.clinic_id
    if (!isSuperAdmin && !isClinicAdmin) throw new Error('Forbidden')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    })
    if (authError || !created?.user) throw new Error(authError?.message || 'Failed to create login')

    const newUserId = created.user.id

    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: newUserId,
      clinic_id: data.clinic_id,
      role: data.role,
      full_name: data.full_name,
      full_name_ar: data.full_name_ar ?? null,
      phone: data.phone ?? null,
      specialization: data.specialization ?? null,
      is_active: true,
      must_change_password: true,

    })
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw new Error(profileError.message)
    }

    if (data.role === 'doctor' || data.role === 'receptionist') {
      await supabaseAdmin
        .from('staff_permissions')
        .insert({ user_id: newUserId, ...(data.permissions ?? {}) })
    }

    return { success: true, user_id: newUserId }
  })

export interface CreateClinicAdminInput {
  clinic_id: string
  email: string
  password: string
  full_name: string
  phone?: string | null
}

/** Super admin only: create the clinic's own admin (owner) login. */
export const createClinicAdminAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateClinicAdminInput) => {
    if (!input?.clinic_id) throw new Error('Clinic is required')
    if (!input?.email || !input?.password) throw new Error('Email and password are required')
    if (input.password.length < 8) throw new Error('Password must be at least 8 characters')
    if (!input.full_name) throw new Error('Full name is required')
    return input
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context

    const { data: me, error: meError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    if (meError) throw new Error(meError.message)
    if (me?.role !== 'super_admin') throw new Error('Only the platform admin can create clinic admins')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    })
    if (authError || !created?.user) throw new Error(authError?.message || 'Failed to create login')

    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: created.user.id,
      clinic_id: data.clinic_id,
      role: 'clinic_admin',
      full_name: data.full_name,
      phone: data.phone ?? null,
      is_active: true,
      must_change_password: true,
    })
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id)
      throw new Error(profileError.message)
    }

    return { success: true, user_id: created.user.id }
  })

/**
 * Signed-in user replaces their temporary password with their own and
 * clears the forced-change flag.
 */
export const setOwnPassword = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { password: string }) => {
    if (!input?.password || input.password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }
    return input
  })
  .handler(async ({ data, context }) => {
    const { userId } = context
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.password,
    })
    if (error) throw new Error(error.message)

    const { error: flagError } = await supabaseAdmin
      .from('users')
      .update({ must_change_password: false })
      .eq('id', userId)
    if (flagError) throw new Error(flagError.message)

    return { success: true }
  })


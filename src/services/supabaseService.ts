import { requireSupabase } from '../lib/supabase';
import {
  AttendanceRecord,
  Enquiry,
  EnquirySource,
  EnquiryStatus,
  GymWorkspaceData,
  Member,
  MembershipPlan,
  MembershipRecord,
  MemberStatus,
  NotificationPreferences,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  PlanCycle,
  Profile,
  ReminderStatus,
  Trainer,
} from '../types/gym';
import {
  calculateExpiryDate,
  getTodayISO,
  normalizeIndianPhone,
} from '../utils/membership';

// ============================================================================
// ROW MAPPERS (PostgreSQL snake_case -> App camelCase)
// ============================================================================

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  expiryReminder7Days: true,
  expiryReminder3Days: true,
  expiryReminderSameDay: true,
  pendingPaymentAlerts: true,
  dailyBusinessSummary: false,
};

function mapProfile(row: Record<string, unknown>): Profile {
  const prefs = (row.notification_preferences ?? {}) as Partial<NotificationPreferences>;
  return {
    id: String(row.id),
    fullName: String(row.full_name ?? ''),
    gymName: String(row.gym_name ?? 'My Fitness Studio'),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    role: String(row.role ?? 'Founder & Head Coach'),
    tagline: String(row.tagline ?? ''),
    address: String(row.address ?? ''),
    city: String(row.city ?? ''),
    gstNumber: String(row.gst_number ?? ''),
    notifications: { ...DEFAULT_NOTIFICATIONS, ...prefs },
    createdAt: String(row.created_at ?? ''),
  };
}

function mapPlan(row: Record<string, unknown>): MembershipPlan {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name),
    cycle: (row.cycle as PlanCycle) ?? 'Monthly',
    durationMonths: Number(row.duration_months ?? 1),
    fee: Number(row.fee ?? 0),
    description: String(row.description ?? ''),
    createdAt: String(row.created_at ?? ''),
  };
}

function mapMembership(row: Record<string, unknown>): MembershipRecord {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    memberId: String(row.member_id),
    planId: row.plan_id ? String(row.plan_id) : null,
    planName: String(row.plan_name),
    durationMonths: Number(row.duration ?? 1),
    price: Number(row.price ?? 0),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    status: (row.status as MembershipRecord['status']) ?? 'Active',
    createdAt: String(row.created_at ?? ''),
  };
}

function mapMember(
  row: Record<string, unknown>,
  latestMembership?: MembershipRecord | null
): Member {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    memberCode: String(row.member_code ?? ''),
    fullName: String(row.full_name ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    gender: (row.gender as Member['gender']) ?? 'Male',
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : null,
    joiningDate: String(row.joining_date ?? getTodayISO()),
    storedStatus: (row.status as MemberStatus) ?? 'Active',
    goal: String(row.goal ?? 'General Fitness'),
    emergencyContact: String(row.emergency_contact ?? ''),
    notes: String(row.notes ?? ''),
    reminderStatus: (row.reminder_status as ReminderStatus) ?? 'Not Sent',
    lastReminderDate: row.last_reminder_date ? String(row.last_reminder_date) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    latestMembership: latestMembership ?? null,
  };
}

function mapPayment(
  row: Record<string, unknown>,
  memberNameMap: Map<string, string>
): PaymentRecord {
  const memberId = String(row.member_id);
  const joinedMember = row.members as { full_name?: string } | null | undefined;
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    memberId,
    memberName: joinedMember?.full_name ?? memberNameMap.get(memberId) ?? 'Member',
    membershipId: row.membership_id ? String(row.membership_id) : null,
    planName: String(row.plan_name ?? 'Membership Fee'),
    amount: Number(row.amount ?? 0),
    paymentDate: String(row.payment_date ?? getTodayISO()),
    method: (row.payment_method as PaymentMethod) ?? 'UPI',
    status: (row.status as PaymentStatus) ?? 'Paid',
    transactionReference: String(row.transaction_reference ?? ''),
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at ?? ''),
  };
}

function mapAttendance(
  row: Record<string, unknown>,
  memberMap: Map<string, Member>
): AttendanceRecord {
  const memberId = String(row.member_id);
  const member = memberMap.get(memberId);
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    memberId,
    memberName: member?.fullName ?? 'Member',
    memberCode: member?.memberCode ?? '',
    checkIn: String(row.check_in),
    checkOut: row.check_out ? String(row.check_out) : null,
    createdAt: String(row.created_at ?? ''),
  };
}

function mapTrainer(row: Record<string, unknown>): Trainer {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    fullName: String(row.full_name ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    specialization: String(row.specialization ?? ''),
    salary: Number(row.salary ?? 0),
    joiningDate: String(row.joining_date ?? getTodayISO()),
    createdAt: String(row.created_at ?? ''),
  };
}

function mapEnquiry(row: Record<string, unknown>): Enquiry {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    fullName: String(row.full_name ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    source: (row.source as EnquirySource) ?? 'Walk-in',
    interestedPlan: String(row.interested_plan ?? ''),
    status: (row.status as EnquiryStatus) ?? 'New',
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at ?? ''),
  };
}

export function formatSupabaseError(error: unknown, fallback = 'Database operation failed.'): string {
  if (!error) return fallback;
  const errObj = error as { message?: string; code?: string; details?: string };
  const msg = errObj.message || fallback;

  if (errObj.code === '42P01' || msg.includes('Could not find the table')) {
    return 'Database tables are not created yet. Please run supabase/schema.sql in your Supabase SQL Editor.';
  }
  if (errObj.code === '23505' && msg.includes('idx_attendance_active_checkin')) {
    return 'This member is already checked in. Please check them out before starting a new visit.';
  }
  return msg;
}

export function generateNextMemberCode(members: Member[]): string {
  const maxNum = members.reduce((max, m) => {
    const match = m.memberCode.match(/GF-(\d+)/);
    const num = match ? parseInt(match[1], 10) : 1000;
    return Math.max(max, num);
  }, 1000);
  return `GF-${maxNum + 1}`;
}

export function generateTransactionReference(payments: PaymentRecord[]): string {
  const year = new Date().getFullYear();
  const maxNum = payments.reduce((max, p) => {
    const parts = p.transactionReference.split('-');
    const num = parseInt(parts[parts.length - 1] || '400', 10);
    return Math.max(max, isNaN(num) ? 400 : num);
  }, 400);
  return `INV-${year}-${String(maxNum + 1).padStart(4, '0')}`;
}

// ============================================================================
// WORKSPACE LOADER (All queries strictly scoped to authenticated owner)
// ============================================================================

export async function loadOwnerWorkspace(userId: string): Promise<GymWorkspaceData> {
  const sb = requireSupabase();

  const [
    profileRes,
    plansRes,
    membersRes,
    membershipsRes,
    paymentsRes,
    attendanceRes,
    trainersRes,
    enquiriesRes,
  ] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
    sb.from('membership_plans').select('*').order('duration_months', { ascending: true }),
    sb.from('members').select('*').order('created_at', { ascending: false }),
    sb.from('memberships').select('*').order('end_date', { ascending: false }),
    sb.from('payments').select('*').order('payment_date', { ascending: false }),
    sb.from('attendance').select('*').order('check_in', { ascending: false }).limit(250),
    sb.from('trainers').select('*').order('created_at', { ascending: false }),
    sb.from('enquiries').select('*').order('created_at', { ascending: false }),
  ]);

  if (profileRes.error) throw new Error(formatSupabaseError(profileRes.error));
  if (plansRes.error) throw new Error(formatSupabaseError(plansRes.error));
  if (membersRes.error) throw new Error(formatSupabaseError(membersRes.error));
  if (membershipsRes.error) throw new Error(formatSupabaseError(membershipsRes.error));
  if (paymentsRes.error) throw new Error(formatSupabaseError(paymentsRes.error));
  if (attendanceRes.error) throw new Error(formatSupabaseError(attendanceRes.error));
  if (trainersRes.error) throw new Error(formatSupabaseError(trainersRes.error));
  if (enquiriesRes.error) throw new Error(formatSupabaseError(enquiriesRes.error));

  let profile: Profile;
  if (!profileRes.data) {
    // Ensure profile exists if user registered before trigger or via magic link
    const { data: userData } = await sb.auth.getUser();
    const meta = (userData.user?.user_metadata ?? {}) as Record<string, string>;
    const insertRes = await sb
      .from('profiles')
      .upsert({
        id: userId,
        full_name: meta.full_name || userData.user?.email?.split('@')[0] || 'Gym Owner',
        gym_name: meta.gym_name || 'My Fitness Studio',
        email: userData.user?.email || '',
        phone: meta.phone || '',
        city: meta.city || '',
      })
      .select('*')
      .single();
    if (insertRes.error) throw new Error(formatSupabaseError(insertRes.error));
    profile = mapProfile(insertRes.data);
  } else {
    profile = mapProfile(profileRes.data);
  }

  const plans = (plansRes.data ?? []).map(mapPlan);
  const memberships = (membershipsRes.data ?? []).map(mapMembership);

  const latestMembershipByMember = new Map<string, MembershipRecord>();
  memberships.forEach((ms) => {
    const existing = latestMembershipByMember.get(ms.memberId);
    if (!existing || ms.endDate > existing.endDate) {
      latestMembershipByMember.set(ms.memberId, ms);
    }
  });

  const members = (membersRes.data ?? []).map((row) =>
    mapMember(row, latestMembershipByMember.get(String(row.id)) ?? null)
  );

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const memberNameMap = new Map(members.map((m) => [m.id, m.fullName]));

  const payments = (paymentsRes.data ?? []).map((row) => mapPayment(row, memberNameMap));
  const attendance = (attendanceRes.data ?? []).map((row) => mapAttendance(row, memberMap));
  const trainers = (trainersRes.data ?? []).map(mapTrainer);
  const enquiries = (enquiriesRes.data ?? []).map(mapEnquiry);

  return {
    profile,
    plans,
    members,
    memberships,
    payments,
    attendance,
    trainers,
    enquiries,
  };
}

// ============================================================================
// PROFILE / SETTINGS SERVICE
// ============================================================================

export async function updateOwnerProfileRow(profile: Profile): Promise<Profile> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('profiles')
    .update({
      full_name: profile.fullName,
      gym_name: profile.gymName,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      tagline: profile.tagline,
      address: profile.address,
      city: profile.city,
      gst_number: profile.gstNumber,
      notification_preferences: profile.notifications,
    })
    .eq('id', profile.id)
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapProfile(data);
}

// ============================================================================
// MEMBERSHIP PLANS SERVICE
// ============================================================================

export const SAMPLE_MEMBERSHIP_PLANS: Array<
  Omit<MembershipPlan, 'id' | 'ownerId' | 'createdAt'>
> = [
  {
    name: 'Basic Monthly',
    durationMonths: 1,
    fee: 999,
    cycle: 'Monthly',
    description: 'Basic gym access for one month.',
  },
  {
    name: 'Standard Quarterly',
    durationMonths: 3,
    fee: 2499,
    cycle: 'Quarterly',
    description: 'Gym access for three months with regular workout support.',
  },
  {
    name: 'Premium Half-Yearly',
    durationMonths: 6,
    fee: 4499,
    cycle: 'Half-Yearly',
    description: 'Six-month gym membership with premium support.',
  },
  {
    name: 'Annual Membership',
    durationMonths: 12,
    fee: 7999,
    cycle: 'Yearly',
    description: 'Full-year gym access.',
  },
];

const inFlightSeedByOwner = new Map<string, Promise<MembershipPlan[]>>();

export async function seedSamplePlansForOwner(ownerId: string): Promise<MembershipPlan[]> {
  if (!ownerId) {
    throw new Error('Authenticated gym owner ID is required to create sample plans.');
  }

  const existingPromise = inFlightSeedByOwner.get(ownerId);
  if (existingPromise) {
    return existingPromise;
  }

  const run = (async () => {
    const sb = requireSupabase();
    const { data: existingRows, error: fetchErr } = await sb
      .from('membership_plans')
      .select('name')
      .eq('owner_id', ownerId);

    if (fetchErr) throw new Error(formatSupabaseError(fetchErr));

    const existingNames = new Set(
      (existingRows ?? []).map((row) => String(row.name ?? '').trim().toLowerCase())
    );

    const missingPlans = SAMPLE_MEMBERSHIP_PLANS.filter(
      (plan) => !existingNames.has(plan.name.trim().toLowerCase())
    );

    if (missingPlans.length === 0) {
      return [];
    }

    const { data: insertedRows, error: insertErr } = await sb
      .from('membership_plans')
      .insert(
        missingPlans.map((plan) => ({
          owner_id: ownerId,
          name: plan.name,
          cycle: plan.cycle,
          duration_months: plan.durationMonths,
          fee: plan.fee,
          description: plan.description,
        }))
      )
      .select('*');

    if (insertErr) throw new Error(formatSupabaseError(insertErr));
    return (insertedRows ?? []).map(mapPlan);
  })();

  inFlightSeedByOwner.set(ownerId, run);
  try {
    return await run;
  } finally {
    inFlightSeedByOwner.delete(ownerId);
  }
}

export async function createPlanRow(
  ownerId: string,
  plan: Omit<MembershipPlan, 'id' | 'ownerId' | 'createdAt'>
): Promise<MembershipPlan> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('membership_plans')
    .insert({
      owner_id: ownerId,
      name: plan.name,
      cycle: plan.cycle,
      duration_months: plan.durationMonths,
      fee: plan.fee,
      description: plan.description,
    })
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapPlan(data);
}

export async function updatePlanRow(
  planId: string,
  updates: Partial<MembershipPlan>
): Promise<MembershipPlan> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.cycle !== undefined) payload.cycle = updates.cycle;
  if (updates.durationMonths !== undefined) payload.duration_months = updates.durationMonths;
  if (updates.fee !== undefined) payload.fee = updates.fee;
  if (updates.description !== undefined) payload.description = updates.description;

  const { data, error } = await sb
    .from('membership_plans')
    .update(payload)
    .eq('id', planId)
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapPlan(data);
}

export async function deletePlanRow(planId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('membership_plans').delete().eq('id', planId);
  if (error) throw new Error(formatSupabaseError(error));
}

// ============================================================================
// MEMBERS & MEMBERSHIPS SERVICE
// ============================================================================

export interface CreateMemberPayload {
  ownerId: string;
  memberCode: string;
  fullName: string;
  phone: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string | null;
  joiningDate: string;
  goal: string;
  emergencyContact: string;
  notes: string;
  // Optional initial membership assignment
  plan?: MembershipPlan | null;
  startDate?: string;
  endDate?: string;
  initialPaymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  amountPaid?: number;
  transactionReference: string;
}

export async function createMemberWithMembership(
  payload: CreateMemberPayload
): Promise<{
  member: Member;
  membership: MembershipRecord | null;
  payment: PaymentRecord | null;
}> {
  const sb = requireSupabase();
  const today = getTodayISO();
  const initialStoredStatus: MemberStatus =
    payload.plan && payload.endDate && payload.endDate < today
      ? 'Expired'
      : payload.initialPaymentStatus === 'Pending'
        ? 'Pending'
        : 'Active';

  const { data: memberRow, error: memberErr } = await sb
    .from('members')
    .insert({
      owner_id: payload.ownerId,
      member_code: payload.memberCode,
      full_name: payload.fullName.trim(),
      email: payload.email.trim(),
      phone: normalizeIndianPhone(payload.phone),
      gender: payload.gender,
      date_of_birth: payload.dateOfBirth || null,
      joining_date: payload.joiningDate || today,
      status: initialStoredStatus,
      goal: payload.goal.trim() || 'General Fitness',
      emergency_contact: normalizeIndianPhone(payload.emergencyContact || payload.phone),
      notes: payload.notes.trim(),
    })
    .select('*')
    .single();

  if (memberErr) throw new Error(formatSupabaseError(memberErr));

  let createdMembership: MembershipRecord | null = null;
  let createdPayment: PaymentRecord | null = null;

  if (payload.plan && payload.startDate && payload.endDate) {
    const msStatus =
      payload.endDate < today
        ? 'Expired'
        : payload.startDate > today
          ? 'Pending'
          : 'Active';

    const { data: msRow, error: msErr } = await sb
      .from('memberships')
      .insert({
        owner_id: payload.ownerId,
        member_id: memberRow.id,
        plan_id: payload.plan.id,
        plan_name: payload.plan.name,
        duration: payload.plan.durationMonths,
        price: payload.plan.fee,
        start_date: payload.startDate,
        end_date: payload.endDate,
        status: msStatus,
      })
      .select('*')
      .single();

    if (msErr) throw new Error(formatSupabaseError(msErr));
    createdMembership = mapMembership(msRow);

    if (payload.amountPaid !== undefined && payload.initialPaymentStatus && payload.paymentMethod) {
      const { data: payRow, error: payErr } = await sb
        .from('payments')
        .insert({
          owner_id: payload.ownerId,
          member_id: memberRow.id,
          membership_id: createdMembership.id,
          plan_name: payload.plan.name,
          amount: payload.amountPaid,
          payment_date: today,
          payment_method: payload.paymentMethod,
          status: payload.initialPaymentStatus,
          transaction_reference: payload.transactionReference,
          notes:
            payload.initialPaymentStatus === 'Pending'
              ? 'Initial membership invoice pending'
              : 'Initial membership registration',
        })
        .select('*')
        .single();

      if (payErr) throw new Error(formatSupabaseError(payErr));
      const nameMap = new Map([[String(memberRow.id), String(memberRow.full_name)]]);
      createdPayment = mapPayment(payRow, nameMap);
    }
  }

  return {
    member: mapMember(memberRow, createdMembership),
    membership: createdMembership,
    payment: createdPayment,
  };
}

export async function updateMemberRow(
  memberId: string,
  updates: Partial<{
    fullName: string;
    phone: string;
    email: string;
    gender: 'Male' | 'Female' | 'Other';
    dateOfBirth: string | null;
    joiningDate: string;
    storedStatus: MemberStatus;
    goal: string;
    emergencyContact: string;
    notes: string;
    reminderStatus: ReminderStatus;
    lastReminderDate: string | null;
  }>
): Promise<Member> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (updates.fullName !== undefined) payload.full_name = updates.fullName.trim();
  if (updates.phone !== undefined) payload.phone = normalizeIndianPhone(updates.phone);
  if (updates.email !== undefined) payload.email = updates.email.trim();
  if (updates.gender !== undefined) payload.gender = updates.gender;
  if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth || null;
  if (updates.joiningDate !== undefined) payload.joining_date = updates.joiningDate;
  if (updates.storedStatus !== undefined) payload.status = updates.storedStatus;
  if (updates.goal !== undefined) payload.goal = updates.goal.trim();
  if (updates.emergencyContact !== undefined) {
    payload.emergency_contact = normalizeIndianPhone(updates.emergencyContact);
  }
  if (updates.notes !== undefined) payload.notes = updates.notes.trim();
  if (updates.reminderStatus !== undefined) payload.reminder_status = updates.reminderStatus;
  if (updates.lastReminderDate !== undefined) {
    payload.last_reminder_date = updates.lastReminderDate;
  }

  const { data, error } = await sb
    .from('members')
    .update(payload)
    .eq('id', memberId)
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapMember(data);
}

export async function deleteMemberRow(memberId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('members').delete().eq('id', memberId);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function assignOrRenewMembershipRow(input: {
  ownerId: string;
  member: Member;
  plan: MembershipPlan;
  startDate: string;
  endDate: string;
  method: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionReference: string;
  notes?: string;
}): Promise<{ membership: MembershipRecord; payment: PaymentRecord; member: Member }> {
  const sb = requireSupabase();
  const today = getTodayISO();
  const msStatus =
    input.endDate < today ? 'Expired' : input.startDate > today ? 'Pending' : 'Active';

  const { data: msRow, error: msErr } = await sb
    .from('memberships')
    .insert({
      owner_id: input.ownerId,
      member_id: input.member.id,
      plan_id: input.plan.id,
      plan_name: input.plan.name,
      duration: input.plan.durationMonths,
      price: input.plan.fee,
      start_date: input.startDate,
      end_date: input.endDate,
      status: msStatus,
    })
    .select('*')
    .single();

  if (msErr) throw new Error(formatSupabaseError(msErr));
  const membership = mapMembership(msRow);

  const { data: payRow, error: payErr } = await sb
    .from('payments')
    .insert({
      owner_id: input.ownerId,
      member_id: input.member.id,
      membership_id: membership.id,
      plan_name: input.plan.name,
      amount: input.plan.fee,
      payment_date: today,
      payment_method: input.method,
      status: input.paymentStatus,
      transaction_reference: input.transactionReference,
      notes: input.notes ?? 'Membership renewal',
    })
    .select('*')
    .single();

  if (payErr) throw new Error(formatSupabaseError(payErr));

  const nextMemberStatus: MemberStatus =
    input.paymentStatus === 'Pending' ? 'Pending' : msStatus === 'Expired' ? 'Expired' : 'Active';

  const { data: updatedMemberRow, error: memErr } = await sb
    .from('members')
    .update({
      status: nextMemberStatus,
      reminder_status: 'Not Sent',
    })
    .eq('id', input.member.id)
    .select('*')
    .single();

  if (memErr) throw new Error(formatSupabaseError(memErr));

  const nameMap = new Map([[input.member.id, input.member.fullName]]);
  return {
    membership,
    payment: mapPayment(payRow, nameMap),
    member: mapMember(updatedMemberRow, membership),
  };
}

export async function updateMembershipDatesRow(
  membershipId: string,
  startDate: string,
  endDate: string
): Promise<MembershipRecord> {
  const sb = requireSupabase();
  const today = getTodayISO();
  const status = endDate < today ? 'Expired' : startDate > today ? 'Pending' : 'Active';
  const { data, error } = await sb
    .from('memberships')
    .update({ start_date: startDate, end_date: endDate, status })
    .eq('id', membershipId)
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapMembership(data);
}

// ============================================================================
// PAYMENTS SERVICE
// ============================================================================

export async function createPaymentRow(input: {
  ownerId: string;
  memberId: string;
  memberName: string;
  membershipId?: string | null;
  planName: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string;
  notes?: string;
}): Promise<PaymentRecord> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('payments')
    .insert({
      owner_id: input.ownerId,
      member_id: input.memberId,
      membership_id: input.membershipId ?? null,
      plan_name: input.planName,
      amount: input.amount,
      payment_date: input.paymentDate,
      payment_method: input.method,
      status: input.status,
      transaction_reference: input.transactionReference,
      notes: input.notes?.trim() ?? '',
    })
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapPayment(data, new Map([[input.memberId, input.memberName]]));
}

export async function markPaymentPaidRow(
  paymentId: string,
  memberName: string,
  method?: PaymentMethod
): Promise<PaymentRecord> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {
    status: 'Paid',
    payment_date: getTodayISO(),
  };
  if (method) payload.payment_method = method;

  const { data, error } = await sb
    .from('payments')
    .update(payload)
    .eq('id', paymentId)
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapPayment(data, new Map([[String(data.member_id), memberName]]));
}

// ============================================================================
// ATTENDANCE SERVICE
// ============================================================================

export async function checkInMemberRow(
  ownerId: string,
  member: Member
): Promise<AttendanceRecord> {
  const sb = requireSupabase();

  // Check for existing active check-in before inserting
  const { data: openCheckIn, error: checkErr } = await sb
    .from('attendance')
    .select('id')
    .eq('member_id', member.id)
    .is('check_out', null)
    .maybeSingle();

  if (checkErr) throw new Error(formatSupabaseError(checkErr));
  if (openCheckIn) {
    throw new Error(`${member.fullName} is already checked in.`);
  }

  const { data, error } = await sb
    .from('attendance')
    .insert({
      owner_id: ownerId,
      member_id: member.id,
      check_in: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapAttendance(data, new Map([[member.id, member]]));
}

export async function checkOutMemberRow(
  attendanceId: string,
  memberMap: Map<string, Member>
): Promise<AttendanceRecord> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('attendance')
    .update({ check_out: new Date().toISOString() })
    .eq('id', attendanceId)
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapAttendance(data, memberMap);
}

// ============================================================================
// TRAINERS SERVICE
// ============================================================================

export async function createTrainerRow(
  ownerId: string,
  trainer: Omit<Trainer, 'id' | 'ownerId' | 'createdAt'>
): Promise<Trainer> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('trainers')
    .insert({
      owner_id: ownerId,
      full_name: trainer.fullName.trim(),
      email: trainer.email.trim(),
      phone: normalizeIndianPhone(trainer.phone),
      specialization: trainer.specialization.trim(),
      salary: trainer.salary,
      joining_date: trainer.joiningDate,
    })
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapTrainer(data);
}

export async function updateTrainerRow(
  trainerId: string,
  updates: Partial<Trainer>
): Promise<Trainer> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (updates.fullName !== undefined) payload.full_name = updates.fullName.trim();
  if (updates.email !== undefined) payload.email = updates.email.trim();
  if (updates.phone !== undefined) payload.phone = normalizeIndianPhone(updates.phone);
  if (updates.specialization !== undefined) {
    payload.specialization = updates.specialization.trim();
  }
  if (updates.salary !== undefined) payload.salary = updates.salary;
  if (updates.joiningDate !== undefined) payload.joining_date = updates.joiningDate;

  const { data, error } = await sb
    .from('trainers')
    .update(payload)
    .eq('id', trainerId)
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapTrainer(data);
}

export async function deleteTrainerRow(trainerId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('trainers').delete().eq('id', trainerId);
  if (error) throw new Error(formatSupabaseError(error));
}

// ============================================================================
// ENQUIRIES SERVICE
// ============================================================================

export async function createEnquiryRow(
  ownerId: string,
  enquiry: Omit<Enquiry, 'id' | 'ownerId' | 'createdAt'>
): Promise<Enquiry> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('enquiries')
    .insert({
      owner_id: ownerId,
      full_name: enquiry.fullName.trim(),
      phone: normalizeIndianPhone(enquiry.phone),
      email: enquiry.email.trim(),
      source: enquiry.source,
      interested_plan: enquiry.interestedPlan.trim(),
      status: enquiry.status,
      notes: enquiry.notes.trim(),
    })
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapEnquiry(data);
}

export async function updateEnquiryRow(
  enquiryId: string,
  updates: Partial<Enquiry>
): Promise<Enquiry> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (updates.fullName !== undefined) payload.full_name = updates.fullName.trim();
  if (updates.phone !== undefined) payload.phone = normalizeIndianPhone(updates.phone);
  if (updates.email !== undefined) payload.email = updates.email.trim();
  if (updates.source !== undefined) payload.source = updates.source;
  if (updates.interestedPlan !== undefined) payload.interested_plan = updates.interestedPlan.trim();
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.notes !== undefined) payload.notes = updates.notes.trim();

  const { data, error } = await sb
    .from('enquiries')
    .update(payload)
    .eq('id', enquiryId)
    .select('*')
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapEnquiry(data);
}

export async function deleteEnquiryRow(enquiryId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('enquiries').delete().eq('id', enquiryId);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function convertEnquiryToMemberRow(input: {
  ownerId: string;
  enquiry: Enquiry;
  existingMembers: Member[];
  existingPayments: PaymentRecord[];
  plan: MembershipPlan | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}): Promise<{
  enquiry: Enquiry;
  member: Member;
  membership: MembershipRecord | null;
  payment: PaymentRecord | null;
}> {
  const today = getTodayISO();
  const endDate = input.plan ? calculateExpiryDate(today, input.plan.durationMonths) : undefined;

  const created = await createMemberWithMembership({
    ownerId: input.ownerId,
    memberCode: generateNextMemberCode(input.existingMembers),
    fullName: input.enquiry.fullName,
    phone: input.enquiry.phone,
    email: input.enquiry.email,
    gender: 'Male',
    dateOfBirth: null,
    joiningDate: today,
    goal: input.enquiry.interestedPlan || 'General Fitness',
    emergencyContact: input.enquiry.phone,
    notes: input.enquiry.notes
      ? `Converted from ${input.enquiry.source} enquiry: ${input.enquiry.notes}`
      : `Converted from ${input.enquiry.source} enquiry`,
    plan: input.plan,
    startDate: today,
    endDate,
    initialPaymentStatus: input.plan ? input.paymentStatus : undefined,
    paymentMethod: input.plan ? input.paymentMethod : undefined,
    amountPaid: input.plan ? input.plan.fee : undefined,
    transactionReference: generateTransactionReference(input.existingPayments),
  });

  const updatedEnquiry = await updateEnquiryRow(input.enquiry.id, { status: 'Converted' });

  return {
    enquiry: updatedEnquiry,
    member: created.member,
    membership: created.membership,
    payment: created.payment,
  };
}

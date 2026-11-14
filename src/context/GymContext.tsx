import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '../lib/supabase';
import {
  assignOrRenewMembershipRow,
  checkInMemberRow,
  checkOutMemberRow,
  convertEnquiryToMemberRow,
  createEnquiryRow,
  createMemberWithMembership,
  createPaymentRow,
  createPlanRow,
  createTrainerRow,
  deleteEnquiryRow,
  deleteMemberRow,
  deletePlanRow,
  deleteTrainerRow,
  formatSupabaseError,
  generateNextMemberCode,
  generateTransactionReference,
  loadOwnerWorkspace,
  markPaymentPaidRow,
  seedSamplePlansForOwner,
  updateEnquiryRow,
  updateMemberRow,
  updateMembershipDatesRow,
  updateOwnerProfileRow,
  updatePlanRow,
  updateTrainerRow,
} from '../services/supabaseService';
import {
  Enquiry,
  GymWorkspaceData,
  Member,
  MembershipPlan,
  MemberStatus,
  NotificationPreferences,
  PaymentMethod,
  PaymentStatus,
  Profile,
  ReminderStatus,
  Trainer,
} from '../types/gym';
import {
  calculateExpiryDate,
  getTodayISO,
  normalizeIndianPhone,
  offsetDaysISO,
} from '../utils/membership';

export interface ToastMessage {
  id: string;
  title: string;
  type: 'success' | 'info' | 'error';
}

export interface AddMemberInput {
  fullName: string;
  phone: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string | null;
  joiningDate: string;
  planId: string;
  startDate: string;
  endDate: string;
  goal: string;
  emergencyContact: string;
  notes: string;
  initialPaymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  amountPaid: number;
}

export interface RegisterOwnerInput {
  fullName: string;
  gymName: string;
  city: string;
  phone: string;
  email: string;
  password: string;
}

interface GymContextValue {
  configError: string | null;
  authReady: boolean;
  session: Session | null;
  authUser: User | null;
  isAuthenticated: boolean;
  passwordRecoveryMode: boolean;
  clearPasswordRecoveryMode: () => void;

  workspace: GymWorkspaceData | null;
  isLoading: boolean;
  workspaceError: string | null;
  refreshWorkspace: () => Promise<void>;

  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  notify: (title: string, type?: 'success' | 'info' | 'error') => void;

  // Auth
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterOwnerInput) => Promise<{ needsEmailConfirmation: boolean }>;
  sendPasswordReset: (email: string) => Promise<void>;
  completePasswordUpdate: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;

  // Members & Memberships
  addMember: (input: AddMemberInput) => Promise<Member>;
  updateMember: (
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
    }>,
    membershipEdit?: { membershipId: string; startDate: string; endDate: string }
  ) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  renewMembership: (
    memberId: string,
    planId: string,
    method: PaymentMethod,
    paymentStatus: PaymentStatus
  ) => Promise<void>;
  setMemberReminderStatus: (memberId: string, status: ReminderStatus) => Promise<void>;

  // Plans
  addPlan: (plan: Omit<MembershipPlan, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>;
  updatePlan: (planId: string, updates: Partial<MembershipPlan>) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  seedSamplePlans: () => Promise<number>;

  // Payments
  recordPayment: (input: {
    memberId: string;
    membershipId?: string | null;
    planName: string;
    amount: number;
    paymentDate: string;
    method: PaymentMethod;
    status: PaymentStatus;
    notes?: string;
  }) => Promise<void>;
  markPaymentPaid: (paymentId: string, method?: PaymentMethod) => Promise<void>;

  // Attendance
  checkInMember: (memberId: string) => Promise<void>;
  checkOutMember: (attendanceId: string) => Promise<void>;

  // Trainers
  addTrainer: (trainer: Omit<Trainer, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>;
  updateTrainer: (trainerId: string, updates: Partial<Trainer>) => Promise<void>;
  deleteTrainer: (trainerId: string) => Promise<void>;

  // Enquiries
  addEnquiry: (enquiry: Omit<Enquiry, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>;
  updateEnquiry: (enquiryId: string, updates: Partial<Enquiry>) => Promise<void>;
  deleteEnquiry: (enquiryId: string) => Promise<void>;
  convertEnquiryToMember: (input: {
    enquiry: Enquiry;
    planId: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
  }) => Promise<void>;

  // Settings
  updateProfile: (profile: Profile) => Promise<void>;
  updateNotifications: (prefs: NotificationPreferences) => Promise<void>;
}

const GymContext = createContext<GymContextValue | undefined>(undefined);

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(Boolean(supabaseConfigError));
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState<boolean>(false);

  const [workspace, setWorkspace] = useState<GymWorkspaceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (title: string, type: 'success' | 'info' | 'error' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, type }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4000);
    },
    [dismissToast]
  );

  const fetchWorkspaceForUser = useCallback(async (userId: string) => {
    setIsLoading(true);
    setWorkspaceError(null);
    const seedFlagKey = `gymflow_sample_plans_seeded_${userId}`;
    try {
      let alreadySeeded = false;
      try {
        alreadySeeded = window.localStorage.getItem(seedFlagKey) === 'v1';
      } catch {
        alreadySeeded = false;
      }

      if (!alreadySeeded) {
        await seedSamplePlansForOwner(userId);
        try {
          window.localStorage.setItem(seedFlagKey, 'v1');
        } catch {
          // Ignore storage quota/privacy mode errors
        }
      }

      const data = await loadOwnerWorkspace(userId);
      setWorkspace(data);
    } catch (err) {
      const msg = formatSupabaseError(err, 'Failed to load workspace from Supabase.');
      setWorkspaceError(msg);
      setWorkspace(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
        if (data.session?.user?.id) {
          void fetchWorkspaceForUser(data.session.user.id);
        }
      }
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryMode(true);
      }
      setSession(nextSession);
      if (nextSession?.user?.id) {
        void fetchWorkspaceForUser(nextSession.user.id);
      } else {
        setWorkspace(null);
        setWorkspaceError(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchWorkspaceForUser]);

  const refreshWorkspace = useCallback(async () => {
    if (!session?.user?.id) return;
    await fetchWorkspaceForUser(session.user.id);
  }, [session, fetchWorkspaceForUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase not configured');
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(error.message);
      notify('Signed in to GymFlow', 'success');
    },
    [notify]
  );

  const register = useCallback(
    async (input: RegisterOwnerInput): Promise<{ needsEmailConfirmation: boolean }> => {
      if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase not configured');

      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            gym_name: input.gymName.trim(),
            city: input.city.trim(),
            phone: normalizeIndianPhone(input.phone),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw new Error(error.message);

      // If session is returned immediately (email confirmation disabled), ensure profile row exists
      if (data.session && data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: input.fullName.trim(),
          gym_name: input.gymName.trim(),
          email: input.email.trim(),
          phone: normalizeIndianPhone(input.phone),
          city: input.city.trim(),
        });
        notify(`Welcome to GymFlow, ${input.fullName.split(' ')[0]}!`, 'success');
        return { needsEmailConfirmation: false };
      }

      notify('Verification email sent. Confirm your email to sign in.', 'info');
      return { needsEmailConfirmation: true };
    },
    [notify]
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase not configured');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) throw new Error(error.message);
  }, []);

  const completePasswordUpdate = useCallback(
    async (newPassword: string) => {
      if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase not configured');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      setPasswordRecoveryMode(false);
      notify('Password updated successfully', 'success');
    },
    [notify]
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      notify(error.message, 'error');
      return;
    }
    setWorkspace(null);
    notify('Signed out of your session', 'info');
  }, [notify]);

  const ownerId = session?.user?.id ?? '';

  const addMember = useCallback(
    async (input: AddMemberInput): Promise<Member> => {
      if (!workspace || !ownerId) throw new Error('Authenticated workspace required');
      const plan = workspace.plans.find((p) => p.id === input.planId) ?? null;

      const result = await createMemberWithMembership({
        ownerId,
        memberCode: generateNextMemberCode(workspace.members),
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        joiningDate: input.joiningDate,
        goal: input.goal,
        emergencyContact: input.emergencyContact,
        notes: input.notes,
        plan,
        startDate: input.startDate,
        endDate: input.endDate,
        initialPaymentStatus: plan ? input.initialPaymentStatus : undefined,
        paymentMethod: plan ? input.paymentMethod : undefined,
        amountPaid: plan ? input.amountPaid : undefined,
        transactionReference: generateTransactionReference(workspace.payments),
      });

      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              members: [result.member, ...prev.members],
              memberships: result.membership
                ? [result.membership, ...prev.memberships]
                : prev.memberships,
              payments: result.payment ? [result.payment, ...prev.payments] : prev.payments,
            }
          : prev
      );

      notify(`${result.member.fullName} (${result.member.memberCode}) added`, 'success');
      return result.member;
    },
    [workspace, ownerId, notify]
  );

  const updateMember = useCallback(
    async (
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
      }>,
      membershipEdit?: { membershipId: string; startDate: string; endDate: string }
    ) => {
      const updatedMember = await updateMemberRow(memberId, updates);
      let updatedMembership = null as GymWorkspaceData['memberships'][number] | null;
      if (membershipEdit) {
        updatedMembership = await updateMembershipDatesRow(
          membershipEdit.membershipId,
          membershipEdit.startDate,
          membershipEdit.endDate
        );
      }

      setWorkspace((prev) => {
        if (!prev) return prev;
        const nextMemberships = updatedMembership
          ? prev.memberships.map((ms) =>
              ms.id === updatedMembership!.id ? updatedMembership! : ms
            )
          : prev.memberships;

        return {
          ...prev,
          memberships: nextMemberships,
          members: prev.members.map((m) =>
            m.id === memberId
              ? {
                  ...updatedMember,
                  latestMembership: updatedMembership ?? m.latestMembership,
                }
              : m
          ),
          payments: prev.payments.map((p) =>
            p.memberId === memberId ? { ...p, memberName: updatedMember.fullName } : p
          ),
          attendance: prev.attendance.map((a) =>
            a.memberId === memberId ? { ...a, memberName: updatedMember.fullName } : a
          ),
        };
      });
      notify('Member details updated', 'success');
    },
    [notify]
  );

  const deleteMember = useCallback(
    async (memberId: string) => {
      const target = workspace?.members.find((m) => m.id === memberId);
      await deleteMemberRow(memberId);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.id !== memberId),
              memberships: prev.memberships.filter((ms) => ms.memberId !== memberId),
              payments: prev.payments.filter((p) => p.memberId !== memberId),
              attendance: prev.attendance.filter((a) => a.memberId !== memberId),
            }
          : prev
      );
      notify(`Removed ${target?.fullName ?? 'member'}`, 'info');
    },
    [workspace, notify]
  );

  const renewMembership = useCallback(
    async (
      memberId: string,
      planId: string,
      method: PaymentMethod,
      paymentStatus: PaymentStatus
    ) => {
      if (!workspace || !ownerId) return;
      const member = workspace.members.find((m) => m.id === memberId);
      const plan = workspace.plans.find((p) => p.id === planId);
      if (!member || !plan) return;

      const today = getTodayISO();
      const latestEnd = member.latestMembership?.endDate ?? '';
      const startDate = latestEnd && latestEnd >= today ? offsetDaysISO(1, latestEnd) : today;
      const endDate = calculateExpiryDate(startDate, plan.durationMonths);

      const res = await assignOrRenewMembershipRow({
        ownerId,
        member,
        plan,
        startDate,
        endDate,
        method,
        paymentStatus,
        transactionReference: generateTransactionReference(workspace.payments),
        notes: member.latestMembership ? 'Membership renewal' : 'Assigned membership plan',
      });

      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              memberships: [res.membership, ...prev.memberships],
              payments: [res.payment, ...prev.payments],
              members: prev.members.map((m) => (m.id === memberId ? res.member : m)),
            }
          : prev
      );
      notify(`Updated ${member.fullName} with ${plan.name}`, 'success');
    },
    [workspace, ownerId, notify]
  );

  const setMemberReminderStatus = useCallback(
    async (memberId: string, status: ReminderStatus) => {
      const lastReminderDate = status === 'Not Sent' ? null : getTodayISO();
      await updateMemberRow(memberId, { reminderStatus: status, lastReminderDate });
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((m) =>
                m.id === memberId ? { ...m, reminderStatus: status, lastReminderDate } : m
              ),
            }
          : prev
      );
      notify(`Reminder status marked as "${status}"`, 'info');
    },
    [notify]
  );

  const addPlan = useCallback(
    async (planInput: Omit<MembershipPlan, 'id' | 'ownerId' | 'createdAt'>) => {
      if (!ownerId) return;
      const created = await createPlanRow(ownerId, planInput);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              plans: [...prev.plans, created].sort(
                (a, b) => a.durationMonths - b.durationMonths
              ),
            }
          : prev
      );
      notify(`Created plan "${created.name}"`, 'success');
    },
    [ownerId, notify]
  );

  const updatePlan = useCallback(
    async (planId: string, updates: Partial<MembershipPlan>) => {
      const updated = await updatePlanRow(planId, updates);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              plans: prev.plans
                .map((p) => (p.id === planId ? updated : p))
                .sort((a, b) => a.durationMonths - b.durationMonths),
            }
          : prev
      );
      notify('Membership plan updated', 'success');
    },
    [notify]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      const target = workspace?.plans.find((p) => p.id === planId);
      await deletePlanRow(planId);
      setWorkspace((prev) =>
        prev ? { ...prev, plans: prev.plans.filter((p) => p.id !== planId) } : prev
      );
      notify(`Deleted plan "${target?.name ?? 'plan'}"`, 'info');
    },
    [workspace, notify]
  );

  const seedSamplePlans = useCallback(async (): Promise<number> => {
    if (!ownerId) {
      throw new Error('Please sign in as a gym owner to add sample plans.');
    }
    const inserted = await seedSamplePlansForOwner(ownerId);
    try {
      window.localStorage.setItem(`gymflow_sample_plans_seeded_${ownerId}`, 'v1');
    } catch {
      // Ignore storage errors
    }
    const freshData = await loadOwnerWorkspace(ownerId);
    setWorkspace(freshData);
    if (inserted.length > 0) {
      notify(
        `Added ${inserted.length} sample membership plan${inserted.length === 1 ? '' : 's'} to Supabase`,
        'success'
      );
    } else {
      notify('All sample membership plans already exist for your gym.', 'info');
    }
    return inserted.length;
  }, [ownerId, notify]);

  const recordPayment = useCallback(
    async (input: {
      memberId: string;
      membershipId?: string | null;
      planName: string;
      amount: number;
      paymentDate: string;
      method: PaymentMethod;
      status: PaymentStatus;
      notes?: string;
    }) => {
      if (!workspace || !ownerId) return;
      const member = workspace.members.find((m) => m.id === input.memberId);
      if (!member) return;

      const created = await createPaymentRow({
        ownerId,
        memberId: member.id,
        memberName: member.fullName,
        membershipId: input.membershipId ?? member.latestMembership?.id ?? null,
        planName: input.planName,
        amount: input.amount,
        paymentDate: input.paymentDate,
        method: input.method,
        status: input.status,
        transactionReference: generateTransactionReference(workspace.payments),
        notes: input.notes,
      });

      setWorkspace((prev) =>
        prev ? { ...prev, payments: [created, ...prev.payments] } : prev
      );
      notify(`Recorded ${created.transactionReference} for ${member.fullName}`, 'success');
    },
    [workspace, ownerId, notify]
  );

  const markPaymentPaid = useCallback(
    async (paymentId: string, method?: PaymentMethod) => {
      const existing = workspace?.payments.find((p) => p.id === paymentId);
      const updated = await markPaymentPaidRow(
        paymentId,
        existing?.memberName ?? 'Member',
        method
      );
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              payments: prev.payments.map((p) => (p.id === paymentId ? updated : p)),
            }
          : prev
      );
      notify('Payment marked as Paid', 'success');
    },
    [workspace, notify]
  );

  const checkInMember = useCallback(
    async (memberId: string) => {
      if (!workspace || !ownerId) return;
      const member = workspace.members.find((m) => m.id === memberId);
      if (!member) return;

      const created = await checkInMemberRow(ownerId, member);
      setWorkspace((prev) =>
        prev ? { ...prev, attendance: [created, ...prev.attendance] } : prev
      );
      notify(`${member.fullName} checked in`, 'success');
    },
    [workspace, ownerId, notify]
  );

  const checkOutMember = useCallback(
    async (attendanceId: string) => {
      if (!workspace) return;
      const memberMap = new Map(workspace.members.map((m) => [m.id, m]));
      const updated = await checkOutMemberRow(attendanceId, memberMap);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              attendance: prev.attendance.map((a) => (a.id === attendanceId ? updated : a)),
            }
          : prev
      );
      notify(`${updated.memberName} checked out`, 'info');
    },
    [workspace, notify]
  );

  const addTrainer = useCallback(
    async (trainerInput: Omit<Trainer, 'id' | 'ownerId' | 'createdAt'>) => {
      if (!ownerId) return;
      const created = await createTrainerRow(ownerId, trainerInput);
      setWorkspace((prev) =>
        prev ? { ...prev, trainers: [created, ...prev.trainers] } : prev
      );
      notify(`Added trainer ${created.fullName}`, 'success');
    },
    [ownerId, notify]
  );

  const updateTrainer = useCallback(
    async (trainerId: string, updates: Partial<Trainer>) => {
      const updated = await updateTrainerRow(trainerId, updates);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              trainers: prev.trainers.map((t) => (t.id === trainerId ? updated : t)),
            }
          : prev
      );
      notify('Trainer profile updated', 'success');
    },
    [notify]
  );

  const deleteTrainer = useCallback(
    async (trainerId: string) => {
      const target = workspace?.trainers.find((t) => t.id === trainerId);
      await deleteTrainerRow(trainerId);
      setWorkspace((prev) =>
        prev ? { ...prev, trainers: prev.trainers.filter((t) => t.id !== trainerId) } : prev
      );
      notify(`Removed trainer ${target?.fullName ?? ''}`, 'info');
    },
    [workspace, notify]
  );

  const addEnquiry = useCallback(
    async (enquiryInput: Omit<Enquiry, 'id' | 'ownerId' | 'createdAt'>) => {
      if (!ownerId) return;
      const created = await createEnquiryRow(ownerId, enquiryInput);
      setWorkspace((prev) =>
        prev ? { ...prev, enquiries: [created, ...prev.enquiries] } : prev
      );
      notify(`Logged enquiry from ${created.fullName}`, 'success');
    },
    [ownerId, notify]
  );

  const updateEnquiry = useCallback(
    async (enquiryId: string, updates: Partial<Enquiry>) => {
      const updated = await updateEnquiryRow(enquiryId, updates);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              enquiries: prev.enquiries.map((e) => (e.id === enquiryId ? updated : e)),
            }
          : prev
      );
      notify('Enquiry updated', 'success');
    },
    [notify]
  );

  const deleteEnquiry = useCallback(
    async (enquiryId: string) => {
      await deleteEnquiryRow(enquiryId);
      setWorkspace((prev) =>
        prev ? { ...prev, enquiries: prev.enquiries.filter((e) => e.id !== enquiryId) } : prev
      );
      notify('Enquiry deleted', 'info');
    },
    [notify]
  );

  const convertEnquiryToMember = useCallback(
    async (input: {
      enquiry: Enquiry;
      planId: string;
      paymentMethod: PaymentMethod;
      paymentStatus: PaymentStatus;
    }) => {
      if (!workspace || !ownerId) return;
      const plan = workspace.plans.find((p) => p.id === input.planId) ?? null;

      const res = await convertEnquiryToMemberRow({
        ownerId,
        enquiry: input.enquiry,
        existingMembers: workspace.members,
        existingPayments: workspace.payments,
        plan,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
      });

      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              enquiries: prev.enquiries.map((e) =>
                e.id === res.enquiry.id ? res.enquiry : e
              ),
              members: [res.member, ...prev.members],
              memberships: res.membership
                ? [res.membership, ...prev.memberships]
                : prev.memberships,
              payments: res.payment ? [res.payment, ...prev.payments] : prev.payments,
            }
          : prev
      );
      notify(`Converted ${res.member.fullName} into a gym member (${res.member.memberCode})`, 'success');
    },
    [workspace, ownerId, notify]
  );

  const updateProfile = useCallback(
    async (profile: Profile) => {
      const updated = await updateOwnerProfileRow(profile);
      setWorkspace((prev) => (prev ? { ...prev, profile: updated } : prev));
      notify('Profile settings saved', 'success');
    },
    [notify]
  );

  const updateNotifications = useCallback(
    async (notifications: NotificationPreferences) => {
      if (!workspace) return;
      const updated = await updateOwnerProfileRow({
        ...workspace.profile,
        notifications,
      });
      setWorkspace((prev) => (prev ? { ...prev, profile: updated } : prev));
      notify('Notification preferences saved', 'success');
    },
    [workspace, notify]
  );

  return (
    <GymContext.Provider
      value={{
        configError: supabaseConfigError,
        authReady,
        session,
        authUser: session?.user ?? null,
        isAuthenticated: Boolean(session?.user),
        passwordRecoveryMode,
        clearPasswordRecoveryMode: () => setPasswordRecoveryMode(false),
        workspace,
        isLoading,
        workspaceError,
        refreshWorkspace,
        toasts,
        dismissToast,
        notify,
        login,
        register,
        sendPasswordReset,
        completePasswordUpdate,
        logout,
        addMember,
        updateMember,
        deleteMember,
        renewMembership,
        setMemberReminderStatus,
        addPlan,
        updatePlan,
        deletePlan,
        seedSamplePlans,
        recordPayment,
        markPaymentPaid,
        checkInMember,
        checkOutMember,
        addTrainer,
        updateTrainer,
        deleteTrainer,
        addEnquiry,
        updateEnquiry,
        deleteEnquiry,
        convertEnquiryToMember,
        updateProfile,
        updateNotifications,
      }}
    >
      {children}
    </GymContext.Provider>
  );
};

export function useGym(): GymContextValue {
  const ctx = useContext(GymContext);
  if (!ctx) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return ctx;
}

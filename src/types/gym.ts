export type MemberStatus = 'Active' | 'Inactive' | 'Expired' | 'Pending';

export type MembershipRecordStatus = 'Active' | 'Expired' | 'Pending' | 'Cancelled';

export type PaymentStatus = 'Paid' | 'Pending' | 'Failed';

export type PaymentMethod = 'UPI' | 'Card' | 'Cash' | 'NetBanking';

export type ReminderStatus = 'Not Sent' | 'Drafted' | 'Scheduled';

export type PlanCycle = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | 'Custom';

export type EnquirySource =
  | 'Walk-in'
  | 'Instagram'
  | 'Google'
  | 'Referral'
  | 'Phone Call'
  | 'Other';

export type EnquiryStatus = 'New' | 'Contacted' | 'Trial Scheduled' | 'Converted' | 'Lost';

export interface NotificationPreferences {
  expiryReminder7Days: boolean;
  expiryReminder3Days: boolean;
  expiryReminderSameDay: boolean;
  pendingPaymentAlerts: boolean;
  dailyBusinessSummary: boolean;
}

export interface Profile {
  id: string;
  fullName: string;
  gymName: string;
  email: string;
  phone: string;
  role: string;
  tagline: string;
  address: string;
  city: string;
  gstNumber: string;
  notifications: NotificationPreferences;
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  ownerId: string;
  name: string;
  cycle: PlanCycle;
  durationMonths: number;
  fee: number;
  description: string;
  createdAt: string;
}

export interface MembershipRecord {
  id: string;
  ownerId: string;
  memberId: string;
  planId: string | null;
  planName: string;
  durationMonths: number;
  price: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: MembershipRecordStatus;
  createdAt: string;
}

export interface Member {
  id: string;
  ownerId: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string | null;
  joiningDate: string; // YYYY-MM-DD
  storedStatus: MemberStatus;
  goal: string;
  emergencyContact: string;
  notes: string;
  reminderStatus: ReminderStatus;
  lastReminderDate: string | null;
  createdAt: string;
  updatedAt: string;
  // Derived / latest membership convenience fields for UI
  latestMembership?: MembershipRecord | null;
}

export interface PaymentRecord {
  id: string;
  ownerId: string;
  memberId: string;
  memberName: string;
  membershipId: string | null;
  planName: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string;
  notes: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  ownerId: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  checkIn: string; // ISO timestamp
  checkOut: string | null; // ISO timestamp
  createdAt: string;
}

export interface Trainer {
  id: string;
  ownerId: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  salary: number;
  joiningDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Enquiry {
  id: string;
  ownerId: string;
  fullName: string;
  phone: string;
  email: string;
  source: EnquirySource;
  interestedPlan: string;
  status: EnquiryStatus;
  notes: string;
  createdAt: string;
}

export type AppRoute =
  | 'dashboard'
  | 'members'
  | 'plans'
  | 'payments'
  | 'attendance'
  | 'trainers'
  | 'enquiries'
  | 'expiry'
  | 'reports'
  | 'settings';

export type AuthScreenMode = 'login' | 'register' | 'forgot-password' | 'update-password';

export interface GymWorkspaceData {
  profile: Profile;
  plans: MembershipPlan[];
  members: Member[];
  memberships: MembershipRecord[];
  payments: PaymentRecord[];
  attendance: AttendanceRecord[];
  trainers: Trainer[];
  enquiries: Enquiry[];
}

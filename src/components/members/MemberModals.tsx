import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CreditCard,
  Layers,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  Target,
  User,
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { Member, MemberStatus, PaymentMethod, PaymentStatus } from '../../types/gym';
import {
  calculateExpiryDate,
  computeMembershipRowStatus,
  computeMemberStatus,
  formatDateIN,
  formatINR,
  getDaysRemaining,
  getLatestMembership,
  getTodayISO,
  isValidIndianPhone,
} from '../../utils/membership';
import { Modal } from '../common/Modal';
import { MemberStatusLabel, PaymentStatusLabel } from '../common/StatusLabel';

interface MemberFormModalProps {
  open: boolean;
  onClose: () => void;
  editingMember?: Member | null;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  open,
  onClose,
  editingMember,
}) => {
  const { workspace, addMember, updateMember, notify } = useGym();
  const plans = workspace?.plans ?? [];

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [joiningDate, setJoiningDate] = useState(getTodayISO());
  const [storedStatus, setStoredStatus] = useState<MemberStatus>('Active');

  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayISO());
  const [endDate, setEndDate] = useState('');
  const [goal, setGoal] = useState('General Fitness');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [initialPaymentStatus, setInitialPaymentStatus] = useState<PaymentStatus>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const editingLatestMembership =
    editingMember && workspace
      ? editingMember.latestMembership ??
        getLatestMembership(editingMember.id, workspace.memberships)
      : null;

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editingMember) {
      setFullName(editingMember.fullName);
      setPhone(editingMember.phone);
      setEmail(editingMember.email);
      setGender(editingMember.gender);
      setDateOfBirth(editingMember.dateOfBirth ?? '');
      setJoiningDate(editingMember.joiningDate);
      setStoredStatus(editingMember.storedStatus);
      setStartDate(editingLatestMembership?.startDate ?? editingMember.joiningDate);
      setEndDate(editingLatestMembership?.endDate ?? '');
      setGoal(editingMember.goal);
      setEmergencyContact(editingMember.emergencyContact);
      setNotes(editingMember.notes);
    } else {
      const defaultPlan = plans[0];
      const today = getTodayISO();
      setFullName('');
      setPhone('');
      setEmail('');
      setGender('Male');
      setDateOfBirth('');
      setJoiningDate(today);
      setStoredStatus('Active');
      setPlanId(defaultPlan?.id ?? '');
      setStartDate(today);
      setEndDate(defaultPlan ? calculateExpiryDate(today, defaultPlan.durationMonths) : '');
      setGoal('General Fitness');
      setEmergencyContact('');
      setNotes('');
      setInitialPaymentStatus('Paid');
      setPaymentMethod('UPI');
    }
  }, [open, editingMember, editingLatestMembership, plans]);

  const handlePlanOrStartChange = (nextPlanId: string, nextStartDate: string) => {
    setPlanId(nextPlanId);
    setStartDate(nextStartDate);
    const chosen = plans.find((p) => p.id === nextPlanId);
    if (chosen && nextStartDate) {
      setEndDate(calculateExpiryDate(nextStartDate, chosen.durationMonths));
    } else if (!chosen) {
      setEndDate('');
    }
  };

  const selectedPlan = plans.find((p) => p.id === planId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Member full name is required.');
      return;
    }
    if (!isValidIndianPhone(phone)) {
      setError('Enter a valid 10-digit Indian mobile number (starts with 6–9).');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address or leave it blank.');
      return;
    }
    if (!editingMember && selectedPlan && (!startDate || !endDate)) {
      setError('Start date and end date are required when assigning a plan.');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError('Membership end date cannot be earlier than start date.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMember) {
        await updateMember(
          editingMember.id,
          {
            fullName: fullName.trim(),
            phone,
            email: email.trim(),
            gender,
            dateOfBirth: dateOfBirth || null,
            joiningDate,
            storedStatus,
            goal: goal.trim() || 'General Fitness',
            emergencyContact: emergencyContact || phone,
            notes: notes.trim(),
          },
          editingLatestMembership && startDate && endDate
            ? {
                membershipId: editingLatestMembership.id,
                startDate,
                endDate,
              }
            : undefined
        );
      } else {
        await addMember({
          fullName,
          phone,
          email,
          gender,
          dateOfBirth: dateOfBirth || null,
          joiningDate,
          planId: selectedPlan ? selectedPlan.id : '',
          startDate,
          endDate,
          goal,
          emergencyContact,
          notes,
          initialPaymentStatus,
          paymentMethod,
          amountPaid: selectedPlan?.fee ?? 0,
        });
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save member';
      setError(msg);
      notify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingMember ? `Edit Member · ${editingMember.memberCode}` : 'Add New Member'}
      subtitle={
        editingMember
          ? 'Update profile details, status, or current membership dates.'
          : 'Register a new gym member and optionally assign their initial plan.'
      }
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Mobile Number (+91) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98450 11223"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Date of Birth
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Joining Date
            </label>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          {editingMember && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Profile Status
              </label>
              <select
                value={storedStatus}
                onChange={(e) => setStoredStatus(e.target.value as MemberStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="Active">Active (Date-based)</option>
                <option value="Inactive">Inactive (Paused / Left)</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          )}
        </div>

        {!editingMember ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Membership Plan
              </label>
              <select
                value={planId}
                onChange={(e) => handlePlanOrStartChange(e.target.value, startDate)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="">No plan yet</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatINR(p.fee)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                disabled={!selectedPlan}
                onChange={(e) => handlePlanOrStartChange(planId, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                disabled={!selectedPlan}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-slate-100"
              />
            </div>
          </div>
        ) : editingLatestMembership ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="block text-xs font-medium text-slate-500">Current Plan</span>
              <span className="block text-sm font-semibold text-slate-900 mt-2">
                {editingLatestMembership.planName}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        ) : null}

        {!editingMember && selectedPlan && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="block text-xs font-medium text-slate-500">Plan Fee</span>
              <span className="block font-display text-lg font-bold text-slate-900 mt-1 tabular-nums">
                {formatINR(selectedPlan.fee)}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Initial Payment Status
              </label>
              <select
                value={initialPaymentStatus}
                onChange={(e) => setInitialPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="Paid">Paid Now</option>
                <option value="Pending">Mark Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="UPI">UPI (GPay / PhonePe)</option>
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="NetBanking">NetBanking</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Fitness Goal
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Strength & Fat Loss"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Emergency Contact
            </label>
            <input
              type="tel"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="+91 98XXX XXXXX"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Medical notes, trainer assignment, or payment follow-up remarks..."
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting
              ? 'Saving...'
              : editingMember
                ? 'Save Changes'
                : 'Register Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

interface MemberDetailModalProps {
  member: Member | null;
  onClose: () => void;
  onEdit: (member: Member) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  onClose,
  onEdit,
}) => {
  const { workspace, renewMembership, notify } = useGym();
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewMethod, setRenewMethod] = useState<PaymentMethod>('UPI');
  const [renewPayStatus, setRenewPayStatus] = useState<PaymentStatus>('Paid');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (member && workspace) {
      setRenewPlanId(
        member.latestMembership?.planId ?? workspace.plans[0]?.id ?? ''
      );
      setRenewPayStatus('Paid');
      setRenewOpen(false);
    }
  }, [member, workspace]);

  if (!member || !workspace) return null;

  const memberMemberships = workspace.memberships
    .filter((ms) => ms.memberId === member.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const latest = member.latestMembership ?? memberMemberships[0] ?? null;
  const memberPayments = workspace.payments.filter((p) => p.memberId === member.id);
  const status = computeMemberStatus(member, workspace.memberships, workspace.payments);
  const daysLeft = latest ? getDaysRemaining(latest.endDate) : null;

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewPlanId) {
      notify('Create a membership plan first before assigning/renewing.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await renewMembership(member.id, renewPlanId, renewMethod, renewPayStatus);
      setRenewOpen(false);
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to renew membership', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={Boolean(member)}
      onClose={onClose}
      title={member.fullName}
      subtitle={`${member.memberCode} · Joined ${formatDateIN(member.joiningDate)}`}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Top Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Current Membership</div>
            <div className="font-semibold text-slate-900">
              {latest ? (
                <>
                  {latest.planName}{' '}
                  <span className="text-slate-400 font-normal">
                    · {formatINR(latest.price)}
                  </span>
                </>
              ) : (
                'No membership assigned'
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-slate-500">Status</div>
              <div className="mt-1">
                <MemberStatusLabel status={status} />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Validity</div>
              <div className="text-xs font-mono tabular-nums font-semibold text-slate-900 mt-1">
                {daysLeft === null
                  ? '—'
                  : daysLeft > 0
                    ? `${daysLeft} days left`
                    : daysLeft === 0
                      ? 'Expires today'
                      : `Expired ${Math.abs(daysLeft)}d ago`}
              </div>
            </div>
          </div>
        </div>

        {/* Member Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2.5">
            <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Phone</div>
              <div className="font-medium text-slate-900 font-mono tabular-nums">
                {member.phone}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Email</div>
              <div className="font-medium text-slate-900 break-all">
                {member.email || 'Not provided'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Current Cycle Dates</div>
              <div className="font-medium text-slate-900 tabular-nums">
                {latest
                  ? `${formatDateIN(latest.startDate)} — ${formatDateIN(latest.endDate)}`
                  : 'Not assigned'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Target className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Fitness Goal</div>
              <div className="font-medium text-slate-900">{member.goal}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Emergency Contact</div>
              <div className="font-medium text-slate-900 font-mono tabular-nums">
                {member.emergencyContact || '—'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Gender / DOB</div>
              <div className="font-medium text-slate-900">
                {member.gender}
                {member.dateOfBirth ? ` · ${formatDateIN(member.dateOfBirth)}` : ''}
              </div>
            </div>
          </div>
        </div>

        {member.notes && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Notes: </span>
            {member.notes}
          </div>
        )}

        {/* Quick Renewal / Plan Assignment Panel */}
        {renewOpen && (
          <form
            onSubmit={handleRenewSubmit}
            className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3"
          >
            <div className="text-sm font-semibold text-slate-900">
              {latest ? 'Renew Membership' : 'Assign Membership Plan'}
            </div>
            {workspace.plans.length === 0 ? (
              <p className="text-xs text-amber-800">
                No membership plans found. Please create a plan in Membership Plans first.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select Plan
                  </label>
                  <select
                    value={renewPlanId}
                    onChange={(e) => setRenewPlanId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    {workspace.plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatINR(p.fee)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={renewMethod}
                    onChange={(e) => setRenewMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="NetBanking">NetBanking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={renewPayStatus}
                    onChange={(e) => setRenewPayStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRenewOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              {workspace.plans.length > 0 && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Confirm Membership'}
                </button>
              )}
            </div>
          </form>
        )}

        {/* Membership History */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Layers className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Membership History</h3>
          </div>
          {memberMemberships.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 border-t border-slate-100">
              No memberships assigned to this member yet.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Start</th>
                    <th className="px-3 py-2 font-medium">End</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium text-right">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberMemberships.map((ms) => {
                    const rowState = computeMembershipRowStatus(ms);
                    return (
                      <tr key={ms.id}>
                        <td className="px-3 py-2.5 font-medium text-slate-900">{ms.planName}</td>
                        <td className="px-3 py-2.5 text-slate-600 tabular-nums">
                          {ms.durationMonths} mo
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 tabular-nums">
                          {formatDateIN(ms.startDate)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 tabular-nums">
                          {formatDateIN(ms.endDate)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-medium ${
                              rowState === 'Active'
                                ? 'text-emerald-700'
                                : rowState === 'Expired'
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                            }`}
                          >
                            {rowState}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatINR(ms.price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Member Payment History */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Payment History</h3>
          </div>
          {memberPayments.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 border-t border-slate-100">
              No payment entries logged for this member yet.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Reference</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Method</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {p.transactionReference}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 tabular-nums">
                        {formatDateIN(p.paymentDate)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{p.method}</td>
                      <td className="px-3 py-2.5">
                        <PaymentStatusLabel status={p.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatINR(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setRenewOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{latest ? 'Renew Membership' : 'Assign Plan'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(member);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

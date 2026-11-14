import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Download,
  Plus,
  Search,
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { PaymentMethod, PaymentStatus } from '../../types/gym';
import {
  formatDateIN,
  formatINR,
  getCurrentMonthKey,
  getTodayISO,
} from '../../utils/membership';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { PaymentStatusLabel } from '../common/StatusLabel';

export const PaymentsView: React.FC = () => {
  const { workspace, recordPayment, markPaymentPaid, notify } = useGym();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedPlanName, setSelectedPlanName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [status, setStatus] = useState<PaymentStatus>('Paid');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const summary = useMemo(() => {
    const payments = workspace?.payments ?? [];
    const currentMonth = getCurrentMonthKey();
    const paidList = payments.filter((p) => p.status === 'Paid');
    const collected = paidList.reduce((sum, p) => sum + p.amount, 0);
    const monthlyCollected = paidList
      .filter((p) => p.paymentDate.startsWith(currentMonth))
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingList = payments.filter((p) => p.status === 'Pending');
    const pendingTotal = pendingList.reduce((sum, p) => sum + p.amount, 0);

    return {
      collected,
      monthlyCollected,
      pendingCount: pendingList.length,
      pendingTotal,
      totalTransactions: payments.length,
    };
  }, [workspace]);

  const filteredPayments = useMemo(() => {
    const payments = workspace?.payments ?? [];
    const q = searchQuery.trim().toLowerCase();

    return payments.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (methodFilter !== 'All' && p.method !== methodFilter) return false;
      if (!q) return true;
      return (
        p.memberName.toLowerCase().includes(q) ||
        p.transactionReference.toLowerCase().includes(q) ||
        p.planName.toLowerCase().includes(q)
      );
    });
  }, [workspace, searchQuery, statusFilter, methodFilter]);

  if (!workspace) return null;

  const openRecordModal = () => {
    if (workspace.members.length === 0) {
      notify('Add a gym member first before recording a payment.', 'info');
      return;
    }
    const firstMember = workspace.members[0];
    const memberPlan =
      workspace.plans.find((p) => p.id === firstMember?.latestMembership?.planId) ??
      workspace.plans[0];

    setSelectedMemberId(firstMember?.id ?? '');
    setSelectedPlanName(
      firstMember?.latestMembership?.planName ?? memberPlan?.name ?? 'Membership Fee'
    );
    setAmount(
      firstMember?.latestMembership
        ? String(firstMember.latestMembership.price)
        : memberPlan
          ? String(memberPlan.fee)
          : ''
    );
    setPaymentDate(getTodayISO());
    setMethod('UPI');
    setStatus('Paid');
    setNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
    const m = workspace.members.find((mem) => mem.id === memberId);
    if (m?.latestMembership) {
      setSelectedPlanName(m.latestMembership.planName);
      setAmount(String(m.latestMembership.price));
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const numAmount = Number(amount);

    if (!selectedMemberId) {
      setFormError('Please select a member.');
      return;
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setFormError('Enter a valid INR payment amount.');
      return;
    }
    if (!paymentDate) {
      setFormError('Payment date is required.');
      return;
    }

    setSubmitting(true);
    try {
      await recordPayment({
        memberId: selectedMemberId,
        planName: selectedPlanName.trim() || 'Membership Fee',
        amount: numAmount,
        paymentDate,
        method,
        status,
        notes,
      });
      setModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save payment';
      setFormError(msg);
      notify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Reference', 'Member', 'Plan', 'Date', 'Method', 'Status', 'Amount (INR)'];
    const rows = filteredPayments.map((p) => [
      p.transactionReference,
      `"${p.memberName}"`,
      `"${p.planName}"`,
      p.paymentDate,
      p.method,
      p.status,
      String(p.amount),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gymflow-payments-${getTodayISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Payment ledger exported as CSV', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Payment Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Record manual payments, track pending dues, and monitor monthly collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredPayments.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={openRecordModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Revenue Collected</div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {formatINR(summary.collected)}
          </div>
          <p className="text-xs text-emerald-700 mt-1 tabular-nums">
            {formatINR(summary.monthlyCollected)} collected this month
          </p>
        </div>

        <div
          className={`border rounded-xl p-5 ${
            summary.pendingCount > 0
              ? 'bg-amber-50/60 border-amber-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">Pending Dues</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {formatINR(summary.pendingTotal)}
          </div>
          <p className="text-xs text-amber-800 mt-1 tabular-nums">
            {summary.pendingCount} pending payment{summary.pendingCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Transactions</div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {summary.totalTransactions}
          </div>
          <p className="text-xs text-slate-500 mt-1">UPI, Card, Cash & NetBanking</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(['All', 'Paid', 'Pending', 'Failed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member name or reference..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as 'All' | PaymentMethod)}
            aria-label="Filter by payment method"
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
          >
            <option value="All">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Cash">Cash</option>
            <option value="NetBanking">NetBanking</option>
          </select>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredPayments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payment transactions yet"
            description="Record manual payments from members or adjust your filters to view past invoices."
            actionLabel="Record Payment"
            onAction={openRecordModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Reference</th>
                  <th className="py-3 px-4 whitespace-nowrap">Member Name</th>
                  <th className="py-3 px-4 whitespace-nowrap">Plan</th>
                  <th className="py-3 px-4 whitespace-nowrap">Payment Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Method</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {payment.transactionReference}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {payment.memberName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {payment.planName}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDateIN(payment.paymentDate)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {payment.method}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PaymentStatusLabel status={payment.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatINR(payment.amount)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {payment.status === 'Pending' ? (
                        <button
                          type="button"
                          onClick={() => void markPaymentPaid(payment.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Paid</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Payment"
        subtitle="Record a manual fee payment or pending invoice in your gym ledger."
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4" noValidate>
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Member <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              {workspace.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.memberCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Plan / Description
              </label>
              <input
                type="text"
                value={selectedPlanName}
                onChange={(e) => setSelectedPlanName(e.target.value)}
                placeholder="Quarterly Core"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Amount (INR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="NetBanking">NetBanking</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via PhonePe at reception"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

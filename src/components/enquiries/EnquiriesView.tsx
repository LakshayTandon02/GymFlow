import React, { useMemo, useState } from 'react';
import {
  MessageSquarePlus,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import {
  Enquiry,
  EnquirySource,
  EnquiryStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../types/gym';
import { formatDateIN, formatINR, isValidIndianPhone } from '../../utils/membership';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { EnquiryStatusLabel } from '../common/StatusLabel';

export const EnquiriesView: React.FC = () => {
  const {
    workspace,
    addEnquiry,
    updateEnquiry,
    deleteEnquiry,
    convertEnquiryToMember,
    notify,
  } = useGym();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | EnquiryStatus>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | EnquirySource>('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<EnquirySource>('Walk-in');
  const [interestedPlan, setInterestedPlan] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Convert modal
  const [convertingEnquiry, setConvertingEnquiry] = useState<Enquiry | null>(null);
  const [convertPlanId, setConvertPlanId] = useState('');
  const [convertMethod, setConvertMethod] = useState<PaymentMethod>('UPI');
  const [convertPayStatus, setConvertPayStatus] = useState<PaymentStatus>('Paid');
  const [converting, setConverting] = useState(false);

  const [enquiryToDelete, setEnquiryToDelete] = useState<Enquiry | null>(null);

  const filteredEnquiries = useMemo(() => {
    const list = workspace?.enquiries ?? [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((e) => {
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (sourceFilter !== 'All' && e.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.interestedPlan.toLowerCase().includes(q)
      );
    });
  }, [workspace, searchQuery, statusFilter, sourceFilter]);

  if (!workspace) return null;

  const openAddModal = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setSource('Walk-in');
    setInterestedPlan(workspace.plans[0]?.name ?? 'Monthly');
    setNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const openConvertModal = (enquiry: Enquiry) => {
    const matchedPlan =
      workspace.plans.find((p) =>
        p.name.toLowerCase().includes(enquiry.interestedPlan.toLowerCase())
      ) ?? workspace.plans[0];
    setConvertingEnquiry(enquiry);
    setConvertPlanId(matchedPlan?.id ?? '');
    setConvertMethod('UPI');
    setConvertPayStatus('Paid');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (fullName.trim().length < 2) {
      setFormError('Prospect name is required.');
      return;
    }
    if (!isValidIndianPhone(phone)) {
      setFormError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Enter a valid email or leave blank.');
      return;
    }

    setSubmitting(true);
    try {
      await addEnquiry({
        fullName: fullName.trim(),
        phone,
        email: email.trim(),
        source,
        interestedPlan: interestedPlan.trim(),
        status: 'New',
        notes: notes.trim(),
      });
      setModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save enquiry';
      setFormError(msg);
      notify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingEnquiry) return;
    setConverting(true);
    try {
      await convertEnquiryToMember({
        enquiry: convertingEnquiry,
        planId: convertPlanId,
        paymentMethod: convertMethod,
        paymentStatus: convertPayStatus,
      });
      setConvertingEnquiry(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Conversion failed', 'error');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Enquiry Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Capture walk-in, Instagram, and referral leads and convert them into gym members.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Enquiry</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(['All', 'New', 'Contacted', 'Trial Scheduled', 'Converted', 'Lost'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lead name, phone, plan..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as 'All' | EnquirySource)}
            aria-label="Filter by enquiry source"
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
          >
            <option value="All">All Sources</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Instagram">Instagram</option>
            <option value="Google">Google</option>
            <option value="Referral">Referral</option>
            <option value="Phone Call">Phone Call</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredEnquiries.length === 0 ? (
          <EmptyState
            icon={MessageSquarePlus}
            title="No enquiries recorded"
            description="Log prospective visitors and social leads here so you can follow up and convert them into active members."
            actionLabel="Capture First Enquiry"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Prospect</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Interested Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEnquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{enq.fullName}</div>
                      <div className="text-xs font-mono text-slate-500 tabular-nums">
                        {enq.phone}
                        {enq.email ? ` · ${enq.email}` : ''}
                      </div>
                      {enq.notes && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {enq.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">{enq.source}</td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {enq.interestedPlan || '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <EnquiryStatusLabel status={enq.status} />
                        {enq.status !== 'Converted' && (
                          <select
                            aria-label={`Update status for ${enq.fullName}`}
                            value={enq.status}
                            onChange={(e) =>
                              void updateEnquiry(enq.id, {
                                status: e.target.value as EnquiryStatus,
                              })
                            }
                            className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none focus:border-blue-600"
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Trial Scheduled">Trial Scheduled</option>
                            <option value="Lost">Lost</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDateIN(enq.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {enq.status !== 'Converted' && (
                          <button
                            type="button"
                            onClick={() => openConvertModal(enq)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Convert to Member</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEnquiryToDelete(enq)}
                          aria-label={`Delete enquiry ${enq.fullName}`}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Enquiry Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Capture Gym Enquiry"
        subtitle="Log a potential customer and track follow-up status."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4" noValidate>
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {formError}
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
                placeholder="e.g. Rohan Verma"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Phone (+91) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98450 11223"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prospect@example.com"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as EnquirySource)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="Walk-in">Walk-in</option>
                <option value="Instagram">Instagram</option>
                <option value="Google">Google</option>
                <option value="Referral">Referral</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Interested Plan
            </label>
            <input
              type="text"
              value={interestedPlan}
              onChange={(e) => setInterestedPlan(e.target.value)}
              placeholder="e.g. Quarterly Core or Personal Training"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferred workout slot, trial feedback, follow-up date..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 resize-none"
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
              {submitting ? 'Saving...' : 'Save Enquiry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Convert Enquiry to Member Modal */}
      <Modal
        open={Boolean(convertingEnquiry)}
        onClose={() => setConvertingEnquiry(null)}
        title="Convert Enquiry to Member"
        subtitle={
          convertingEnquiry
            ? `Register ${convertingEnquiry.fullName} (${convertingEnquiry.phone}) as an active gym member.`
            : ''
        }
      >
        {convertingEnquiry && (
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Assign Membership Plan
              </label>
              {workspace.plans.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  No plans created yet. You can convert without a plan and assign one later in Membership Plans.
                </p>
              ) : (
                <select
                  value={convertPlanId}
                  onChange={(e) => setConvertPlanId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  {workspace.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatINR(p.fee)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {workspace.plans.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={convertMethod}
                    onChange={(e) => setConvertMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="NetBanking">NetBanking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={convertPayStatus}
                    onChange={(e) => setConvertPayStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConvertingEnquiry(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={converting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
              >
                {converting ? 'Converting...' : 'Confirm Conversion'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(enquiryToDelete)}
        onClose={() => setEnquiryToDelete(null)}
        onConfirm={() => {
          if (enquiryToDelete) void deleteEnquiry(enquiryToDelete.id);
        }}
        title="Delete Enquiry"
        description={`Delete the enquiry from ${enquiryToDelete?.fullName ?? 'this lead'}?`}
        confirmLabel="Delete"
      />
    </div>
  );
};

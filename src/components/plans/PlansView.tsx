import React, { useState } from 'react';
import { Edit2, Layers, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { SAMPLE_MEMBERSHIP_PLANS } from '../../services/supabaseService';
import { MembershipPlan, PlanCycle } from '../../types/gym';
import { formatINR } from '../../utils/membership';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';

export const PlansView: React.FC = () => {
  const { workspace, addPlan, updatePlan, deletePlan, seedSamplePlans, notify } = useGym();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<MembershipPlan | null>(null);

  const [name, setName] = useState('');
  const [cycle, setCycle] = useState<PlanCycle>('Monthly');
  const [durationMonths, setDurationMonths] = useState('1');
  const [fee, setFee] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [seedingSamples, setSeedingSamples] = useState(false);

  if (!workspace) return null;

  const existingPlanNames = new Set(
    workspace.plans.map((p) => p.name.trim().toLowerCase())
  );
  const hasMissingSamplePlans = SAMPLE_MEMBERSHIP_PLANS.some(
    (sample) => !existingPlanNames.has(sample.name.trim().toLowerCase())
  );

  const handleSeedSamplePlans = async () => {
    setSeedingSamples(true);
    try {
      await seedSamplePlans();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Unable to add sample membership plans',
        'error'
      );
    } finally {
      setSeedingSamples(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setCycle('Monthly');
    setDurationMonths('1');
    setFee('');
    setDescription('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setCycle(plan.cycle);
    setDurationMonths(String(plan.durationMonths));
    setFee(String(plan.fee));
    setDescription(plan.description);
    setFormError('');
    setModalOpen(true);
  };

  const handleCycleChange = (nextCycle: PlanCycle) => {
    setCycle(nextCycle);
    if (nextCycle === 'Monthly') setDurationMonths('1');
    else if (nextCycle === 'Quarterly') setDurationMonths('3');
    else if (nextCycle === 'Half-Yearly') setDurationMonths('6');
    else if (nextCycle === 'Yearly') setDurationMonths('12');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const parsedMonths = Number(durationMonths);
    const parsedFee = Number(fee);

    if (name.trim().length < 2) {
      setFormError('Plan name is required.');
      return;
    }
    if (!Number.isFinite(parsedMonths) || parsedMonths < 1 || parsedMonths > 60) {
      setFormError('Duration must be between 1 and 60 months.');
      return;
    }
    if (!Number.isFinite(parsedFee) || parsedFee <= 0) {
      setFormError('Enter a valid membership fee in INR.');
      return;
    }
    if (description.trim().length < 5) {
      setFormError('Please provide a short plan description.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, {
          name: name.trim(),
          cycle,
          durationMonths: parsedMonths,
          fee: parsedFee,
          description: description.trim(),
        });
      } else {
        await addPlan({
          name: name.trim(),
          cycle,
          durationMonths: parsedMonths,
          fee: parsedFee,
          description: description.trim(),
        });
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save plan';
      setFormError(msg);
      notify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Membership Plans</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Create and manage monthly, quarterly, half-yearly, and annual tiers in INR.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {hasMissingSamplePlans && (
            <button
              type="button"
              onClick={() => void handleSeedSamplePlans()}
              disabled={seedingSamples}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>{seedingSamples ? 'Adding Sample Plans...' : 'Add Sample Plans'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        </div>
      </div>

      {workspace.plans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl">
          <EmptyState
            icon={Layers}
            title="No membership plans configured"
            description="Create your first monthly, quarterly, or yearly plan so members can be enrolled."
            actionLabel="Create First Plan"
            onAction={openCreateModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {workspace.plans.map((plan) => {
            const subscriberCount = workspace.members.filter(
              (m) => m.latestMembership?.planId === plan.id
            ).length;
            const monthlyEquivalent = Math.round(plan.fee / Math.max(plan.durationMonths, 1));

            return (
              <div
                key={plan.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-blue-600">{plan.cycle}</span>
                    <div className="flex items-center gap-1 -mr-1.5 -mt-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(plan)}
                        title="Edit plan"
                        aria-label={`Edit ${plan.name}`}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanToDelete(plan)}
                        title="Delete plan"
                        aria-label={`Delete ${plan.name}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                    {plan.name}
                  </h3>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-display text-3xl font-bold text-slate-900 tabular-nums">
                      {formatINR(plan.fee)}
                    </span>
                    <span className="text-xs text-slate-500">
                      / {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 tabular-nums">
                    Effective {formatINR(monthlyEquivalent)} / month
                  </p>

                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="tabular-nums font-medium text-slate-700">
                      {subscriberCount}
                    </span>{' '}
                    member{subscriberCount === 1 ? '' : 's'}
                  </span>
                  <span className="font-mono tabular-nums">
                    {plan.durationMonths * 30}d cycle
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Plan Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
        subtitle="Define billing duration, INR fee, and member benefits."
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quarterly Core"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Billing Cycle
              </label>
              <select
                value={cycle}
                onChange={(e) => handleCycleChange(e.target.value as PlanCycle)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Yearly">Yearly</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Duration (Months)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Fee (INR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="4800"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe gym floor access, trainer check-ins, or included perks..."
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
              {submitting ? 'Saving...' : editingPlan ? 'Save Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(planToDelete)}
        onClose={() => setPlanToDelete(null)}
        onConfirm={() => {
          if (planToDelete) {
            void deletePlan(planToDelete.id).catch((err) => {
              notify(err instanceof Error ? err.message : 'Delete failed', 'error');
            });
          }
        }}
        title="Delete Membership Plan"
        description={`Are you sure you want to remove "${planToDelete?.name ?? ''}"? Existing member subscriptions remain in history.`}
        confirmLabel="Delete Plan"
      />
    </div>
  );
};

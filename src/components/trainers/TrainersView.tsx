import React, { useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2, UserCheck } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { Trainer } from '../../types/gym';
import {
  formatDateIN,
  formatINR,
  getTodayISO,
  isValidIndianPhone,
} from '../../utils/membership';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';

export const TrainersView: React.FC = () => {
  const { workspace, addTrainer, updateTrainer, deleteTrainer, notify } = useGym();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [trainerToDelete, setTrainerToDelete] = useState<Trainer | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [salary, setSalary] = useState('');
  const [joiningDate, setJoiningDate] = useState(getTodayISO());
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredTrainers = useMemo(() => {
    const list = workspace?.trainers ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        t.specialization.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
    );
  }, [workspace, searchQuery]);

  if (!workspace) return null;

  const totalPayroll = workspace.trainers.reduce((sum, t) => sum + t.salary, 0);

  const openAddModal = () => {
    setEditingTrainer(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setSpecialization('');
    setSalary('');
    setJoiningDate(getTodayISO());
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (trainer: Trainer) => {
    setEditingTrainer(trainer);
    setFullName(trainer.fullName);
    setPhone(trainer.phone);
    setEmail(trainer.email);
    setSpecialization(trainer.specialization);
    setSalary(String(trainer.salary));
    setJoiningDate(trainer.joiningDate);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const parsedSalary = Number(salary || 0);

    if (fullName.trim().length < 2) {
      setFormError('Trainer full name is required.');
      return;
    }
    if (!isValidIndianPhone(phone)) {
      setFormError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Enter a valid email address or leave blank.');
      return;
    }
    if (specialization.trim().length < 2) {
      setFormError('Enter trainer specialization (e.g. Strength & Conditioning).');
      return;
    }
    if (!Number.isFinite(parsedSalary) || parsedSalary < 0) {
      setFormError('Enter a valid monthly salary.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTrainer) {
        await updateTrainer(editingTrainer.id, {
          fullName: fullName.trim(),
          phone,
          email: email.trim(),
          specialization: specialization.trim(),
          salary: parsedSalary,
          joiningDate,
        });
      } else {
        await addTrainer({
          fullName: fullName.trim(),
          phone,
          email: email.trim(),
          specialization: specialization.trim(),
          salary: parsedSalary,
          joiningDate,
        });
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save trainer';
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
          <h2 className="font-display text-2xl font-bold text-slate-900">Trainer Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage coaching staff profiles, specializations, and monthly payroll.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Trainer</span>
        </button>
      </div>

      {/* Summary & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Trainers</div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {workspace.trainers.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Active coaching roster</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Monthly Coach Payroll</div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {formatINR(totalPayroll)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Combined monthly salary</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trainer or specialization..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Trainers Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredTrainers.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No trainers added yet"
            description="Add your gym coaches and personal trainers to keep track of specializations, contact info, and payroll."
            actionLabel="Add First Trainer"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Trainer Name</th>
                  <th className="py-3 px-4">Specialization</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Monthly Salary</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTrainers.map((trainer) => (
                  <tr key={trainer.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {trainer.fullName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{trainer.specialization}</td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-mono text-slate-700 tabular-nums">
                        {trainer.phone}
                      </div>
                      {trainer.email && (
                        <div className="text-xs text-slate-500">{trainer.email}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDateIN(trainer.joiningDate)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(trainer.salary)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(trainer)}
                          aria-label={`Edit ${trainer.fullName}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrainerToDelete(trainer)}
                          aria-label={`Delete ${trainer.fullName}`}
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

      {/* Add/Edit Trainer Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTrainer ? 'Edit Trainer Profile' : 'Add New Trainer'}
        subtitle="Store coach contact details, specialization, and monthly salary."
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                placeholder="e.g. Karthik Nair"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Mobile (+91) <span className="text-red-500">*</span>
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
                placeholder="coach@yourgym.in"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Specialization <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="Strength & Hypertrophy"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Monthly Salary (INR)
              </label>
              <input
                type="number"
                min={0}
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="35000"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Joining Date
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
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
              {submitting ? 'Saving...' : editingTrainer ? 'Save Trainer' : 'Add Trainer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(trainerToDelete)}
        onClose={() => setTrainerToDelete(null)}
        onConfirm={() => {
          if (trainerToDelete) void deleteTrainer(trainerToDelete.id);
        }}
        title="Delete Trainer"
        description={`Remove ${trainerToDelete?.fullName ?? 'this trainer'} from your coaching roster?`}
        confirmLabel="Delete Trainer"
      />
    </div>
  );
};

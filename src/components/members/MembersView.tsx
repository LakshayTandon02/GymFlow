import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Eye, Plus, Search, Trash2, Users } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { Member, MemberStatus } from '../../types/gym';
import {
  computeMemberStatus,
  formatDateIN,
  getDaysRemaining,
  getLatestMembership,
} from '../../utils/membership';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { SkeletonRows } from '../common/SkeletonRows';
import { MemberStatusLabel } from '../common/StatusLabel';

interface MembersViewProps {
  onOpenAddMember: () => void;
  onEditMember: (member: Member) => void;
  onViewMember: (member: Member) => void;
}

type StatusFilter = 'All' | MemberStatus;
const PAGE_SIZE = 10;

export const MembersView: React.FC<MembersViewProps> = ({
  onOpenAddMember,
  onEditMember,
  onViewMember,
}) => {
  const { workspace, isLoading, deleteMember, notify } = useGym();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [planFilter, setPlanFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  const enrichedMembers = useMemo(() => {
    if (!workspace) return [];
    return workspace.members.map((member) => {
      const latest =
        member.latestMembership ?? getLatestMembership(member.id, workspace.memberships);
      return {
        member,
        latest,
        status: computeMemberStatus(member, workspace.memberships, workspace.payments),
        daysLeft: latest ? getDaysRemaining(latest.endDate) : null,
      };
    });
  }, [workspace]);

  const counts = useMemo(() => {
    return {
      All: enrichedMembers.length,
      Active: enrichedMembers.filter((m) => m.status === 'Active').length,
      Inactive: enrichedMembers.filter((m) => m.status === 'Inactive').length,
      Expired: enrichedMembers.filter((m) => m.status === 'Expired').length,
      Pending: enrichedMembers.filter((m) => m.status === 'Pending').length,
    };
  }, [enrichedMembers]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedMembers.filter(({ member, latest, status }) => {
      if (statusFilter !== 'All' && status !== statusFilter) return false;
      if (planFilter !== 'All' && latest?.planId !== planFilter) return false;
      if (!q) return true;
      return (
        member.fullName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.phone.toLowerCase().includes(q) ||
        member.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
        member.memberCode.toLowerCase().includes(q)
      );
    });
  }, [enrichedMembers, searchQuery, statusFilter, planFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedMembers = filteredMembers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  if (isLoading || !workspace) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <SkeletonRows rows={7} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Member Directory</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Search by name, phone, email, or member code and filter by membership status.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddMember}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(['All', 'Active', 'Expired', 'Pending', 'Inactive'] as StatusFilter[]).map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab}</span>
                <span className="font-mono tabular-nums text-[11px] text-slate-400">
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone, email, or GF-1001..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by membership plan"
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
          >
            <option value="All">All Plans</option>
            {workspace.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matching members found"
            description="Try clearing your search query or status filter, or register your first gym member."
            actionLabel={
              searchQuery || statusFilter !== 'All' || planFilter !== 'All'
                ? 'Clear Filters'
                : 'Add First Member'
            }
            onAction={() => {
              if (searchQuery || statusFilter !== 'All' || planFilter !== 'All') {
                setSearchQuery('');
                setStatusFilter('All');
                setPlanFilter('All');
                setPage(1);
              } else {
                onOpenAddMember();
              }
            }}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4 whitespace-nowrap">Member ID</th>
                    <th className="py-3 px-4 whitespace-nowrap">Member</th>
                    <th className="py-3 px-4 whitespace-nowrap">Current Plan</th>
                    <th className="py-3 px-4 whitespace-nowrap">Start Date</th>
                    <th className="py-3 px-4 whitespace-nowrap">End Date</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedMembers.map(({ member, latest, status, daysLeft }) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-medium text-slate-600 whitespace-nowrap">
                        {member.memberCode}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onViewMember(member)}
                          className="text-left group"
                        >
                          <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                            {member.fullName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            {member.phone}
                            {member.email ? ` · ${member.email}` : ''}
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {latest?.planName ?? 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs tabular-nums whitespace-nowrap">
                        {latest ? formatDateIN(latest.startDate) : formatDateIN(member.joiningDate)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {latest ? (
                          <>
                            <div className="text-xs font-medium text-slate-800 tabular-nums">
                              {formatDateIN(latest.endDate)}
                            </div>
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {daysLeft !== null &&
                                (daysLeft > 0
                                  ? `${daysLeft} days left`
                                  : daysLeft === 0
                                    ? 'Expires today'
                                    : `${Math.abs(daysLeft)}d overdue`)}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <MemberStatusLabel status={status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewMember(member)}
                            title="View member details"
                            aria-label={`View ${member.fullName}`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditMember(member)}
                            title="Edit member"
                            aria-label={`Edit ${member.fullName}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMemberToDelete(member)}
                            title="Delete member"
                            aria-label={`Delete ${member.fullName}`}
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

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="tabular-nums">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filteredMembers.length)} of{' '}
                  {filteredMembers.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-mono tabular-nums">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => {
          if (memberToDelete) {
            void deleteMember(memberToDelete.id).catch((err) => {
              notify(err instanceof Error ? err.message : 'Delete failed', 'error');
            });
          }
        }}
        title="Delete Member Profile"
        description={`Are you sure you want to delete ${memberToDelete?.fullName ?? 'this member'} (${memberToDelete?.memberCode ?? ''})? Associated memberships, payments, and attendance logs for this member will also be removed.`}
        confirmLabel="Delete Member"
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { CalendarClock, Copy, Info, MessageSquare, RefreshCw } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { Member, MembershipRecord, ReminderStatus } from '../../types/gym';
import {
  formatDateIN,
  formatINR,
  getDaysRemaining,
  getLatestMembership,
} from '../../utils/membership';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { ReminderStatusLabel } from '../common/StatusLabel';

interface ExpiryViewProps {
  onViewMember: (member: Member) => void;
}

type ExpiryTab = 'expiring-soon' | 'expired' | 'upcoming-30';

export const ExpiryView: React.FC<ExpiryViewProps> = ({ onViewMember }) => {
  const { workspace, setMemberReminderStatus, notify } = useGym();
  const [tab, setTab] = useState<ExpiryTab>('expiring-soon');
  const [templateTarget, setTemplateTarget] = useState<{
    member: Member;
    latest: MembershipRecord;
  } | null>(null);

  const categorized = useMemo(() => {
    if (!workspace) {
      return {
        expiringSoon: [] as { member: Member; latest: MembershipRecord; daysRemaining: number }[],
        expired: [] as { member: Member; latest: MembershipRecord; daysRemaining: number }[],
        upcoming30: [] as { member: Member; latest: MembershipRecord; daysRemaining: number }[],
      };
    }

    const withDays = workspace.members
      .map((member) => {
        const latest =
          member.latestMembership ?? getLatestMembership(member.id, workspace.memberships);
        if (!latest) return null;
        return {
          member,
          latest,
          daysRemaining: getDaysRemaining(latest.endDate),
        };
      })
      .filter(
        (x): x is { member: Member; latest: MembershipRecord; daysRemaining: number } =>
          x !== null
      );

    return {
      expiringSoon: withDays
        .filter((item) => item.daysRemaining >= 0 && item.daysRemaining <= 7)
        .sort((a, b) => a.daysRemaining - b.daysRemaining),
      expired: withDays
        .filter((item) => item.daysRemaining < 0)
        .sort((a, b) => b.daysRemaining - a.daysRemaining),
      upcoming30: withDays
        .filter((item) => item.daysRemaining >= 0 && item.daysRemaining <= 30)
        .sort((a, b) => a.daysRemaining - b.daysRemaining),
    };
  }, [workspace]);

  if (!workspace) return null;

  const activeList =
    tab === 'expiring-soon'
      ? categorized.expiringSoon
      : tab === 'expired'
        ? categorized.expired
        : categorized.upcoming30;

  const getDraftMessage = (member: Member, latest: MembershipRecord) => {
    const days = getDaysRemaining(latest.endDate);
    const expiryStr = formatDateIN(latest.endDate);
    const feeStr = formatINR(latest.price);

    if (days < 0) {
      return `Hi ${member.fullName}, your ${latest.planName} membership at ${workspace.profile.gymName} expired on ${expiryStr}. Renew today (${feeStr}) to continue uninterrupted access.`;
    }
    if (days === 0) {
      return `Hi ${member.fullName}, reminder from ${workspace.profile.gymName}: your ${latest.planName} membership expires today (${expiryStr}). You can renew at the front desk (${feeStr}).`;
    }
    return `Hi ${member.fullName}, your ${latest.planName} membership at ${workspace.profile.gymName} expires in ${days} day${days === 1 ? '' : 's'} on ${expiryStr}. Renew early (${feeStr}) to keep your workout streak going!`;
  };

  const handleCopyTemplate = async (text: string, memberId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      await setMemberReminderStatus(memberId, 'Drafted');
      notify('Reminder message copied to clipboard', 'success');
    } catch {
      await setMemberReminderStatus(memberId, 'Drafted');
      notify('Drafted status saved in database', 'info');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Expiry Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor expiring and overdue memberships from Supabase and track renewal reminders.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-700">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Manual Reminder Preparation: </span>
          Automated WhatsApp dispatch is not connected yet. Prepare and copy renewal messages below while persisting reminder status in Supabase.
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('expiring-soon')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap ${
            tab === 'expiring-soon'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Expiring Soon (≤ 7 Days)</span>
          <span className="font-mono tabular-nums text-[11px] text-amber-700 font-semibold">
            {categorized.expiringSoon.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('expired')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap ${
            tab === 'expired'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Already Expired</span>
          <span className="font-mono tabular-nums text-[11px] text-red-700 font-semibold">
            {categorized.expired.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('upcoming-30')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap ${
            tab === 'upcoming-30'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Upcoming (30 Days)</span>
          <span className="font-mono tabular-nums text-[11px] text-slate-500 font-semibold">
            {categorized.upcoming30.length}
          </span>
        </button>
      </div>

      {/* Expiries Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {activeList.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No memberships in this window"
            description={
              tab === 'expired'
                ? 'All assigned memberships are currently active.'
                : 'No memberships are expiring in the selected timeframe.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Member</th>
                  <th className="py-3 px-4 whitespace-nowrap">Plan</th>
                  <th className="py-3 px-4 whitespace-nowrap">End Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Days Remaining</th>
                  <th className="py-3 px-4 whitespace-nowrap">Reminder Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeList.map(({ member, latest, daysRemaining }) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => onViewMember(member)}
                        className="text-left group"
                      >
                        <div className="font-medium text-slate-900 group-hover:text-blue-600">
                          {member.fullName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          {member.phone} · {member.memberCode}
                        </div>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-800">{latest.planName}</div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {formatINR(latest.price)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {formatDateIN(latest.endDate)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          daysRemaining < 0
                            ? 'text-red-700'
                            : daysRemaining <= 3
                              ? 'text-amber-700'
                              : 'text-slate-700'
                        }`}
                      >
                        {daysRemaining > 0
                          ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`
                          : daysRemaining === 0
                            ? 'Expires today'
                            : `Expired ${Math.abs(daysRemaining)}d ago`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ReminderStatusLabel status={member.reminderStatus} />
                        <select
                          aria-label={`Change reminder status for ${member.fullName}`}
                          value={member.reminderStatus}
                          onChange={(e) =>
                            void setMemberReminderStatus(
                              member.id,
                              e.target.value as ReminderStatus
                            )
                          }
                          className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none focus:border-blue-600"
                        >
                          <option value="Not Sent">Not Sent</option>
                          <option value="Drafted">Drafted</option>
                          <option value="Scheduled">Scheduled</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTemplateTarget({ member, latest })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                          <span>Prepare Message</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewMember(member)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Renew</span>
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

      {/* WhatsApp Message Preview Modal */}
      <Modal
        open={Boolean(templateTarget)}
        onClose={() => setTemplateTarget(null)}
        title="Renewal Reminder Template"
        subtitle={
          templateTarget
            ? `Prepared for ${templateTarget.member.fullName} (${templateTarget.member.phone})`
            : ''
        }
      >
        {templateTarget && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed">
              {getDraftMessage(templateTarget.member, templateTarget.latest)}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  void setMemberReminderStatus(templateTarget.member.id, 'Scheduled');
                  setTemplateTarget(null);
                }}
                className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Mark as Scheduled
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleCopyTemplate(
                    getDraftMessage(templateTarget.member, templateTarget.latest),
                    templateTarget.member.id
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Message</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

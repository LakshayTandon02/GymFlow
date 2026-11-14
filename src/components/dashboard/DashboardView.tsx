import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  IndianRupee,
  MessageSquarePlus,
  RefreshCw,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { AppRoute, Member } from '../../types/gym';
import {
  computeMemberStatus,
  formatDateIN,
  formatINR,
  getCurrentMonthKey,
  getDaysRemaining,
  getLatestMembership,
  getTodayISO,
  isSameLocalDay,
} from '../../utils/membership';
import { RevenueBarChart, StatusDonutChart } from '../common/Charts';
import { SkeletonRows } from '../common/SkeletonRows';
import { MemberStatusLabel, PaymentStatusLabel } from '../common/StatusLabel';

interface DashboardViewProps {
  onNavigate: (route: AppRoute) => void;
  onOpenAddMember: () => void;
  onViewMember: (member: Member) => void;
}

function getLastNMonths(count: number): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    result.push({ key, label });
  }
  return result;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenAddMember,
  onViewMember,
}) => {
  const { workspace, isLoading, workspaceError, refreshWorkspace } = useGym();

  const stats = useMemo(() => {
    const months = getLastNMonths(6);
    if (!workspace) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        inactiveMembers: 0,
        expiredMembers: 0,
        pendingMembers: 0,
        todaysAttendance: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        pendingEnquiries: 0,
        recentMembers: [] as Member[],
        recentPayments: [] as NonNullable<typeof workspace>['payments'],
        upcomingExpiries: [] as { member: Member; daysLeft: number; endDate: string }[],
        monthlyChart: months.map((m) => ({
          label: m.label,
          value: 0,
          secondaryValue: 0,
          secondaryLabel: 'joins',
        })),
      };
    }

    let activeMembers = 0;
    let inactiveMembers = 0;
    let expiredMembers = 0;
    let pendingMembers = 0;

    workspace.members.forEach((m) => {
      const status = computeMemberStatus(m, workspace.memberships, workspace.payments);
      if (status === 'Active') activeMembers += 1;
      else if (status === 'Inactive') inactiveMembers += 1;
      else if (status === 'Expired') expiredMembers += 1;
      else pendingMembers += 1;
    });

    const todayIso = getTodayISO();
    const currentMonthKey = getCurrentMonthKey();

    const todaysAttendance = workspace.attendance.filter((a) =>
      isSameLocalDay(a.checkIn, todayIso)
    ).length;

    const paidPayments = workspace.payments.filter((p) => p.status === 'Paid');
    const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const monthlyRevenue = paidPayments
      .filter((p) => p.paymentDate.startsWith(currentMonthKey))
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingEnquiries = workspace.enquiries.filter(
      (e) => e.status === 'New' || e.status === 'Contacted' || e.status === 'Trial Scheduled'
    ).length;

    const recentMembers = [...workspace.members]
      .sort((a, b) => b.joiningDate.localeCompare(a.joiningDate))
      .slice(0, 5);

    const recentPayments = [...workspace.payments]
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
      .slice(0, 5);

    const upcomingExpiries = workspace.members
      .map((m) => {
        const latest = m.latestMembership ?? getLatestMembership(m.id, workspace.memberships);
        if (!latest) return null;
        return {
          member: m,
          endDate: latest.endDate,
          daysLeft: getDaysRemaining(latest.endDate),
        };
      })
      .filter(
        (item): item is { member: Member; daysLeft: number; endDate: string } =>
          item !== null && item.daysLeft >= 0 && item.daysLeft <= 10
      )
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);

    const monthlyChart = months.map(({ key, label }) => {
      const rev = paidPayments
        .filter((p) => p.paymentDate.startsWith(key))
        .reduce((s, p) => s + p.amount, 0);
      const joins = workspace.members.filter((m) => m.joiningDate.startsWith(key)).length;
      return {
        label,
        value: rev,
        secondaryValue: joins,
        secondaryLabel: 'new joins',
      };
    });

    return {
      totalMembers: workspace.members.length,
      activeMembers,
      inactiveMembers,
      expiredMembers,
      pendingMembers,
      todaysAttendance,
      monthlyRevenue,
      totalRevenue,
      pendingEnquiries,
      recentMembers,
      recentPayments,
      upcomingExpiries,
      monthlyChart,
    };
  }, [workspace]);

  if (workspaceError) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 max-w-2xl">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Database Connection Issue
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{workspaceError}</p>
            <button
              type="button"
              onClick={() => void refreshWorkspace()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !workspace) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-16 bg-slate-200 rounded mt-3" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <SkeletonRows rows={5} cols={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Welcome + Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Welcome back, {workspace.profile.fullName.split(' ')[0]}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {workspace.profile.gymName} · Live operational metrics from Supabase
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAddMember}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Member</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Check-In</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('payments')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>Record Payment</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('enquiries')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Enquiries</span>
          </button>
        </div>
      </div>

      {/* 8 Live KPI Cards (2 clean rows of 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('members')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Members</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {stats.totalMembers}
          </div>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {stats.inactiveMembers} inactive profile{stats.inactiveMembers === 1 ? '' : 's'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('members')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Members</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {stats.activeMembers}
          </div>
          <p className="text-xs text-emerald-700 mt-1 tabular-nums">
            {stats.totalMembers > 0
              ? `${Math.round((stats.activeMembers / stats.totalMembers) * 100)}% of total base`
              : '0% active'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('expiry')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Expired Memberships</span>
            <UserX className="w-4 h-4 text-red-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {stats.expiredMembers}
          </div>
          <p className="text-xs text-red-700 mt-1">Needs renewal follow-up</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Today's Attendance</span>
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {stats.todaysAttendance}
          </div>
          <p className="text-xs text-slate-500 mt-1">Check-ins recorded today</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('payments')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Monthly Revenue</span>
            <IndianRupee className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {formatINR(stats.monthlyRevenue)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Paid this calendar month</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {formatINR(stats.totalRevenue)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Cumulative settled fees</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('enquiries')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Pending Enquiries</span>
            <MessageSquarePlus className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {stats.pendingEnquiries}
          </div>
          <p className="text-xs text-amber-700 mt-1">Open leads awaiting conversion</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('members')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Inactive Members</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {stats.inactiveMembers}
          </div>
          <p className="text-xs text-slate-500 mt-1">Paused or unassigned profiles</p>
        </button>
      </div>

      {/* Charts Row: Revenue Summary + Membership Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Membership Revenue Summary
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                6-month paid fee collections calculated from PostgreSQL payments
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              <span>Full Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <RevenueBarChart data={stats.monthlyChart} />
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Membership Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-6">
              Computed from start/end dates & payment dues
            </p>
            <StatusDonutChart
              centerLabel="Members"
              centerValue={stats.totalMembers}
              segments={[
                { label: 'Active', value: stats.activeMembers, color: '#16A34A' },
                { label: 'Pending Dues', value: stats.pendingMembers, color: '#D97706' },
                { label: 'Expired', value: stats.expiredMembers, color: '#DC2626' },
                { label: 'Inactive', value: stats.inactiveMembers, color: '#94A3B8' },
              ]}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{workspace.plans.length} configured plans</span>
            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              View Directory
            </button>
          </div>
        </section>
      </div>

      {/* Bottom Data Row: Recent Registrations, Recent Payments, & Upcoming Expiries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Member Registrations */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Recent Registrations
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              View All
            </button>
          </div>

          {stats.recentMembers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No members registered yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentMembers.map((member) => {
                const status = computeMemberStatus(
                  member,
                  workspace.memberships,
                  workspace.payments
                );
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onViewMember(member)}
                    className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {member.fullName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {member.memberCode} · {member.latestMembership?.planName ?? 'No plan'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <MemberStatusLabel status={status} />
                      <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                        {formatDateIN(member.joiningDate)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Payments */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Recent Payments
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Ledger
            </button>
          </div>

          {stats.recentPayments.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No payment records yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {pay.memberName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {pay.method} · {formatDateIN(pay.paymentDate)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(pay.amount)}
                    </div>
                    <div className="mt-0.5 flex justify-end">
                      <PaymentStatusLabel status={pay.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Membership Expiries */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Upcoming Expiries
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('expiry')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Manage
            </button>
          </div>

          {stats.upcomingExpiries.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No memberships expiring in the next 10 days.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.upcomingExpiries.map(({ member, daysLeft, endDate }) => (
                <div
                  key={member.id}
                  className="px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onViewMember(member)}
                    className="text-left min-w-0 flex-1"
                  >
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {member.fullName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                      Exp {formatDateIN(endDate)}
                    </div>
                  </button>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-xs font-mono tabular-nums font-semibold ${
                        daysLeft <= 3 ? 'text-amber-700' : 'text-slate-700'
                      }`}
                    >
                      {daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewMember(member)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      Renew
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

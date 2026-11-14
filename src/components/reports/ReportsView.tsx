import React, { useMemo, useState } from 'react';
import { BarChart3, IndianRupee, TrendingUp, UserPlus, Users } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import {
  computeMemberStatus,
  formatINR,
  getCurrentMonthKey,
} from '../../utils/membership';
import { RevenueBarChart, StatusDonutChart } from '../common/Charts';

type DateHorizon = '3m' | '6m' | '12m';

function getMonthBuckets(monthsCount: number): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    result.push({ key, label });
  }
  return result;
}

export const ReportsView: React.FC = () => {
  const { workspace } = useGym();
  const [horizon, setHorizon] = useState<DateHorizon>('6m');

  const analytics = useMemo(() => {
    const monthsCount = horizon === '3m' ? 3 : horizon === '12m' ? 12 : 6;
    const buckets = getMonthBuckets(monthsCount);

    if (!workspace) {
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        failedCount: 0,
        paidCount: 0,
        pendingCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        expiredCount: 0,
        pendingMemberCount: 0,
        totalNewJoins: 0,
        revenueSeries: [] as {
          label: string;
          value: number;
          secondaryValue: number;
          secondaryLabel: string;
        }[],
        registrationsSeries: [] as {
          label: string;
          value: number;
          secondaryValue: number;
          secondaryLabel: string;
        }[],
        methodTotals: [] as { method: string; amount: number; count: number }[],
        planStats: [] as { name: string; members: number; revenue: number }[],
      };
    }

    const currentMonthKey = getCurrentMonthKey();
    const paidPayments = workspace.payments.filter((p) => p.status === 'Paid');
    const pendingPayments = workspace.payments.filter((p) => p.status === 'Pending');
    const failedPayments = workspace.payments.filter((p) => p.status === 'Failed');

    const totalRevenue = paidPayments.reduce((s, p) => s + p.amount, 0);
    const monthlyRevenue = paidPayments
      .filter((p) => p.paymentDate.startsWith(currentMonthKey))
      .reduce((s, p) => s + p.amount, 0);

    let activeCount = 0;
    let inactiveCount = 0;
    let expiredCount = 0;
    let pendingMemberCount = 0;

    workspace.members.forEach((m) => {
      const st = computeMemberStatus(m, workspace.memberships, workspace.payments);
      if (st === 'Active') activeCount += 1;
      else if (st === 'Inactive') inactiveCount += 1;
      else if (st === 'Expired') expiredCount += 1;
      else pendingMemberCount += 1;
    });

    const revenueSeries = buckets.map((b) => {
      const rev = paidPayments
        .filter((p) => p.paymentDate.startsWith(b.key))
        .reduce((s, p) => s + p.amount, 0);
      const count = paidPayments.filter((p) => p.paymentDate.startsWith(b.key)).length;
      return {
        label: b.label,
        value: rev,
        secondaryValue: count,
        secondaryLabel: 'paid invoices',
      };
    });

    const registrationsSeries = buckets.map((b) => {
      const joins = workspace.members.filter((m) => m.joiningDate.startsWith(b.key)).length;
      const renewals = workspace.memberships.filter((ms) =>
        ms.startDate.startsWith(b.key)
      ).length;
      return {
        label: b.label,
        value: joins,
        secondaryValue: renewals,
        secondaryLabel: 'memberships started',
      };
    });

    const totalNewJoins = registrationsSeries.reduce((s, item) => s + item.value, 0);

    const methods = ['UPI', 'Card', 'Cash', 'NetBanking'] as const;
    const methodTotals = methods.map((method) => {
      const matching = paidPayments.filter((p) => p.method === method);
      return {
        method,
        amount: matching.reduce((s, p) => s + p.amount, 0),
        count: matching.length,
      };
    });

    const planStats = workspace.plans.map((plan) => {
      const members = workspace.members.filter(
        (m) => m.latestMembership?.planId === plan.id
      ).length;
      const revenue = paidPayments
        .filter((p) => p.planName === plan.name)
        .reduce((s, p) => s + p.amount, 0);
      return {
        name: plan.name,
        members,
        revenue,
      };
    });

    return {
      totalRevenue,
      monthlyRevenue,
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
      activeCount,
      inactiveCount,
      expiredCount,
      pendingMemberCount,
      totalNewJoins,
      revenueSeries,
      registrationsSeries,
      methodTotals,
      planStats,
    };
  }, [workspace, horizon]);

  if (!workspace) return null;

  const totalMethodRevenue = Math.max(
    analytics.methodTotals.reduce((s, m) => s + m.amount, 0),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Reports & Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time revenue, member retention, and payment collection metrics from Supabase.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start sm:self-auto">
          {(
            [
              { id: '3m', label: 'Last 3 Months' },
              { id: '6m', label: 'Last 6 Months' },
              { id: '12m', label: 'Last 12 Months' },
            ] as { id: DateHorizon; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setHorizon(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                horizon === item.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Revenue</span>
            <IndianRupee className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {formatINR(analytics.totalRevenue)}
          </div>
          <p className="text-xs text-slate-500 mt-1">All-time paid transactions</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Monthly Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {formatINR(analytics.monthlyRevenue)}
          </div>
          <p className="text-xs text-emerald-700 mt-1">Current calendar month</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">New Registrations</span>
            <UserPlus className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {analytics.totalNewJoins}
          </div>
          <p className="text-xs text-slate-500 mt-1">Joined in selected window</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Retention Ratio</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2.5 tabular-nums">
            {workspace.members.length > 0
              ? `${Math.round((analytics.activeCount / workspace.members.length) * 100)}%`
              : '0%'}
          </div>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {analytics.activeCount} active vs {analytics.expiredCount} expired
          </p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Monthly Revenue Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Paid INR collections by month</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <RevenueBarChart data={analytics.revenueSeries} />
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                New Member Registrations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Monthly signups & started plans</p>
            </div>
            <UserPlus className="w-4 h-4 text-slate-400" />
          </div>
          <RevenueBarChart
            data={analytics.registrationsSeries}
            valueFormatter={(v) => String(v)}
            accentColor="#0F172A"
          />
        </section>
      </div>

      {/* Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Active vs Expired Members
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-6">Current member roster status</p>
          <StatusDonutChart
            centerLabel="Total"
            centerValue={workspace.members.length}
            segments={[
              { label: 'Active', value: analytics.activeCount, color: '#16A34A' },
              { label: 'Pending Dues', value: analytics.pendingMemberCount, color: '#D97706' },
              { label: 'Expired', value: analytics.expiredCount, color: '#DC2626' },
              { label: 'Inactive', value: analytics.inactiveCount, color: '#94A3B8' },
            ]}
          />
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Payment Status Summary
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-6">Transaction settlement distribution</p>
          <StatusDonutChart
            centerLabel="Invoices"
            centerValue={workspace.payments.length}
            segments={[
              { label: 'Paid', value: analytics.paidCount, color: '#2563EB' },
              { label: 'Pending', value: analytics.pendingCount, color: '#D97706' },
              { label: 'Failed', value: analytics.failedCount, color: '#DC2626' },
            ]}
          />
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Collection by Payment Method
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-5">Settled INR volume breakdown</p>
          <div className="space-y-4">
            {analytics.methodTotals.map((item) => {
              const pct = Math.round((item.amount / totalMethodRevenue) * 100);
              return (
                <div key={item.method}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">
                      {item.method}{' '}
                      <span className="text-slate-400 font-normal">({item.count})</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(item.amount)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(pct, item.amount > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Plan Performance Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Subscribers & Revenue by Membership Plan
          </h3>
        </div>
        {analytics.planStats.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Create membership plans in the Membership Plans section to see plan-level performance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">Plan Name</th>
                  <th className="py-3 px-6 text-right">Active / Latest Members</th>
                  <th className="py-3 px-6 text-right">Recorded Paid Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {analytics.planStats.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50">
                    <td className="py-3 px-6 font-medium text-slate-900">{row.name}</td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums text-slate-700">
                      {row.members}
                    </td>
                    <td className="py-3 px-6 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {formatINR(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

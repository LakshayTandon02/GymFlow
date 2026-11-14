import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Clock,
  LogIn,
  LogOut as LogOutIcon,
  Search,
  Users,
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import {
  formatDateIN,
  formatDurationMinutes,
  formatTimeIN,
  getTodayISO,
  isSameLocalDay,
} from '../../utils/membership';
import { EmptyState } from '../common/EmptyState';

export const AttendanceView: React.FC = () => {
  const { workspace, checkInMember, checkOutMember, notify } = useGym();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'today' | 'history'>('today');
  const [submitting, setSubmitting] = useState(false);

  const todayIso = getTodayISO();

  const activeCheckInMemberIds = useMemo(() => {
    const set = new Set<string>();
    (workspace?.attendance ?? []).forEach((a) => {
      if (!a.checkOut) set.add(a.memberId);
    });
    return set;
  }, [workspace]);

  const todaysRecords = useMemo(() => {
    return (workspace?.attendance ?? []).filter((a) => isSameLocalDay(a.checkIn, todayIso));
  }, [workspace, todayIso]);

  const currentlyInGym = useMemo(() => {
    return (workspace?.attendance ?? []).filter((a) => !a.checkOut);
  }, [workspace]);

  const filteredRecords = useMemo(() => {
    const base = viewMode === 'today' ? todaysRecords : workspace?.attendance ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        r.memberName.toLowerCase().includes(q) ||
        r.memberCode.toLowerCase().includes(q)
    );
  }, [viewMode, todaysRecords, workspace, searchQuery]);

  if (!workspace) return null;

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      notify('Select a member to check in', 'error');
      return;
    }
    if (activeCheckInMemberIds.has(selectedMemberId)) {
      notify('This member is already checked in.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await checkInMember(selectedMemberId);
      setSelectedMemberId('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Check-in failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    try {
      await checkOutMember(attendanceId);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Check-out failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900">Attendance Management</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Log daily member check-ins, track active floor visits, and review visit history.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Today's Check-Ins</span>
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {todaysRecords.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">{formatDateIN(todayIso)}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Currently on Floor</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {currentlyInGym.length}
          </div>
          <p className="text-xs text-emerald-700 mt-1">Active sessions without check-out</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Logged Visits</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {workspace.attendance.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Recorded in database</p>
        </div>
      </div>

      {/* Quick Check-In Bar */}
      <form
        onSubmit={handleCheckIn}
        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-end gap-4"
      >
        <div className="flex-1">
          <label
            htmlFor="checkin-member"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Quick Member Check-In
          </label>
          <select
            id="checkin-member"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          >
            <option value="">Select a member to check in...</option>
            {workspace.members.map((m) => {
              const alreadyIn = activeCheckInMemberIds.has(m.id);
              return (
                <option key={m.id} value={m.id} disabled={alreadyIn}>
                  {m.fullName} ({m.memberCode}) {alreadyIn ? '— Already Checked In' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedMemberId}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <LogIn className="w-4 h-4" />
          <span>{submitting ? 'Checking in...' : 'Check In Member'}</span>
        </button>
      </form>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setViewMode('today')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'today'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today ({todaysRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All History ({workspace.attendance.length})
          </button>
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member or ID..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredRecords.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={
              viewMode === 'today'
                ? 'No check-ins recorded today'
                : 'No attendance history yet'
            }
            description={
              workspace.members.length === 0
                ? 'Add a gym member first, then record their daily floor check-ins here.'
                : 'Use the Quick Member Check-In bar above when members arrive at the desk.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{record.memberName}</div>
                      <div className="text-xs font-mono text-slate-500">
                        {record.memberCode}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDateIN(record.checkIn)}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-800 tabular-nums whitespace-nowrap">
                      {formatTimeIN(record.checkIn)}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono tabular-nums whitespace-nowrap">
                      {record.checkOut ? (
                        <span className="text-slate-700">{formatTimeIN(record.checkOut)}</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">Active session</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDurationMinutes(record.checkIn, record.checkOut)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {!record.checkOut ? (
                        <button
                          type="button"
                          onClick={() => void handleCheckOut(record.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <LogOutIcon className="w-3.5 h-3.5" />
                          <span>Check Out</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

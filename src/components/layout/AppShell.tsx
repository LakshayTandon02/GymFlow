import React, { useState } from 'react';
import {
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquarePlus,
  Plus,
  Settings,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { AppRoute } from '../../types/gym';
import { getDaysRemaining, getInitials } from '../../utils/membership';

interface AppShellProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onOpenAddMember: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  id: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'plans', label: 'Membership Plans', icon: Layers },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'trainers', label: 'Trainers', icon: UserCheck },
  { id: 'enquiries', label: 'Enquiries', icon: MessageSquarePlus },
  { id: 'expiry', label: 'Expiry Management', icon: CalendarClock },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const ROUTE_TITLES: Record<AppRoute, string> = {
  dashboard: 'Dashboard',
  members: 'Members',
  plans: 'Membership Plans',
  payments: 'Payments',
  attendance: 'Attendance',
  trainers: 'Trainers',
  enquiries: 'Enquiries',
  expiry: 'Expiry Management',
  reports: 'Reports & Analytics',
  settings: 'Settings',
};

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onNavigate,
  onOpenAddMember,
  children,
}) => {
  const { workspace, authUser, logout } = useGym();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const gymName = workspace?.profile.gymName ?? 'GymFlow Studio';
  const gymCity = workspace?.profile.city || 'Operations';
  const ownerName =
    workspace?.profile.fullName ??
    (authUser?.email ? authUser.email.split('@')[0] : 'Gym Owner');
  const ownerRole = workspace?.profile.role ?? 'Gym Owner';

  const expiringOrExpiredCount =
    workspace?.members.filter((m) => {
      const endDate = m.latestMembership?.endDate;
      return endDate ? getDaysRemaining(endDate) <= 7 : false;
    }).length ?? 0;

  const pendingPaymentsCount =
    workspace?.payments.filter((p) => p.status === 'Pending').length ?? 0;

  const openEnquiriesCount =
    workspace?.enquiries.filter((e) => e.status === 'New' || e.status === 'Trial Scheduled')
      .length ?? 0;

  const activeCheckInsCount =
    workspace?.attendance.filter((a) => !a.checkOut).length ?? 0;

  const handleSelectRoute = (route: AppRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0B1324] text-slate-200 select-none">
      {/* Brand Lockup */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-base font-bold text-white tracking-tight truncate">
                GymFlow
              </div>
              <div className="text-xs text-slate-400 truncate">{gymName}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Sidebar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          const count =
            item.id === 'expiry'
              ? expiringOrExpiredCount
              : item.id === 'payments'
                ? pendingPaymentsCount
                : item.id === 'enquiries'
                  ? openEnquiriesCount
                  : item.id === 'attendance'
                    ? activeCheckInsCount
                    : 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectRoute(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {count > 0 && (
                <span
                  className={`text-xs font-mono tabular-nums ${
                    isActive
                      ? 'text-blue-100'
                      : item.id === 'attendance'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Owner Profile Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/[0.04]">
          <div className="w-9 h-9 rounded-lg bg-slate-700 text-white text-xs font-semibold flex items-center justify-center shrink-0">
            {getInitials(ownerName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{ownerName}</p>
            <p className="text-xs text-slate-400 truncate">{ownerRole}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            title="Sign out"
            aria-label="Sign out"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile / Tablet Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-[270px] max-w-[85vw] h-full z-10 shadow-2xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">{gymName}</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-display text-base sm:text-lg font-semibold text-slate-900 truncate">
                {ROUTE_TITLES[currentRoute]}
              </h1>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
            <span>{gymCity}</span>
            <span aria-hidden="true">·</span>
            <span>{ownerName}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenAddMember}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

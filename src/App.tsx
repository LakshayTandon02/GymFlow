/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AttendanceView } from './components/attendance/AttendanceView';
import { AuthScreens } from './components/auth/AuthScreens';
import { ToastContainer } from './components/common/ToastContainer';
import { DashboardView } from './components/dashboard/DashboardView';
import { EnquiriesView } from './components/enquiries/EnquiriesView';
import { ExpiryView } from './components/expiry/ExpiryView';
import { AppShell } from './components/layout/AppShell';
import { MemberDetailModal, MemberFormModal } from './components/members/MemberModals';
import { MembersView } from './components/members/MembersView';
import { PaymentsView } from './components/payments/PaymentsView';
import { PlansView } from './components/plans/PlansView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { TrainersView } from './components/trainers/TrainersView';
import { GymProvider, useGym } from './context/GymContext';
import { AppRoute, Member } from './types/gym';

const GymFlowAppContent: React.FC = () => {
  const { authReady, isAuthenticated, passwordRecoveryMode, configError } = useGym();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('dashboard');

  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  const openAddMember = () => {
    setEditingMember(null);
    setMemberFormOpen(true);
  };

  const openEditMember = (member: Member) => {
    setEditingMember(member);
    setMemberFormOpen(true);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Connecting to GymFlow workspace...</p>
        </div>
      </div>
    );
  }

  if (configError || !isAuthenticated || passwordRecoveryMode) {
    return (
      <>
        <AuthScreens />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <AppShell
        currentRoute={currentRoute}
        onNavigate={setCurrentRoute}
        onOpenAddMember={openAddMember}
      >
        {currentRoute === 'dashboard' && (
          <DashboardView
            onNavigate={setCurrentRoute}
            onOpenAddMember={openAddMember}
            onViewMember={setViewingMember}
          />
        )}
        {currentRoute === 'members' && (
          <MembersView
            onOpenAddMember={openAddMember}
            onEditMember={openEditMember}
            onViewMember={setViewingMember}
          />
        )}
        {currentRoute === 'plans' && <PlansView />}
        {currentRoute === 'payments' && <PaymentsView />}
        {currentRoute === 'attendance' && <AttendanceView />}
        {currentRoute === 'trainers' && <TrainersView />}
        {currentRoute === 'enquiries' && <EnquiriesView />}
        {currentRoute === 'expiry' && <ExpiryView onViewMember={setViewingMember} />}
        {currentRoute === 'reports' && <ReportsView />}
        {currentRoute === 'settings' && <SettingsView />}
      </AppShell>

      <MemberFormModal
        open={memberFormOpen}
        onClose={() => {
          setMemberFormOpen(false);
          setEditingMember(null);
        }}
        editingMember={editingMember}
      />

      <MemberDetailModal
        member={viewingMember}
        onClose={() => setViewingMember(null)}
        onEdit={openEditMember}
      />

      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <GymProvider>
      <GymFlowAppContent />
    </GymProvider>
  );
}

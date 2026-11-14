import React, { useEffect, useState } from 'react';
import { Bell, Building2, Lock, User } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { isValidIndianPhone } from '../../utils/membership';

type SettingsTab = 'gym' | 'owner' | 'notifications' | 'account';

export const SettingsView: React.FC = () => {
  const { workspace, updateProfile, updateNotifications, completePasswordUpdate, notify } =
    useGym();

  const [activeTab, setActiveTab] = useState<SettingsTab>('gym');

  // Gym profile fields
  const [gymName, setGymName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [gymPhone, setGymPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [gymError, setGymError] = useState('');
  const [savingGym, setSavingGym] = useState(false);

  // Owner profile fields
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerRole, setOwnerRole] = useState('');
  const [ownerError, setOwnerError] = useState('');
  const [savingOwner, setSavingOwner] = useState(false);

  // Notification toggles
  const [notif7Days, setNotif7Days] = useState(true);
  const [notif3Days, setNotif3Days] = useState(true);
  const [notifSameDay, setNotifSameDay] = useState(true);
  const [notifPendingPay, setNotifPendingPay] = useState(true);
  const [notifDailySummary, setNotifDailySummary] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  // Account password form
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    const p = workspace.profile;
    setGymName(p.gymName);
    setTagline(p.tagline);
    setAddress(p.address);
    setCity(p.city);
    setGymPhone(p.phone);
    setGstNumber(p.gstNumber);

    setOwnerName(p.fullName);
    setOwnerEmail(p.email);
    setOwnerPhone(p.phone);
    setOwnerRole(p.role);

    setNotif7Days(p.notifications.expiryReminder7Days);
    setNotif3Days(p.notifications.expiryReminder3Days);
    setNotifSameDay(p.notifications.expiryReminderSameDay);
    setNotifPendingPay(p.notifications.pendingPaymentAlerts);
    setNotifDailySummary(p.notifications.dailyBusinessSummary);
  }, [workspace]);

  if (!workspace) return null;

  const handleSaveGym = async (e: React.FormEvent) => {
    e.preventDefault();
    setGymError('');
    if (gymName.trim().length < 2) {
      setGymError('Gym name is required.');
      return;
    }
    if (gymPhone.trim() && !isValidIndianPhone(gymPhone)) {
      setGymError('Enter a valid 10-digit Indian phone number.');
      return;
    }
    setSavingGym(true);
    try {
      await updateProfile({
        ...workspace.profile,
        gymName: gymName.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: gymPhone.trim(),
        gstNumber: gstNumber.trim(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save gym profile';
      setGymError(msg);
      notify(msg, 'error');
    } finally {
      setSavingGym(false);
    }
  };

  const handleSaveOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError('');
    if (ownerName.trim().length < 2) {
      setOwnerError('Owner full name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
      setOwnerError('Enter a valid email address.');
      return;
    }
    setSavingOwner(true);
    try {
      await updateProfile({
        ...workspace.profile,
        fullName: ownerName.trim(),
        email: ownerEmail.trim(),
        phone: ownerPhone.trim(),
        role: ownerRole.trim(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save owner profile';
      setOwnerError(msg);
      notify(msg, 'error');
    } finally {
      setSavingOwner(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotif(true);
    try {
      await updateNotifications({
        expiryReminder7Days: notif7Days,
        expiryReminder3Days: notif3Days,
        expiryReminderSameDay: notifSameDay,
        pendingPaymentAlerts: notifPendingPay,
        dailyBusinessSummary: notifDailySummary,
      });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save preferences', 'error');
    } finally {
      setSavingNotif(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setSavingPw(true);
    try {
      await completePasswordUpdate(newPw);
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update password';
      setPwError(msg);
      notify(msg, 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    [
      { id: 'gym', label: 'Gym Profile', icon: Building2 },
      { id: 'owner', label: 'Owner Information', icon: User },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'account', label: 'Account Security', icon: Lock },
    ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your gym profile, owner details, alert preferences, and Supabase account password.
        </p>
      </div>

      {/* Horizontal Settings Sub-Nav */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'gym' && (
        <form
          onSubmit={handleSaveGym}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">Gym Profile</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Stored in your Supabase owner profile and displayed across GymFlow.
            </p>
          </div>

          {gymError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {gymError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Gym Name</label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Strength & Conditioning Studio"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Desk Phone
              </label>
              <input
                type="tel"
                value={gymPhone}
                onChange={(e) => setGymPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingGym}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {savingGym ? 'Saving...' : 'Save Gym Profile'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'owner' && (
        <form
          onSubmit={handleSaveOwner}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Owner Information
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Primary administrator profile linked to your Supabase user ID.
            </p>
          </div>

          {ownerError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {ownerError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Title / Role
              </label>
              <input
                type="text"
                value={ownerRole}
                onChange={(e) => setOwnerRole(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Personal Phone
              </label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingOwner}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {savingOwner ? 'Saving...' : 'Save Owner Details'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'notifications' && (
        <form
          onSubmit={handleSaveNotifications}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Notification Preferences
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Saved directly to your owner profile in PostgreSQL.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {[
              {
                label: '7-day pre-expiry reminder',
                desc: 'Queue renewal reminder 7 days before membership expires.',
                checked: notif7Days,
                onChange: setNotif7Days,
              },
              {
                label: '3-day pre-expiry reminder',
                desc: 'Follow-up reminder 3 days prior to membership expiry.',
                checked: notif3Days,
                onChange: setNotif3Days,
              },
              {
                label: 'Expiry day alert',
                desc: 'Notify member on the final valid day of their plan.',
                checked: notifSameDay,
                onChange: setNotifSameDay,
              },
              {
                label: 'Pending payment alerts',
                desc: 'Highlight unpaid invoices on the GymFlow owner dashboard.',
                checked: notifPendingPay,
                onChange: setNotifPendingPay,
              },
              {
                label: 'Daily business summary digest',
                desc: 'End-of-day collection & signup summary preference.',
                checked: notifDailySummary,
                onChange: setNotifDailySummary,
              },
            ].map((item) => (
              <label
                key={item.label}
                className="py-3.5 flex items-center justify-between gap-4 cursor-pointer"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{item.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.onChange(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 shrink-0"
                />
              </label>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingNotif}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {savingNotif ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'account' && (
        <form
          onSubmit={handlePasswordSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Update Account Password
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Changes your authenticated Supabase login password immediately.
            </p>
          </div>

          {pwError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {pwError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingPw}
              className="px-5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-60"
            >
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

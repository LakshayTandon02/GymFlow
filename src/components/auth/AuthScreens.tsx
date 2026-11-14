import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Dumbbell,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { AuthScreenMode } from '../../types/gym';
import { isValidIndianPhone } from '../../utils/membership';

export const AuthScreens: React.FC = () => {
  const {
    configError,
    login,
    register,
    sendPasswordReset,
    completePasswordUpdate,
    passwordRecoveryMode,
    clearPasswordRecoveryMode,
  } = useGym();

  const [mode, setMode] = useState<AuthScreenMode>('login');

  useEffect(() => {
    if (passwordRecoveryMode) {
      setMode('update-password');
    }
  }, [passwordRecoveryMode]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regGymName, setRegGymName] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regConfirmNotice, setRegConfirmNotice] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Update password (from recovery link) state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatePwError, setUpdatePwError] = useState('');
  const [updatePwSubmitting, setUpdatePwSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (loginPassword.length < 6) {
      setLoginError('Password must be at least 6 characters.');
      return;
    }

    setLoginSubmitting(true);
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (regName.trim().length < 2) {
      setRegError('Please enter the gym owner full name.');
      return;
    }
    if (regGymName.trim().length < 2) {
      setRegError('Please enter your gym or studio name.');
      return;
    }
    if (regCity.trim().length < 2) {
      setRegError('Please enter your city.');
      return;
    }
    if (!isValidIndianPhone(regPhone)) {
      setRegError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Passwords do not match.');
      return;
    }

    setRegSubmitting(true);
    try {
      const { needsEmailConfirmation } = await register({
        fullName: regName,
        gymName: regGymName,
        city: regCity,
        phone: regPhone,
        email: regEmail,
        password: regPassword,
      });
      if (needsEmailConfirmation) {
        setRegConfirmNotice(true);
      }
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setResetError('Please enter the email address associated with your GymFlow account.');
      return;
    }

    setResetSubmitting(true);
    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to send recovery email.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatePwError('');
    if (newPassword.length < 6) {
      setUpdatePwError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setUpdatePwError('Passwords do not match.');
      return;
    }

    setUpdatePwSubmitting(true);
    try {
      await completePasswordUpdate(newPassword);
      setMode('login');
    } catch (err) {
      setUpdatePwError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setUpdatePwSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Left Brand Showcase Panel */}
      <aside className="lg:w-[46%] xl:w-[44%] bg-[#0B1324] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 20%, #2563EB 0%, transparent 45%), radial-gradient(circle at 85% 85%, #1E40AF 0%, transparent 40%)',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white">
                GymFlow
              </span>
              <p className="text-xs text-slate-400">Club Operations Platform</p>
            </div>
          </div>

          <div className="mt-12 lg:mt-20 max-w-md">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight [text-wrap:balance]">
              Run your independent gym with complete financial clarity.
            </h1>
            <p className="mt-4 text-base text-slate-300 leading-relaxed">
              Manage members, membership plans, INR payments, daily attendance, trainers, and enquiries in one isolated multi-tenant workspace.
            </p>

            <div className="mt-10 space-y-4 border-t border-white/10 pt-8">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Multi-Tenant PostgreSQL Security</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Every gym owner operates inside row-level isolated cloud storage.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Automated Expiry & Attendance Ledger</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live check-ins, plan renewals, and pending dues computed from real records.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Lead-to-Member Pipeline</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Capture walk-ins and Instagram enquiries and convert them in one click.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>GymFlow Operations Suite</span>
          <span>Powered by Supabase Auth & PostgreSQL</span>
        </div>
      </aside>

      {/* Right Authentication Form Area */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-7 sm:p-9">
          {configError ? (
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Supabase Configuration Required
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">{configError}</p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-slate-900">Setup Checklist:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Add <code className="font-mono text-slate-900">VITE_SUPABASE_URL</code> and{' '}
                    <code className="font-mono text-slate-900">VITE_SUPABASE_ANON_KEY</code> in AI Studio Secrets (or <code className="font-mono">.env</code>).
                  </li>
                  <li>
                    Execute <code className="font-mono text-slate-900">supabase/schema.sql</code> in your Supabase SQL Editor.
                  </li>
                  <li>Reload this preview to sign in or register your gym.</li>
                </ol>
              </div>
            </div>
          ) : mode === 'login' ? (
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Sign in to GymFlow
              </h2>
              <p className="text-sm text-slate-500 mt-1.5">
                Access your gym dashboard, members, attendance, and billing records.
              </p>

              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4" noValidate>
                {loginError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                    {loginError}
                  </div>
                )}

                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Owner Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="owner@yourgym.in"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(loginEmail);
                        setResetSent(false);
                        setResetError('');
                        setMode('forgot-password');
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginSubmitting}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-60"
                >
                  {loginSubmitting ? 'Signing in...' : 'Sign In to Dashboard'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-600">
                  New gym on GymFlow?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setRegError('');
                      setRegConfirmNotice(false);
                      setMode('register');
                    }}
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Create owner account
                  </button>
                </p>
              </div>
            </div>
          ) : mode === 'register' ? (
            <div>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </button>

              <h2 className="font-display text-2xl font-bold text-slate-900">
                Register your gym
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Create your GymFlow owner account and cloud database workspace.
              </p>

              {regConfirmNotice ? (
                <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Verify your email address
                      </p>
                      <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                        We sent a confirmation link to <span className="font-medium">{regEmail}</span>. Confirm your email to activate your account and sign in.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="w-full py-2 px-4 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                  >
                    Go to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-3.5" noValidate>
                  {regError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                      {regError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700 mb-1">
                        Owner Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="reg-name"
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Vikramaditya Rao"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-700 mb-1">
                        Mobile (+91)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="reg-phone"
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="98450 11223"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="reg-gym" className="block text-xs font-medium text-slate-700 mb-1">
                        Gym / Studio Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="reg-gym"
                          type="text"
                          value={regGymName}
                          onChange={(e) => setRegGymName(e.target.value)}
                          placeholder="IronPulse Fitness"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="reg-city" className="block text-xs font-medium text-slate-700 mb-1">
                        City
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="reg-city"
                          type="text"
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          placeholder="Bengaluru"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="owner@yourgym.in"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="reg-password" className="block text-xs font-medium text-slate-700 mb-1">
                        Password
                      </label>
                      <input
                        id="reg-password"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-confirm" className="block text-xs font-medium text-slate-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        id="reg-confirm"
                        type="password"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={regSubmitting}
                    className="w-full py-2.5 px-4 mt-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-60"
                  >
                    {regSubmitting ? 'Creating Account...' : 'Create Workspace'}
                  </button>
                </form>
              )}
            </div>
          ) : mode === 'forgot-password' ? (
            <div>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </button>

              <h2 className="font-display text-2xl font-bold text-slate-900">
                Reset your password
              </h2>
              <p className="text-sm text-slate-500 mt-1.5">
                Enter your registered owner email to receive a Supabase password recovery link.
              </p>

              {resetSent ? (
                <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Password reset email sent
                      </p>
                      <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                        Check the inbox for <span className="font-medium">{resetEmail}</span> and open the recovery link to set a new password.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="mt-4 w-full py-2 px-4 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="mt-6 space-y-4" noValidate>
                  {resetError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                      {resetError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Registered Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="owner@yourgym.in"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {resetSubmitting ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Set a new password
              </h2>
              <p className="text-sm text-slate-500 mt-1.5">
                Enter your new password to complete account recovery.
              </p>

              <form onSubmit={handleUpdatePasswordSubmit} className="mt-6 space-y-4" noValidate>
                {updatePwError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                    {updatePwError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      clearPasswordRecoveryMode();
                      setMode('login');
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatePwSubmitting}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
                  >
                    {updatePwSubmitting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

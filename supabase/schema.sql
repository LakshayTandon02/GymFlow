-- ============================================================================
-- GymFlow Phase 2: Multi-Tenant PostgreSQL Schema & Row-Level Security (RLS)
-- Execute this complete script in your Supabase Project -> SQL Editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES (1:1 with auth.users for each Gym Owner)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  gym_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Founder & Head Coach',
  tagline TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  gst_number TEXT NOT NULL DEFAULT '',
  notification_preferences JSONB NOT NULL DEFAULT '{
    "expiryReminder7Days": true,
    "expiryReminder3Days": true,
    "expiryReminderSameDay": true,
    "pendingPaymentAlerts": true,
    "dailyBusinessSummary": false
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. MEMBERSHIP PLANS (Reusable plan catalog per gym owner)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle TEXT NOT NULL CHECK (cycle IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Custom')),
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  fee NUMERIC(10, 2) NOT NULL CHECK (fee >= 0),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_membership_plans_owner_id UNIQUE (owner_id, id)
);

-- ----------------------------------------------------------------------------
-- 3. MEMBERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'Male' CHECK (gender IN ('Male', 'Female', 'Other')),
  date_of_birth DATE,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Expired', 'Pending')),
  goal TEXT NOT NULL DEFAULT 'General Fitness',
  emergency_contact TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  reminder_status TEXT NOT NULL DEFAULT 'Not Sent' CHECK (reminder_status IN ('Not Sent', 'Drafted', 'Scheduled')),
  last_reminder_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_members_owner_id UNIQUE (owner_id, id)
);

-- ----------------------------------------------------------------------------
-- 4. MEMBERSHIPS (Assigned plans, start/end dates, renewal history)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  plan_id UUID,
  plan_name TEXT NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0), -- duration in months
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Pending', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_membership_dates CHECK (end_date >= start_date),
  CONSTRAINT uq_memberships_owner_id UNIQUE (owner_id, id),
  CONSTRAINT fk_memberships_member_owner
    FOREIGN KEY (owner_id, member_id)
    REFERENCES public.members(owner_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_memberships_plan_owner
    FOREIGN KEY (owner_id, plan_id)
    REFERENCES public.membership_plans(owner_id, id)
    ON DELETE SET NULL (plan_id)
);

-- ----------------------------------------------------------------------------
-- 5. PAYMENTS (Manual fee recording & transaction history)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  membership_id UUID,
  plan_name TEXT NOT NULL DEFAULT 'Membership Fee',
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'Card', 'Cash', 'NetBanking')),
  status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Failed')),
  transaction_reference TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_payments_member_owner
    FOREIGN KEY (owner_id, member_id)
    REFERENCES public.members(owner_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_payments_membership_owner
    FOREIGN KEY (owner_id, membership_id)
    REFERENCES public.memberships(owner_id, id)
    ON DELETE SET NULL (membership_id)
);

-- ----------------------------------------------------------------------------
-- 6. ATTENDANCE (Daily check-in / check-out tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_attendance_checkout CHECK (check_out IS NULL OR check_out >= check_in),
  CONSTRAINT fk_attendance_member_owner
    FOREIGN KEY (owner_id, member_id)
    REFERENCES public.members(owner_id, id)
    ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 7. TRAINERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  specialization TEXT NOT NULL,
  salary NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (salary >= 0),
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. ENQUIRIES (Prospective member leads & conversion pipeline)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'Walk-in' CHECK (source IN ('Walk-in', 'Instagram', 'Google', 'Referral', 'Phone Call', 'Other')),
  interested_plan TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Trial Scheduled', 'Converted', 'Lost')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_plans_owner ON public.membership_plans(owner_id);

CREATE INDEX IF NOT EXISTS idx_members_owner ON public.members(owner_id);
CREATE INDEX IF NOT EXISTS idx_members_owner_status ON public.members(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_members_owner_name ON public.members(owner_id, full_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_owner_code ON public.members(owner_id, member_code);

CREATE INDEX IF NOT EXISTS idx_memberships_owner ON public.memberships(owner_id);
CREATE INDEX IF NOT EXISTS idx_memberships_member ON public.memberships(member_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON public.memberships(owner_id, end_date);

CREATE INDEX IF NOT EXISTS idx_payments_owner ON public.payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(owner_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_attendance_owner_checkin ON public.attendance(owner_id, check_in DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON public.attendance(member_id);
-- Enforce at DB level that a member cannot have two simultaneous open check-ins
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_active_checkin
  ON public.attendance(owner_id, member_id)
  WHERE check_out IS NULL;

CREATE INDEX IF NOT EXISTS idx_trainers_owner ON public.trainers(owner_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_owner_status ON public.enquiries(owner_id, status);

-- ============================================================================
-- TRIGGERS: updated_at & Automatic Profile Creation on Auth SignUp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, gym_name, email, phone, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'gym_name', 'My Fitness Studio'),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — STRICT MULTI-TENANT ISOLATION
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- MEMBERSHIP PLANS POLICIES
DROP POLICY IF EXISTS "plans_select_own" ON public.membership_plans;
CREATE POLICY "plans_select_own" ON public.membership_plans
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "plans_insert_own" ON public.membership_plans;
CREATE POLICY "plans_insert_own" ON public.membership_plans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "plans_update_own" ON public.membership_plans;
CREATE POLICY "plans_update_own" ON public.membership_plans
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "plans_delete_own" ON public.membership_plans;
CREATE POLICY "plans_delete_own" ON public.membership_plans
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- MEMBERS POLICIES
DROP POLICY IF EXISTS "members_select_own" ON public.members;
CREATE POLICY "members_select_own" ON public.members
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "members_insert_own" ON public.members;
CREATE POLICY "members_insert_own" ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "members_update_own" ON public.members;
CREATE POLICY "members_update_own" ON public.members
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "members_delete_own" ON public.members;
CREATE POLICY "members_delete_own" ON public.members
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- MEMBERSHIPS POLICIES
DROP POLICY IF EXISTS "memberships_select_own" ON public.memberships;
CREATE POLICY "memberships_select_own" ON public.memberships
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "memberships_insert_own" ON public.memberships;
CREATE POLICY "memberships_insert_own" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "memberships_update_own" ON public.memberships;
CREATE POLICY "memberships_update_own" ON public.memberships
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "memberships_delete_own" ON public.memberships;
CREATE POLICY "memberships_delete_own" ON public.memberships
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- PAYMENTS POLICIES
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
CREATE POLICY "payments_insert_own" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "payments_update_own" ON public.payments;
CREATE POLICY "payments_update_own" ON public.payments
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "payments_delete_own" ON public.payments;
CREATE POLICY "payments_delete_own" ON public.payments
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ATTENDANCE POLICIES
DROP POLICY IF EXISTS "attendance_select_own" ON public.attendance;
CREATE POLICY "attendance_select_own" ON public.attendance
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "attendance_insert_own" ON public.attendance;
CREATE POLICY "attendance_insert_own" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "attendance_update_own" ON public.attendance;
CREATE POLICY "attendance_update_own" ON public.attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "attendance_delete_own" ON public.attendance;
CREATE POLICY "attendance_delete_own" ON public.attendance
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- TRAINERS POLICIES
DROP POLICY IF EXISTS "trainers_select_own" ON public.trainers;
CREATE POLICY "trainers_select_own" ON public.trainers
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "trainers_insert_own" ON public.trainers;
CREATE POLICY "trainers_insert_own" ON public.trainers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "trainers_update_own" ON public.trainers;
CREATE POLICY "trainers_update_own" ON public.trainers
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "trainers_delete_own" ON public.trainers;
CREATE POLICY "trainers_delete_own" ON public.trainers
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ENQUIRIES POLICIES
DROP POLICY IF EXISTS "enquiries_select_own" ON public.enquiries;
CREATE POLICY "enquiries_select_own" ON public.enquiries
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "enquiries_insert_own" ON public.enquiries;
CREATE POLICY "enquiries_insert_own" ON public.enquiries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "enquiries_update_own" ON public.enquiries;
CREATE POLICY "enquiries_update_own" ON public.enquiries
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "enquiries_delete_own" ON public.enquiries;
CREATE POLICY "enquiries_delete_own" ON public.enquiries
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Migration: Add Admin Audit Log
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);

-- RLS enabled with no public policies - only service role can access
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Grant access (service role bypasses RLS, so no policies needed)
GRANT ALL ON public.admin_audit_log TO authenticated;

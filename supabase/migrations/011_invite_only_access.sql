-- Migration 011: Invite-only access indexes
-- Adds performance indexes for the invite-only registration checks.

-- Speed up lookups by email+status in trip_invitations (used by check-invite-status and check-registration-access)
CREATE INDEX IF NOT EXISTS idx_trip_invitations_email_status
ON trip_invitations(email, status);

-- Speed up email lookups in profiles (used by check-invite-status to detect existing users)
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON profiles(email);

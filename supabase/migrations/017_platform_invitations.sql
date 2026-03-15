-- Migration 017: Sistema inviti piattaforma
-- Ogni utente può invitare fino a 5 nuovi utenti al mese.

CREATE TABLE platform_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by  UUID NOT NULL REFERENCES auth.users(id),
  email       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'revoked')),
  token       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ricerca rapida per email (usata da check-registration-access)
CREATE INDEX idx_platform_invitations_email   ON platform_invitations(email, status);
-- Ricerca rapida per invitante + data (usata per conteggio mensile)
CREATE INDEX idx_platform_invitations_by_user ON platform_invitations(invited_by, created_at);

-- RLS: gli utenti possono leggere solo i propri inviti inviati
ALTER TABLE platform_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own platform invitations"
  ON platform_invitations FOR SELECT
  USING (auth.uid() = invited_by);

-- Le operazioni di scrittura vengono eseguite tramite service role dal backend

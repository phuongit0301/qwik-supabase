1. TODO
  - Create pending_registrations table in Supabase
  - Update auth.ts to use database instead of in-memory

2. Cần tạo table trong Supabase. Chạy SQL này trong Supabase SQL Editor:

-- Create pending_registrations table
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  otp_expiry TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_pending_registrations_email ON pending_registrations(email);

-- Enable RLS
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage (for server-side operations)
CREATE POLICY "Service role can manage pending_registrations" ON pending_registrations
  FOR ALL USING (true);

-- Auto-delete expired registrations (optional - run as cron job)
-- DELETE FROM pending_registrations WHERE otp_expiry < NOW();
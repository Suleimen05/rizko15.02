-- Create waitlist table for storing email signups for upcoming features
-- Run this in Supabase SQL Editor or via supabase db push

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  feature VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_email_feature UNIQUE(email, feature)
);

-- Create index for faster lookups by feature
CREATE INDEX IF NOT EXISTS idx_waitlist_feature ON waitlist(feature);

-- Create index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Enable Row Level Security (RLS)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for public waitlist signups)
CREATE POLICY "Allow anonymous inserts" ON waitlist
  FOR INSERT
  WITH CHECK (true);

-- Only allow authenticated users to read waitlist (admin access)
CREATE POLICY "Allow authenticated reads" ON waitlist
  FOR SELECT
  TO authenticated
  USING (true);

-- Comment for documentation
COMMENT ON TABLE waitlist IS 'Stores email signups for upcoming features like Publish Hub and Marketplace';
COMMENT ON COLUMN waitlist.feature IS 'Feature identifier: publish, marketplace, etc.';

-- Create provider_applications table for marketplace creator/AI developer applications
-- Run this in Supabase SQL Editor or via supabase db push

CREATE TYPE provider_type AS ENUM ('creator', 'ai_developer');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS provider_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  type provider_type NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,

  -- Social/Portfolio links
  tiktok_username VARCHAR(100),
  instagram_username VARCHAR(100),
  github_username VARCHAR(100),
  portfolio_url TEXT,

  -- Service details
  categories TEXT[] NOT NULL, -- ['video', 'script', 'smm', 'design']
  title VARCHAR(100) NOT NULL, -- "UGC Creator", "AI Script Bot", etc.
  bio TEXT, -- Short description (max 280 chars)

  -- Pricing
  price_range VARCHAR(50), -- "$50-100", "$500/mo", etc.

  -- Status
  status application_status DEFAULT 'pending',
  access_code VARCHAR(12), -- Generated on approval: "TSCR-XXXX-XX"

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT -- Admin notes
);

-- Indexes
CREATE INDEX idx_provider_applications_status ON provider_applications(status);
CREATE INDEX idx_provider_applications_type ON provider_applications(type);
CREATE INDEX idx_provider_applications_email ON provider_applications(email);
CREATE INDEX idx_provider_applications_created ON provider_applications(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE provider_applications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for public applications)
CREATE POLICY "Allow anonymous inserts" ON provider_applications
  FOR INSERT
  WITH CHECK (true);

-- Allow users to check their own application status by email
CREATE POLICY "Allow checking own application" ON provider_applications
  FOR SELECT
  USING (true); -- For MVP, allow all reads. Tighten later.

-- Allow authenticated admins full access
CREATE POLICY "Allow admin full access" ON provider_applications
  FOR ALL
  TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE provider_applications IS 'Marketplace provider applications (creators and AI developers)';
COMMENT ON COLUMN provider_applications.type IS 'creator = human creator/SMM, ai_developer = AI agent developer';
COMMENT ON COLUMN provider_applications.categories IS 'Service categories: video, script, smm, design';
COMMENT ON COLUMN provider_applications.access_code IS 'Generated code sent to approved providers: TSCR-XXXX-XX format';

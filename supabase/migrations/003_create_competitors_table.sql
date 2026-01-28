-- Create user_competitors table
CREATE TABLE IF NOT EXISTS user_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    nickname TEXT,
    avatar TEXT,
    follower_count BIGINT DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    platform TEXT DEFAULT 'tiktok',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, username)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_competitors_user_id ON user_competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_competitors_username ON user_competitors(username);

-- Enable RLS (Row Level Security)
ALTER TABLE user_competitors ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own competitors
CREATE POLICY "Users can view own competitors"
    ON user_competitors FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own competitors
CREATE POLICY "Users can insert own competitors"
    ON user_competitors FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own competitors
CREATE POLICY "Users can update own competitors"
    ON user_competitors FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own competitors
CREATE POLICY "Users can delete own competitors"
    ON user_competitors FOR DELETE
    USING (auth.uid() = user_id);

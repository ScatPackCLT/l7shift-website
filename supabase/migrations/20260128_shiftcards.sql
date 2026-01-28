-- ShiftCards Tables Migration
-- Created: 2026-01-28

-- ShiftCards Users table
CREATE TABLE IF NOT EXISTS shiftcard_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text,
  tier text CHECK (tier IN ('basic', 'pro', 'custom')),
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

-- ShiftCards main table
CREATE TABLE IF NOT EXISTS shiftcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES shiftcard_users(id),
  slug text UNIQUE NOT NULL,
  tier text NOT NULL DEFAULT 'basic',
  theme text DEFAULT 'black',

  -- Contact info
  name text NOT NULL,
  title text,
  company text,
  email text,
  phone text,
  website text,
  tagline text,
  bio text,

  -- Avatar
  avatar_type text CHECK (avatar_type IN ('initials', 'photo')) DEFAULT 'initials',
  avatar_url text,

  -- Socials (JSONB for flexibility)
  socials jsonb DEFAULT '{}',

  -- Custom options (Pro/Custom)
  custom_domain text,
  accent_color text,
  show_branding boolean DEFAULT true,
  animations_enabled boolean DEFAULT false,
  custom_css text,

  -- Metadata
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ShiftCards Analytics table (Pro/Custom only)
CREATE TABLE IF NOT EXISTS shiftcard_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES shiftcards(id),
  event_type text CHECK (event_type IN ('view', 'save', 'click')),
  click_target text,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shiftcards_slug ON shiftcards(slug);
CREATE INDEX IF NOT EXISTS idx_shiftcards_user ON shiftcards(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_card ON shiftcard_analytics(card_id);

-- Enable RLS
ALTER TABLE shiftcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE shiftcard_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shiftcard_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read of published cards
DROP POLICY IF EXISTS "Public can view published cards" ON shiftcards;
CREATE POLICY "Public can view published cards" ON shiftcards
  FOR SELECT USING (published = true);

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON shiftcards;
CREATE POLICY "Service role full access" ON shiftcards
  FOR ALL USING (true) WITH CHECK (true);

-- Policy: Allow public analytics inserts (for tracking views)
DROP POLICY IF EXISTS "Public can insert analytics" ON shiftcard_analytics;
CREATE POLICY "Public can insert analytics" ON shiftcard_analytics
  FOR INSERT WITH CHECK (true);

-- Insert Ken's card
INSERT INTO shiftcards (
  slug, tier, theme, name, title, company, email, phone, website, tagline,
  avatar_type, socials, show_branding, animations_enabled, published
) VALUES (
  'ken',
  'custom',
  'black',
  'Ken Leftwich',
  'Founder and Chief SymbAIote',
  'L7 Shift',
  'ken@l7shift.com',
  '(704) 839-9448',
  'https://l7shift.com',
  'Digital transformation for the non-conformist.',
  'initials',
  '{"linkedin": "https://www.linkedin.com/in/kennethleftwich/", "twitter": "https://x.com/KennethLeftwich"}'::jsonb,
  true,
  true,
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  company = EXCLUDED.company,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  tagline = EXCLUDED.tagline,
  socials = EXCLUDED.socials,
  updated_at = now();

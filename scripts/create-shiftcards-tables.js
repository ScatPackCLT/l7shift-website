/**
 * Create ShiftCards tables in Supabase
 * Run: node scripts/create-shiftcards-tables.js
 */

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createTables() {
  const sql = `
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

    -- Policy: Allow public analytics inserts (for tracking views)
    DROP POLICY IF EXISTS "Public can insert analytics" ON shiftcard_analytics;
    CREATE POLICY "Public can insert analytics" ON shiftcard_analytics
      FOR INSERT WITH CHECK (true);
  `;

  console.log('Creating ShiftCards tables...');

  const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    // RPC function might not exist, try direct SQL via management API
    console.log('RPC not available, trying Supabase Management API...');

    // For now, output the SQL to run manually
    console.log('\n--- Run this SQL in Supabase Dashboard SQL Editor ---\n');
    console.log(sql);
    console.log('\n--- End SQL ---\n');
    return;
  }

  console.log('Tables created successfully!');
}

async function insertKenCard() {
  console.log('\nInserting Ken\'s card...');

  const card = {
    slug: 'ken',
    tier: 'custom',
    theme: 'black',
    name: 'Ken Leftwich',
    title: 'Founder and Chief SymbAIote',
    company: 'L7 Shift',
    email: 'ken@l7shift.com',
    phone: '(704) 839-9448',
    website: 'https://l7shift.com',
    tagline: 'Digital transformation for the non-conformist.',
    avatar_type: 'initials',
    socials: {
      linkedin: 'https://www.linkedin.com/in/kennethleftwich/',
      twitter: 'https://x.com/KennethLeftwich'
    },
    show_branding: true,
    animations_enabled: true,
    published: true
  };

  const response = await fetch(SUPABASE_URL + '/rest/v1/shiftcards', {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(card)
  });

  if (!response.ok) {
    const error = await response.text();
    console.log('Insert response:', response.status, error);
    if (response.status === 409 || error.includes('duplicate')) {
      console.log('Card already exists, updating...');

      const updateResponse = await fetch(SUPABASE_URL + '/rest/v1/shiftcards?slug=eq.ken', {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': 'Bearer ' + SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(card)
      });

      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log('Card updated:', result);
      }
    }
    return;
  }

  const result = await response.json();
  console.log('Card inserted:', result);
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  await createTables();
  await insertKenCard();
}

main().catch(console.error);

import pg from 'pg';
const { Client } = pg;

// Supabase PostgreSQL connection (uses service role)
const connectionString = 'postgresql://postgres.xvdoorpshysqzphjkgbn:' + process.env.SUPABASE_DB_PASSWORD + '@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const sql = `
-- Create intake_tokens table for tracking intake form access
CREATE TABLE IF NOT EXISTS intake_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS intake_tokens_token_idx ON intake_tokens(token);

-- Create index on lead_id for finding tokens by lead
CREATE INDEX IF NOT EXISTS intake_tokens_lead_id_idx ON intake_tokens(lead_id);

-- Create intake_submissions table for storing full questionnaire responses
CREATE TABLE IF NOT EXISTS intake_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  token TEXT REFERENCES intake_tokens(token) ON DELETE SET NULL,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on lead_id for finding submissions by lead
CREATE INDEX IF NOT EXISTS intake_submissions_lead_id_idx ON intake_submissions(lead_id);

-- Create index on submitted_at for sorting
CREATE INDEX IF NOT EXISTS intake_submissions_submitted_at_idx ON intake_submissions(submitted_at DESC);

-- Enable RLS on both tables
ALTER TABLE intake_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Service role can do anything on intake_tokens" ON intake_tokens;
DROP POLICY IF EXISTS "Anon can read valid intake_tokens" ON intake_tokens;
DROP POLICY IF EXISTS "Service role can do anything on intake_submissions" ON intake_submissions;
DROP POLICY IF EXISTS "Anon can insert intake_submissions" ON intake_submissions;

-- Create policies for intake_tokens
CREATE POLICY "Service role can do anything on intake_tokens" ON intake_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon to read valid (unexpired, unused) tokens
CREATE POLICY "Anon can read valid intake_tokens" ON intake_tokens
  FOR SELECT
  TO anon
  USING (used = false AND expires_at > NOW());

-- Create policies for intake_submissions
CREATE POLICY "Service role can do anything on intake_submissions" ON intake_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon to insert intake submissions
CREATE POLICY "Anon can insert intake_submissions" ON intake_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add answers column to leads table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'answers'
  ) THEN
    ALTER TABLE leads ADD COLUMN answers JSONB;
  END IF;
END $$;

-- Add intake_completed column to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'intake_completed'
  ) THEN
    ALTER TABLE leads ADD COLUMN intake_completed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add intake_completed_at column to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'intake_completed_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN intake_completed_at TIMESTAMPTZ;
  END IF;
END $$;
`;

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error('Error: SUPABASE_DB_PASSWORD environment variable is required');
    console.log('You can find this in your Supabase dashboard under Settings > Database > Connection string');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();

    console.log('Creating intake tables...');
    await client.query(sql);

    console.log('Verifying tables...');
    const tokensResult = await client.query('SELECT COUNT(*) FROM intake_tokens');
    const submissionsResult = await client.query('SELECT COUNT(*) FROM intake_submissions');
    console.log(`Success! intake_tokens has ${tokensResult.rows[0].count} rows`);
    console.log(`Success! intake_submissions has ${submissionsResult.rows[0].count} rows`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

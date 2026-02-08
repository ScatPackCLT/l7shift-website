-- ShiftBoard Agent API Database Migration
-- Run this in Supabase SQL Editor to add agent support
--
-- This migration adds:
-- 1. `agents` table - Track Claude Code instances
-- 2. `time_entries` table - Detailed time logging
-- 3. New columns on `tasks` table for AI work tracking

-- ============================================
-- 1. Create agents table
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('active', 'idle', 'offline')),
  capabilities TEXT[],
  current_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  session_id TEXT,
  last_heartbeat TIMESTAMPTZ,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  total_hours_logged NUMERIC(10, 2) NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding active agents
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_current_task ON agents(current_task_id);

-- ============================================
-- 2. Create time_entries table
-- ============================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  user_id TEXT, -- For human entries
  entry_type TEXT NOT NULL DEFAULT 'work' CHECK (entry_type IN ('work', 'review', 'blocked')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  files_modified TEXT[],
  commit_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for time entry queries
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_agent ON time_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started ON time_entries(started_at);

-- ============================================
-- 3. Add columns to tasks table
-- ============================================

-- work_type: Indicates if task is suitable for AI agents
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS work_type TEXT CHECK (work_type IN ('human_only', 'ai_suitable', 'hybrid'));

-- agent_id: Which agent claimed this task
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

-- agent_claimed_at: When the agent claimed the task
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS agent_claimed_at TIMESTAMPTZ;

-- agent_notes: Notes from the agent about work done
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS agent_notes TEXT;

-- files_modified: List of files touched during work
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS files_modified TEXT[];

-- requirements: Structured requirements for the task
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS requirements JSONB;

-- acceptance_criteria: List of criteria for completion
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT[];

-- Create index for finding available AI tasks
CREATE INDEX IF NOT EXISTS idx_tasks_work_type ON tasks(work_type);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);

-- ============================================
-- 4. Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to agents table
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Views for agent dashboard
-- ============================================

-- View: Active agent sessions
CREATE OR REPLACE VIEW active_agents AS
SELECT
  a.id,
  a.name,
  a.status,
  a.current_task_id,
  t.title as current_task_title,
  t.project_id,
  p.name as project_name,
  a.total_tasks_completed,
  a.total_hours_logged,
  a.last_heartbeat,
  CASE
    WHEN a.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN a.last_heartbeat > NOW() - INTERVAL '30 minutes' THEN 'stale'
    ELSE 'offline'
  END as connection_status
FROM agents a
LEFT JOIN tasks t ON a.current_task_id = t.id
LEFT JOIN projects p ON t.project_id = p.id
WHERE a.status != 'offline';

-- View: Available tasks for agents
CREATE OR REPLACE VIEW available_agent_tasks AS
SELECT
  t.id,
  t.project_id,
  p.name as project_name,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.work_type,
  t.shift_hours,
  t.requirements,
  t.acceptance_criteria,
  t.created_at
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.agent_id IS NULL
  AND t.status NOT IN ('shipped', 'icebox')
  AND (t.work_type = 'ai_suitable' OR t.status = 'backlog')
ORDER BY
  CASE t.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  t.created_at;

-- View: Agent productivity metrics
CREATE OR REPLACE VIEW agent_metrics AS
SELECT
  a.id as agent_id,
  a.name as agent_name,
  a.total_tasks_completed,
  a.total_hours_logged,
  CASE
    WHEN a.total_tasks_completed > 0
    THEN ROUND(a.total_hours_logged / a.total_tasks_completed, 2)
    ELSE 0
  END as avg_hours_per_task,
  COUNT(DISTINCT te.id) as total_time_entries,
  COALESCE(SUM(te.duration_minutes), 0) as total_logged_minutes,
  a.created_at as agent_since
FROM agents a
LEFT JOIN time_entries te ON a.id = te.agent_id
GROUP BY a.id, a.name, a.total_tasks_completed, a.total_hours_logged, a.created_at;

-- ============================================
-- 6. RLS Policies (if using Row Level Security)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role full access to agents" ON agents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to time_entries" ON time_entries
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Authenticated users can read agents
CREATE POLICY "Authenticated can read agents" ON agents
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can read time entries
CREATE POLICY "Authenticated can read time_entries" ON time_entries
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- Done!
-- ============================================
COMMENT ON TABLE agents IS 'Claude Code agent instances for SymbAIotic workflow';
COMMENT ON TABLE time_entries IS 'Detailed time tracking for task work';
COMMENT ON COLUMN tasks.work_type IS 'Whether task is suitable for AI: human_only, ai_suitable, hybrid';
COMMENT ON COLUMN tasks.agent_id IS 'ID of agent that claimed this task';
